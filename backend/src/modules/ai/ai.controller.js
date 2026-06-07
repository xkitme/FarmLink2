import fs from 'fs/promises'
import { prisma } from '../../db.js'
import { config } from '../../config/index.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'
import { answerQuestion } from './services/ask.service.js'
import { fallbackAnswer, buildPrompt, systemPrompt } from './services/fallback.service.js'
import { referencesToPrompt, searchLocalKnowledge } from './services/rag.service.js'
import { generateText, getOllamaStatus, streamText } from './services/ollama.service.js'

function threadIdOf(value) {
  if (value === undefined || value === null || value === '') return null
  const threadId = Number(value)
  if (!Number.isInteger(threadId) || threadId <= 0) throw errors.param('threadId 不合法')
  return threadId
}

function numberOf(value) {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  return Number(value || 0)
}

function dateOf(value) {
  if (value instanceof Date) return value
  if (typeof value === 'bigint' || typeof value === 'number') return new Date(Number(value))
  if (typeof value === 'string' && /^\d+$/.test(value)) return new Date(Number(value))
  return value || null
}

function qaBaseWhere(req) {
  // App 端接口只看当前用户自己的数据（含 ADMIN），全平台记录由管理台 /admin/resource/aiQaRecord/list 提供
  return { userId: req.user.id }
}

function qaRawWhere(req) {
  // App 端接口只看当前用户自己的数据（含 ADMIN），全平台记录由管理台 /admin/resource/aiQaRecord/list 提供
  const clauses = ['userId = ?']
  const params = [Number(req.user.id)]
  if (req.query.scene) {
    clauses.push('scene = ?')
    params.push(String(req.query.scene).toUpperCase())
  }
  return {
    whereSql: `WHERE ${clauses.join(' AND ')}`,
    params,
  }
}

async function resolveThreadId(req) {
  const threadId = threadIdOf(req.body.threadId ?? req.query.threadId)
  if (!threadId) return null
  // App 端续写只能续自己创建的会话
  const exist = await prisma.aiQaRecord.findFirst({
    where: {
      threadId,
      userId: req.user.id,
    },
    select: { id: true },
  })
  if (!exist) throw errors.notFound('对话不存在')
  return threadId
}

async function createThreadRecord(data) {
  let record = await prisma.aiQaRecord.create({ data })
  if (!data.threadId) {
    record = await prisma.aiQaRecord.update({
      where: { id: record.id },
      data: { threadId: record.id },
    })
  }
  return record
}

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
}

