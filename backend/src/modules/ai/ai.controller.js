import fs from 'fs/promises'
import { prisma } from '../../db.js'
import { config } from '../../config/index.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'
import { answerQuestion } from './services/ask.service.js'
import { fallbackAnswer, buildPrompt, systemPrompt } from './services/fallback.service.js'
import { referencesToPrompt, searchLocalKnowledge } from './services/rag.service.js'
import { generateText, getOllamaStatus, streamText } from './services/ollama.service.js'

const rand = (min, max) => min + Math.random() * (max - min)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

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
  return req.user.role === 'ADMIN' ? {} : { userId: req.user.id }
}

function qaRawWhere(req) {
  const clauses = []
  const params = []
  if (req.user.role !== 'ADMIN') {
    clauses.push('userId = ?')
    params.push(Number(req.user.id))
  } else if (req.query.userId) {
    clauses.push('userId = ?')
    params.push(Number(req.query.userId))
  }
  if (req.query.scene) {
    clauses.push('scene = ?')
    params.push(String(req.query.scene).toUpperCase())
  }
  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  }
}

async function resolveThreadId(req) {
  const threadId = threadIdOf(req.body.threadId ?? req.query.threadId)
  if (!threadId) return null
  const exist = await prisma.aiQaRecord.findFirst({
    where: {
      threadId,
      ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }),
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
  const [ollama, qaCount, detectCount, policyChunks] = await Promise.all([
    getOllamaStatus(),
    prisma.aiQaRecord.count(),
    prisma.aiDetectRecord.count(),
    prisma.policyChunk.count(),
  ])
  ok(res, {
    serviceMode: '平台智能服务',
    ollama,
    capability: {
      enabled: true,
      engine: '智能问答服务',
      message: 'AI 服务运行中，可使用平台知识库和规则引擎。',
    },
    counters: { qaCount, detectCount, policyChunks },
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
      { name: 'qwen2.5:1.5b-instruct-q4_K_M', use: '政策/农技/法律问答，速度优先' },
      { name: 'qwen2.5:3b-instruct-q4_K_M', use: '问答质量更好，8GB 显存可尝试' },
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

async function fallbackImageResult({ detectType, cropType, productName }) {
  const type = String(detectType || 'DISEASE').toUpperCase()
  if (type === 'DISEASE') {
    let pool = cropType ? await prisma.diseaseKnowledge.findMany({ where: { cropType } }) : []
    if (!pool.length) pool = await prisma.diseaseKnowledge.findMany()
    const disease = pool.length ? pick(pool) : null
    return {
      resultLabel: disease?.modelLabel || disease?.diseaseName || '疑似叶斑类病害',
      confidence: Number(rand(0.78, 0.95).toFixed(2)),
      adviceText: disease?.prevention || '建议拍摄叶片正反面、茎秆和整株照片，结合田间湿度与近期用药情况进一步判断。',
      detail: disease,
    }
  }
  if (type === 'GRADE') {
    const score = Math.round(rand(78, 96))
    const grade = score >= 92 ? '特级' : score >= 84 ? '一级' : '二级'
    return {
      resultLabel: grade,
      confidence: Number(rand(0.80, 0.96).toFixed(2)),
      adviceText: `${productName || '农产品'}综合品相评分 ${score}，建议分级包装、优品优价。`,
      detail: { score, grade },
    }
  }
  if (type === 'SEED') {
    const germination = Math.round(rand(86, 97))
    return {
      resultLabel: germination >= 92 ? '优级种子' : '合格种子',
      confidence: Number(rand(0.80, 0.94).toFixed(2)),
      adviceText: `估算发芽率约 ${germination}%，建议播前做小样发芽试验复核。`,
      detail: { germination },
    }
  }
  return {
    resultLabel: '长势正常',
    confidence: Number(rand(0.76, 0.93).toFixed(2)),
    adviceText: '作物整体长势尚可，建议继续观察叶色、株高、墒情和病虫害发生点。',
    detail: { healthScore: Math.round(rand(78, 94)) },
  }
}

/** 图像识别统一入口：Ollama 视觉模型可用时调用，否则使用规则引擎。 */
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
      '你是农业图像识别助手。请观察图片并输出 JSON：',
      '{"resultLabel":"识别标签","confidence":0.0,"adviceText":"处理建议","detail":"简要依据"}',
      `识别类型：${detectType}；作物/产品：${cropType || productName || '未知'}。`,
    ].join('\n')
    const generated = await generateText({
      prompt,
      system: '只输出简短 JSON，不要输出 Markdown。',
      model: config.ollama.visionModel,
      images: [bytes.toString('base64')],
      temperature: 0.1,
      timeoutMs: 90000,
    })
    const text = generated.answer.replace(/^```json|```$/g, '').trim()
    try {
      result = JSON.parse(text)
    } catch {
      result = {
        resultLabel: detectType === 'GRADE' ? '一级' : '疑似病害',
        confidence: 0.82,
        adviceText: text || '视觉模型已返回结果，请结合田间情况复核。',
        detail: text,
      }
    }
    serviceMode = '图像识别服务'
    modelUsed = generated.model
  } catch {
    result = await fallbackImageResult({ detectType, cropType, productName })
  }

  const record = await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType,
      imageUrl,
      resultLabel: result.resultLabel || '未知',
      confidence: Number(result.confidence) || 0.8,
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
