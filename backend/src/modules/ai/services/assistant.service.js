import { config } from '../../../config/index.js'
import { prisma } from '../../../db.js'
import { errors } from '../../../utils/response.js'
import { generateText } from './ollama.service.js'
import { loadAssistantConfig, providerPlan } from './assistant-config.service.js'
import { deepseekGenerate } from './deepseek.service.js'

const ALLOWED_ROUTE_KEYS = new Set([
  'home',
  'ai',
  'market',
  'publish',
  'messages',
  'profile',
  'search',
  'orders',
])

const ALLOWED_COMMANDS = new Set([
  'open_page',
  'show_products',
  'open_product',
  'show_order_confirm',
  'create_order',
  'mock_pay',
  'show_message',
  'end',
])

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function cleanText(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max)
}

function positiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function quantityOf(value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) return null
  return Math.min(n, 99)
}

function parseJsonLoose(raw) {
  const text = cleanText(raw, 12000)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1))
    }
    throw new Error('assistant-json-parse-failed')
  }
}

function sanitizeReceiverInfo(value) {
  const info = asObject(value)
  const name = cleanText(info.name || info.realName || info.receiver, 40)
  const phone = cleanText(info.phone, 30)
  const address = cleanText(info.address || info.shippingAddress, 120)
  if (!name || !phone || !address) return null
  return { name, phone, address }
}

function sanitizeCommand(command, availableProductIds) {
  const raw = asObject(command)
  const type = cleanText(raw.type || raw.name, 40)
  if (!ALLOWED_COMMANDS.has(type)) return null
  const params = asObject(raw.params)
  if (type === 'open_page') {
    const routeKey = cleanText(params.routeKey, 40)
    if (!ALLOWED_ROUTE_KEYS.has(routeKey)) return null
    return { type, params: { routeKey } }
  }
  if (type === 'show_products') {
    const ids = Array.isArray(params.productIds) ? params.productIds : []
    const productIds = ids
      .map(positiveInt)
      .filter((id) => id && availableProductIds.has(id))
      .slice(0, 6)
    if (!productIds.length) return null
    return { type, params: { productIds } }
  }
  if (type === 'open_product') {
    const productId = positiveInt(params.productId)
    if (!productId || !availableProductIds.has(productId)) return null
    return { type, params: { productId } }
  }
  if (type === 'show_order_confirm') {
    const productId = positiveInt(params.productId)
    const quantity = quantityOf(params.quantity)
    if (!productId || !availableProductIds.has(productId) || !quantity) return null
    return { type, params: { productId, quantity } }
  }
  if (type === 'create_order') {
    const productId = positiveInt(params.productId)
    const quantity = quantityOf(params.quantity)
    const receiverInfo = sanitizeReceiverInfo(params.receiverInfo)
    if (!productId || !availableProductIds.has(productId) || !quantity || !receiverInfo) {
      return null
    }
    return { type, params: { productId, quantity, receiverInfo } }
  }
  if (type === 'mock_pay') {
    const orderId = positiveInt(params.orderId)
    if (!orderId) return null
    return { type, params: { orderId } }
  }
  if (type === 'show_message') {
    const markdown = cleanText(params.markdown || raw.markdown, 1200)
    if (!markdown) return null
    return { type, params: { markdown, speak: params.speak !== false } }
  }
  if (type === 'end') {
    return { type, params: {} }
  }
  return null
}