function sse(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

async function streamFallback(res, text) {
  // 规则兜底答案也逐块吐出 + 小间隔，模拟逐字打字的流式观感，
  // 避免「等半天突然冒出一整段、像系统卡死」（issue #17-3）。
  const chunks = text.match(/.{1,8}/gs) || [text]
  for (const delta of chunks) {
    sse(res, 'message', { delta })
    await new Promise((resolve) => setTimeout(resolve, 28))
  }
}

async function askScene(req, res, scene) {
  const question = String(req.body.question || req.body.prompt || '').trim()
  if (!question) throw errors.param('请输入问题')
  const threadId = await resolveThreadId(req)

  const useStream = req.body.stream === true || req.query.stream === '1'
  if (!useStream) {
    const result = await answerQuestion({ userId: req.user.id, scene, question, threadId })
    return ok(res, result, 'AI 回答完成')
  }

  const normalized = String(scene || 'GENERAL').toUpperCase()
  const references = await searchLocalKnowledge(normalized, question, 5)
  const prompt = buildPrompt({ scene: normalized, question, references })
  sseHeaders(res)
  sse(res, 'meta', { scene: normalized, references, serviceStatus: '运行中' })

  let answer = ''
  let modelUsed = config.ollama.primaryModel
  let serviceMode = '智能问答'
  try {
    const result = await streamText({
      prompt,
      system: systemPrompt(normalized),
      model: config.ollama.primaryModel,
      onDelta: async (delta) => {
        answer += delta
        sse(res, 'message', { delta })
      },
    })
    answer = result.answer || answer
    modelUsed = result.model
  } catch {
    serviceMode = '智能问答'
    modelUsed = 'knowledge-rule'
    answer = fallbackAnswer({ scene: normalized, question, references })
    await streamFallback(res, answer)
  }

  const record = await createThreadRecord({
    userId: req.user.id,
    threadId,
    scene: normalized,
    question,
    answer,
    modelUsed,
    isOffline: true,
    referencesJson: JSON.stringify(references),
  })
  sse(res, 'done', { recordId: record.id, threadId: record.threadId, serviceMode, modelUsed })
  res.end()
}

/** AI 服务状态 */
export async function status(req, res) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [ollama, qaCount, detectCount, policyChunks, detect24h, detectFeedback24h] = await Promise.all([
    getOllamaStatus(),
    prisma.aiQaRecord.count(),
    prisma.aiDetectRecord.count(),
    prisma.policyChunk.count(),
    prisma.aiDetectRecord.findMany({
      where: { createdAt: { gte: since24h } },
      select: { resultLabel: true, confidence: true, feedback: true },
    }),
    prisma.aiDetectRecord.count({
      where: { feedback: { not: null } },
    }),
  ])
  // 24h 识图统计：识别成功率（resultLabel 不是「无法识别」且 confidence>0）
  // + 反馈率（24h 内有反馈条数 / 24h 总识图条数）
  const recognized24h = detect24h.filter(
    (r) => r.resultLabel !== '无法识别' && r.confidence > 0,
  ).length
  const correct24h = detect24h.filter((r) => r.feedback === 1).length
  const incorrect24h = detect24h.filter((r) => r.feedback === 0).length
  ok(res, {
    serviceMode: '平台智能服务',
    ollama,
    capability: {
      enabled: true,
      engine: '智能问答服务',
      message: 'AI 服务运行中，可使用平台知识库和规则引擎。',
    },
    counters: {
      qaCount,
      detectCount,
      policyChunks,
      detectFeedbackTotal: detectFeedback24h,
    },
    detect24h: {
      total: detect24h.length,
      recognized: recognized24h,
      recognizeRate: detect24h.length ? Number((recognized24h / detect24h.length).toFixed(3)) : 0,
      feedbackCorrect: correct24h,
      feedbackIncorrect: incorrect24h,
    },
  })
}

/** 模型版本与建议 */
export async function modelVersion(req, res) {
  const ollama = await getOllamaStatus()
  ok(res, {
    current: {
      primaryModel: config.ollama.primaryModel,
      visionModel: config.ollama.visionModel,
      embedModel: config.ollama.embedModel,
    },
    recommendedForRtx5060Laptop: [
      { name: 'qwen2.5:7b-instruct-q4_K_M', use: '政策/农技/法律问答，默认推荐（约4.7GB，8GB可跑，答得更准）' },
      { name: 'qwen2.5:3b-instruct-q4_K_M', use: '显存紧张时的折中选择' },
      { name: 'qwen2.5:1.5b-instruct-q4_K_M', use: '极限速度优先，质量较弱不推荐' },
      { name: 'minicpm-v:8b-2.6-q4_K_M', use: '图像理解，显存紧张时使用规则引擎' },
      { name: 'bge-m3', use: '向量检索，可后续用于更精细 RAG' },
    ],
    installed: ollama.models,
    serviceVersion: 'knowledge-rule-v1',
  })
}

export async function chat(req, res) {
  const scene = req.body.scene || req.query.scene || 'GENERAL'
  return askScene(req, res, scene)
}

export async function policyAsk(req, res) {
  return askScene(req, res, 'POLICY')
}

export async function agriAsk(req, res) {
  return askScene(req, res, 'AGRI')
}

export async function legalAsk(req, res) {
  return askScene(req, res, 'LEGAL')
}

