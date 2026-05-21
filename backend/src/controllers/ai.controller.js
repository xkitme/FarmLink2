import * as aiService from '../services/ai.service.js'
import * as cache from '../utils/cache.js'
import { config } from '../config/index.js'
import { fail, ok, unauthorized } from '../utils/response.js'

const LIMITS = config.aiRateLimit

function getLimit(memberType) {
  if (memberType === 2) return LIMITS.yearly
  if (memberType === 1) return LIMITS.monthly
  return LIMITS.free
}

function checkRateLimit(req, res) {
  const { id, memberType = 0 } = req.user
  const count = cache.getAiCount(id)
  const limit = getLimit(memberType)
  if (count >= limit) {
    fail(res, `今日 AI 调用已达上限（${limit}次），升级会员可获更多次数`, 429)
    return false
  }
  cache.incrAiCount(id)
  return true
}

// POST /api/ai/chat — 流式 SSE
export async function chat(req, res) {
  if (!checkRateLimit(req, res)) return

  const { messages, mode = 'guide' } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    for await (const chunk of aiService.streamChat(mode, messages)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
  } finally {
    res.end()
  }
}

// POST /api/ai/character/chat — 历史人物对话（流式）
export async function characterChat(req, res) {
  if (!checkRateLimit(req, res)) return

  const { messages, character } = req.body
  const allowed = ['confucius', 'libai', 'sushi']
  if (!allowed.includes(character)) return fail(res, '不支持的历史人物')

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    for await (const chunk of aiService.streamChat('character', messages, character)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
  } finally {
    res.end()
  }
}

// POST /api/ai/translate
export async function translate(req, res) {
  if (!checkRateLimit(req, res)) return
  const { text } = req.body
  if (!text) return fail(res, '缺少 text 参数')

  try {
    const result = await aiService.chat(
      '你是古汉语翻译专家。收到古文后返回：【全文译文】【逐句解析】【创作背景】',
      text
    )
    ok(res, { result })
  } catch {
    fail(res, 'AI 服务暂时不可用', 503)
  }
}

// POST /api/ai/quiz/generate
export async function generateQuiz(req, res) {
  if (!checkRateLimit(req, res)) return
  const { contentBody, count = 3 } = req.body
  if (!contentBody) return fail(res, '缺少 contentBody 参数')

  try {
    const quiz = await aiService.generateQuiz(contentBody, count)
    ok(res, { quiz })
  } catch {
    fail(res, 'AI 服务暂时不可用', 503)
  }
}

// POST /api/ai/calligraphy/review
export async function reviewCalligraphy(req, res) {
  if (!checkRateLimit(req, res)) return
  if (!req.file) return fail(res, '请上传书法图片')

  try {
    const review = await aiService.reviewCalligraphy(req.file.path)
    ok(res, { review })
  } catch {
    fail(res, 'AI 点评失败，请重试', 503)
  }
}

// GET /api/ai/health
export async function health(req, res) {
  const online = await aiService.checkHealth()
  ok(res, { online, model: config.ollama.primaryModel })
}