function sanitizeAssistantOutput(parsed, products) {
  const availableProductIds = new Set(products.map((p) => p.id))
  const rawCommands = Array.isArray(parsed.commands) ? parsed.commands : []
  const commands = rawCommands
    .map((cmd) => sanitizeCommand(cmd, availableProductIds))
    .filter(Boolean)
    .slice(0, 5)
  const replyMarkdown = cleanText(
    parsed.replyMarkdown || parsed.reply || parsed.message || '我听到了，请继续说。',
    1600,
  )
  const speakText = cleanText(parsed.speakText || replyMarkdown.replace(/[#*_`>-]/g, ''), 800)
  const statusText = cleanText(parsed.statusText, 80)
  return {
    replyMarkdown,
    speakText,
    statusText,
    commands,
  }
}

async function loadAssistantContext(userId) {
  const [user, products, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        realName: true,
        phone: true,
        villageName: true,
        role: true,
      },
    }),
    prisma.product.findMany({
      where: { status: 1, stock: { gt: 0 } },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        price: true,
        unit: true,
        stock: true,
        soldCount: true,
      },
    }),
    prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, orderNo: true, productId: true, quantity: true, totalAmount: true, status: true },
    }),
  ])
  return { user, products, orders }
}

function buildUserPrompt({ text, route, context, commandResult, user, products, orders }) {
  return JSON.stringify({
    userText: text,
    currentRoute: route || '',
    frontendContext: context || {},
    commandResult: commandResult || null,
    user: user
      ? {
        nickname: user.nickname,
        realName: user.realName,
        phone: user.phone,
        villageName: user.villageName,
        role: user.role,
      }
      : null,
    availableProducts: products,
    recentOrders: orders,
  })
}

async function callDeepSeek({ system, prompt, ds }) {
  const out = await deepseekGenerate({
    apiKey: ds.deepseekApiKey,
    baseUrl: ds.deepseekBaseUrl,
    model: ds.deepseekModel,
    system,
    prompt,
    temperature: ds.temperature,
    json: true,
    thinking: ds.deepseekThinking,
    timeoutMs: 45000,
  })
  return { text: out.text, modelUsed: out.model }
}

async function callOllama({ system, prompt, temperature }) {
  const result = await generateText({
    prompt,
    system,
    model: config.ollama.primaryModel,
    temperature,
    format: 'json',
    timeoutMs: 90000,
  })
  return { text: result.answer, modelUsed: result.model }
}

export async function runAssistantTurn({ userId, text, route, context, commandResult }) {
  const userText = cleanText(text, 500)
  if (!userText && !commandResult) throw errors.param('请输入语音内容')

  const cfg = await loadAssistantConfig()
  if (!cfg.enabled) throw errors.offline('AI 语音助手当前已关闭')

  const { user, products, orders } = await loadAssistantContext(userId)
  const system = cfg.systemPrompt
  const prompt = buildUserPrompt({
    text: userText,
    route,
    context,
    commandResult,
    user,
    products,
    orders,
  })

  // 语音助手提供方决定调用次序：auto=DS→Ollama 兜底；deepseek/ollama=只走其一。
  const { useDeepSeek, useOllama } = providerPlan(cfg.assistantProvider)

  const failures = []
  let finalOutput
  if (useDeepSeek) {
    try {
      const modelOutput = await callDeepSeek({ system, prompt, ds: cfg })
      const parsed = parseJsonLoose(modelOutput.text)
      finalOutput = {
        ...sanitizeAssistantOutput(parsed, products),
        modelUsed: modelOutput.modelUsed,
      }
    } catch (err) {
      failures.push(`deepseek:${err.message}`)
    }
  }
  if (!finalOutput && useOllama) {
    try {
      const modelOutput = await callOllama({ system, prompt, temperature: cfg.temperature })
      const parsed = parseJsonLoose(modelOutput.text)
      finalOutput = {
        ...sanitizeAssistantOutput(parsed, products),
        modelUsed: modelOutput.modelUsed,
      }
    } catch (err) {
      failures.push(`ollama:${err.message}`)
    }
  }
  if (!finalOutput) {
    throw errors.offline('服务暂时不可用，请稍后重试')
  }

  return {
    ...finalOutput,
    serviceMode: 'AI语音助手',
    commandSchemaVersion: 1,
    diagnostics: config.isProd ? undefined : { failures },
  }
}