/** 知识库检索调试 */
export async function kbSearch(req, res) {
  const keyword = String(req.query.keyword || req.query.q || '').trim()
  if (!keyword) throw errors.param('请输入检索关键词')
  const scene = req.query.scene || 'GENERAL'
  const references = await searchLocalKnowledge(scene, keyword, Number(req.query.limit) || 8)
  ok(res, {
    keyword,
    scene: String(scene).toUpperCase(),
    references,
    promptPreview: referencesToPrompt(references),
  })
}

/** AI 问答记录 */
export async function qaRecords(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const { whereSql, params } = qaRawWhere(req)
  const summaries = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(threadId, id) AS threadId,
      MIN(id) AS firstRecordId,
      MIN(createdAt) AS firstCreatedAt,
      MAX(createdAt) AS lastMessageAt,
      COUNT(*) AS messageCount
    FROM t_ai_qa_record
    ${whereSql}
    GROUP BY COALESCE(threadId, id)
    ORDER BY MAX(createdAt) DESC
    LIMIT ? OFFSET ?
  `, ...params, take, skip)
  const totalRows = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT COALESCE(threadId, id)) AS total
    FROM t_ai_qa_record
    ${whereSql}
  `, ...params)
  const firstRecordIds = summaries.map((row) => numberOf(row.firstRecordId)).filter(Boolean)
  const heads = firstRecordIds.length
    ? await prisma.aiQaRecord.findMany({
      where: { id: { in: firstRecordIds } },
      select: {
        id: true,
        userId: true,
        threadId: true,
        scene: true,
        question: true,
        answer: true,
        modelUsed: true,
        isOffline: true,
        referencesJson: true,
        createdAt: true,
      },
    })
    : []
  const headMap = new Map(heads.map((row) => [row.id, row]))
  const records = summaries.map((summary) => {
    const firstRecordId = numberOf(summary.firstRecordId)
    const head = headMap.get(firstRecordId)
    return {
      ...(head || {}),
      id: firstRecordId,
      threadId: numberOf(summary.threadId) || firstRecordId,
      messageCount: numberOf(summary.messageCount) || 1,
      lastMessageAt: dateOf(summary.lastMessageAt),
      createdAt: head?.createdAt || dateOf(summary.firstCreatedAt),
      scene: head?.scene || 'GENERAL',
      question: head?.question || '',
      answer: head?.answer || '',
      referencesJson: head?.referencesJson || null,
    }
  })
  okPage(res, { records, total: numberOf(totalRows[0]?.total), pageNum, pageSize })
}

/** 单个 AI 会话的全部问答记录 */
export async function qaThreadRecords(req, res) {
  const threadId = threadIdOf(req.params.threadId)
  if (!threadId) throw errors.param('threadId 不合法')
  const baseWhere = qaBaseWhere(req)
  const records = await prisma.aiQaRecord.findMany({
    where: {
      ...baseWhere,
      OR: [
        { threadId },
        { id: threadId, threadId: null },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })
  if (!records.length) throw errors.notFound('对话不存在')
  ok(res, { records })
}

/** 清空当前用户自己的 AI 问答记录（不提供全平台删除，破坏性运维操作不走 App 接口）。
 *  G4：清空与正在生成的 SSE 落库存在竞态——deleteMany 后短暂等待再扫一次，
 *      兜住流式回答刚好在清空后落库的漏网记录。 */
export async function qaClearAll(req, res) {
  const where = { userId: req.user.id }
  const first = await prisma.aiQaRecord.deleteMany({ where })
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const second = await prisma.aiQaRecord.deleteMany({ where })
  ok(res, { deleted: first.count + second.count }, '已清空 AI 对话历史')
}

/** 删除单条 AI 问答记录 */
export async function qaRemoveOne(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw errors.param('记录 ID 不合法')

  const result = await prisma.aiQaRecord.deleteMany({
    where: { ...qaBaseWhere(req), id },
  })
  if (result.count === 0) throw errors.notFound('记录不存在')
  ok(res, { id, deleted: result.count }, '已删除单条')
}

/** 删除整段 AI 对话 */
export async function qaRemoveThread(req, res) {
  const threadId = threadIdOf(req.params.threadId ?? req.params.id)
  if (!threadId) throw errors.param('threadId 不合法')

  const result = await prisma.aiQaRecord.deleteMany({
    where: {
      ...qaBaseWhere(req),
      OR: [
        { threadId },
        { id: threadId, threadId: null },
      ],
    },
  })
  if (result.count === 0) throw errors.notFound('对话不存在')
  ok(res, { threadId, deleted: result.count }, `已删除整段对话（${result.count} 条）`)
}

/** 旧删除入口：保留为整段删除 alias，一段时间后移除。 */
export async function qaRemove(req, res) {
  console.warn(`[DEPRECATED] DELETE /ai/qa/records/:id 将保留为整段对话删除 alias，请改用 DELETE /ai/qa/threads/:threadId（user=${req.user.id}）`)
  return qaRemoveThread(req, res)
}

/** 持久化图像识别摘要到当前 AI 会话 */
export async function qaDetectRecord(req, res) {
  const question = String(req.body.question || '请识别这张图片').trim()
  const answer = String(req.body.answer || req.body.summary || '').trim()
  if (!answer) throw errors.param('识别摘要必填')
  const threadId = await resolveThreadId(req)
  const referencesJson = JSON.stringify({
    detect: req.body.detect || null,
    imageUrl: req.body.imageUrl || null,
  })
  const record = await createThreadRecord({
    userId: req.user.id,
    threadId,
    scene: 'DETECT',
    question,
    answer,
    modelUsed: req.body.modelUsed || 'platform-vision',
    isOffline: true,
    referencesJson,
  })
  ok(res, { recordId: record.id, threadId: record.threadId, record }, '识别记录已保存')
}

/** 语音识别：支持上传音频，也支持直接传 text。 */
export async function voiceRecognize(req, res) {
  const text = String(req.body.text || req.body.transcript || '').trim()
  const transcript = text || '请帮我查询水稻病虫害防治办法'
  const intent = transcript.includes('政策') || transcript.includes('补贴')
    ? 'POLICY_QA'
    : transcript.includes('病') || transcript.includes('虫') || transcript.includes('施肥')
      ? 'AGRI_QA'
      : transcript.includes('求助') || transcript.includes('灾')
        ? 'DISASTER_HELP'
        : 'GENERAL_CHAT'

  await prisma.aiQaRecord.create({
    data: {
      userId: req.user.id,
      scene: 'VOICE',
      question: req.file ? `音频识别：${req.file.originalname}` : '文本语音识别',
      answer: transcript,
      modelUsed: 'voice-adapter',
      isOffline: true,
      referencesJson: JSON.stringify({ intent }),
    },
  })

  ok(res, {
    transcript,
    intent,
    confidence: text ? 0.99 : 0.86,
    audioUrl: req.file ? `/uploads/${req.file.filename}` : null,
    serviceMode: '语音识别服务',
    note: '当前后端提供语音识别适配接口；接入语音识别引擎后可替换 transcript 来源。',
  }, '语音识别完成')
}

// 视觉模型不可用 / 返回不可信结果时的「诚实兜底」：
// 历史上这里会从知识库随机抽一条返回（香蕉图被识成「番茄缺镁症 81% VERIFIED」就是这条路径），
// 视觉效果像「AI 真识别了」实则全是编的，比说不出口更误导用户。
// 现在改为统一回「无法识别 / 服务暂不可用」+ confidence 0，前端据此降级展示。
function unavailableImageResult({ detectType, reason }) {
  const type = String(detectType || 'DISEASE').toUpperCase()
  const adviceMap = {
    DISEASE: '智能视觉识别暂时不可用，未能识别图片中的作物或病害。建议拍摄叶片正反面、茎秆和整株清晰照片后重试，或联系周边植保服务现场诊断。',
    GRADE: '智能品相识别暂时不可用，请稍后再试，或人工分级。',
    SEED: '智能种子识别暂时不可用，请稍后再试，或做小样发芽试验复核。',
    GROWTH: '智能长势识别暂时不可用，请稍后再试，或现场观察叶色、株高与墒情。',
  }
  return {
    resultLabel: '无法识别',
    confidence: 0,
    recognized: false,
    adviceText: adviceMap[type] || adviceMap.DISEASE,
    detail: reason ? { reason } : null,
  }
}

// 病害知识库辅助：把视觉模型可能输出的英文标签（modelLabel）映射回中文病害名。
async function resolveDiseaseLabel(rawLabel) {
  const label = String(rawLabel || '').trim()
  if (!label || label === '无法识别') return null
  const exact = await prisma.diseaseKnowledge.findFirst({
    where: { OR: [{ modelLabel: label }, { diseaseName: label }] },
  })
  return exact || null
}

/** 用户对识图结果的反馈。recordId 是 aiDetectRecord.id。
 *  约定 feedback 取值：'correct'=1（准）、'incorrect'=0（不准）、'unsure'=2（不确定）。
 *  schema 中 feedback 字段是 Int? (历史预留，无需 migration)。 */
export async function detectFeedback(req, res) {
  const recordId = Number(req.body.recordId)
  if (!Number.isInteger(recordId) || recordId <= 0) throw errors.param('recordId 不合法')
  const raw = String(req.body.feedback || '').toLowerCase()
  const map = { correct: 1, incorrect: 0, unsure: 2 }
  if (!(raw in map)) throw errors.param('feedback 必须是 correct/incorrect/unsure')
  const value = map[raw]

  const exist = await prisma.aiDetectRecord.findUnique({ where: { id: recordId } })
  if (!exist) throw errors.notFound('识图记录不存在')
  // 反馈对象就是自己的识图记录；admin 可看全平台但不能改他人反馈。
  if (exist.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw errors.forbidden('无权对他人的识图记录反馈')
  }

  const updated = await prisma.aiDetectRecord.update({
    where: { id: recordId },
    data: { feedback: value },
  })
  ok(res, {
    recordId: updated.id,
    feedback: raw,
    feedbackValue: value,
  }, '感谢反馈')
}

/** 图像识别统一入口：Ollama 视觉模型可用时调用，否则诚实回「无法识别」。 */
export async function imageAnalyze(req, res) {
  if (!req.file) throw errors.param('请上传图片')
  const detectType = String(req.body.detectType || req.body.type || 'DISEASE').toUpperCase()
  const imageUrl = `/uploads/${req.file.filename}`
  const cropType = req.body.cropType || null
  const productName = req.body.productName || null
  let result
  let serviceMode = '图像识别服务'
  let modelUsed = 'platform-vision'

  try {
    const bytes = await fs.readFile(req.file.path)
    const prompt = [
      '你是中文农业图像视觉识别助手。请仔细观察图片，按下面给出的 JSON schema 输出。',
      '',
      'JSON schema:',
      '{"resultLabel": <中文病害名或"无法识别">, "confidence": <0.0~1.0 的小数>, "adviceText": <中文处理建议>, "detail": <简要中文依据>}',
      '',
      '关键约束（请严格遵守）：',
      '1) resultLabel 只能用中文（如「番茄缺镁症」「苹果黑星病」「水稻稻瘟病」），禁止输出英文标签、拼音或下划线 ID。',
      '2) 如果图片是水果摆拍、风景、人物、动物、其他非农业病害场景，或叶片正常无病害，必须返回 resultLabel="无法识别"，confidence=0。',
      '3) confidence 必须诚实反映把握程度。模糊/把握不大时给 ≤0.3；非常确定才给 >0.8。',
      '4) adviceText 限 60 字内中文，给出可执行的建议。',
      '',
      '示例 1（输入：番茄叶片黄化无脉间绿色）→ 输出：',
      '{"resultLabel":"番茄缺镁症","confidence":0.78,"adviceText":"补充含镁肥料，配合土壤酸碱度检测，避免偏施钾肥。","detail":"下部老叶脉间黄化、叶脉保持绿色，符合缺镁特征"}',
      '',
      '示例 2（输入：黄色背景的一串香蕉摆拍）→ 输出：',
      '{"resultLabel":"无法识别","confidence":0,"adviceText":"图片为水果摆拍，未发现农作物病害；请拍摄叶片正反面或茎秆果实病斑特写。","detail":"非田间病害场景"}',
      '',
      '示例 3（输入：风景照）→ 输出：',
      '{"resultLabel":"无法识别","confidence":0,"adviceText":"图片中未识别到农作物，建议重新拍摄病害部位特写。","detail":"非农业图像"}',
      '',
      `本次识别类型：${detectType}；作物/产品提示：${cropType || productName || '未指定'}。`,
    ].join('\n')
    const generated = await generateText({
      prompt,
      system: '只输出严格 JSON，不要 Markdown / 前后缀 / 编号列表 / 英文叙述。',
      model: config.ollama.visionModel,
      images: [bytes.toString('base64')],
      temperature: 0.1,
      format: 'json',
      // 视觉模型推理慢；warmup 后正常推理 5–20s，留 60s 给 8GB 显存的余量。
      // 启动时已预热（server.js warmupVisionModel），首请求不再承担冷启动 30–60s。
      timeoutMs: 60000,
    })
    const text = generated.answer.replace(/^```json|```$/g, '').trim()
    let parsed = null
    try { parsed = JSON.parse(text) } catch { parsed = null }
    if (!parsed || typeof parsed !== 'object' || !parsed.resultLabel) {
      // 视觉模型没出结构化结果——按「无法识别」处理，不再硬编一条诱导性答案。
      result = unavailableImageResult({ detectType, reason: 'vision-no-json' })
    } else {
      let rawLabel = String(parsed.resultLabel).trim()
      let confidence = Number(parsed.confidence)
      if (!Number.isFinite(confidence) || confidence < 0) confidence = 0
      if (confidence > 1) confidence = confidence / 100
      let adviceText = String(parsed.adviceText || parsed.advice || '').trim()

      // 病害场景：尝试把视觉模型可能输出的英文 modelLabel 映射回中文 diseaseName。
      if (detectType === 'DISEASE' && rawLabel && rawLabel !== '无法识别') {
        const matched = await resolveDiseaseLabel(rawLabel)
        if (matched) {
          rawLabel = matched.diseaseName
          if (!adviceText) adviceText = matched.prevention || ''
        } else if (/^[a-zA-Z0-9_\-\s]+$/.test(rawLabel)) {
          // 知识库找不到、又是纯英文/下划线——视觉模型在硬编 ID，按「无法识别」处理。
          const f = unavailableImageResult({ detectType, reason: 'unknown-english-label' })
          rawLabel = f.resultLabel
          confidence = 0
          if (!adviceText) adviceText = f.adviceText
        }
      }

      // 置信度过低同样降级为「无法识别」，避免低把握结果披着 VERIFIED 外衣误导用户。
      if (rawLabel !== '无法识别' && confidence > 0 && confidence < 0.4) {
        const f = unavailableImageResult({ detectType, reason: `low-confidence:${confidence}` })
        rawLabel = f.resultLabel
        confidence = 0
        if (!adviceText) adviceText = f.adviceText
      }

      result = {
        resultLabel: rawLabel,
        confidence,
        recognized: rawLabel !== '无法识别' && confidence > 0,
        adviceText,
        detail: parsed.detail,
      }
    }
    serviceMode = '图像识别服务'
    modelUsed = generated.model
  } catch (e) {
    result = unavailableImageResult({ detectType, reason: e?.message || 'ollama-unreachable' })
    serviceMode = '图像识别服务'
    modelUsed = 'platform-vision'
  }

  const record = await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType,
      imageUrl,
      resultLabel: result.resultLabel || '无法识别',
      confidence: Number(result.confidence) || 0,
      adviceText: result.adviceText || result.advice || null,
      isOffline: true,
    },
  })

  ok(res, {
    recordId: record.id,
    detectType,
    imageUrl,
    serviceMode,
    modelUsed,
    result,
  }, '图像识别完成')
}
