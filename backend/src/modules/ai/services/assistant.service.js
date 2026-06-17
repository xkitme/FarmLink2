import { config } from '../../../config/index.js'
import { prisma } from '../../../db.js'
import { errors } from '../../../utils/response.js'
import { generateText } from './ollama.service.js'

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

function timeoutSignal(ms) {
  if (AbortSignal.timeout) return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

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

function assistantSystemPrompt() {
  return [
    '你是 InkFlow 的 AI 语音自动化助手，只能输出严格 JSON。',
    '不要输出 Markdown 代码块，不要输出解释文字。',
    'JSON schema:',
    '{"replyMarkdown":"给用户看的中文回复","speakText":"适合朗读的短句","statusText":"可选的短状态","commands":[{"type":"命令名","params":{}}]}',
    '允许命令:',
    'open_page {routeKey: home|ai|market|publish|messages|profile|search|orders}',
    'show_products {productIds:number[]}',
    'open_product {productId:number}',
    'show_order_confirm {productId:number, quantity:number}',
    'create_order {productId:number, quantity:number, receiverInfo:{name,phone,address}}',
    'mock_pay {orderId:number}',
    'show_message {markdown:string, speak:boolean}',
    'end {}',
    '规则:',
    '1. 命令只能使用给定商品 id；不确定时先回复并 show_message，不要硬下单。',
    '2. 用户要推荐商品时，先 show_products 或 open_page market；用户明确选择某个商品时再 open_product。',
    '3. 没有完整姓名、手机号、收货地址时，不要 create_order；先要求用户到资料页补全或口述地址。',
    '4. 用户说“没有了/结束/不用了/关闭”时，回复一句确认并输出 end。',
    '5. 不暴露技术命令、模型、接口、schema 或兜底细节。',
  ].join('\n')
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

async function callDeepSeek({ system, prompt }) {
  if (!config.deepseek.apiKey) throw new Error('deepseek-api-key-missing')
  const base = config.deepseek.baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: config.deepseek.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal: timeoutSignal(45000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`)
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('deepseek-empty-content')
  return { text: content, modelUsed: config.deepseek.model }
}

async function callOllama({ system, prompt }) {
  const result = await generateText({
    prompt,
    system,
    model: config.ollama.primaryModel,
    temperature: 0.1,
    format: 'json',
    timeoutMs: 90000,
  })
  return { text: result.answer, modelUsed: result.model }
}

export async function runAssistantTurn({ userId, text, route, context, commandResult }) {
  const userText = cleanText(text, 500)
  if (!userText && !commandResult) throw errors.param('请输入语音内容')

  const { user, products, orders } = await loadAssistantContext(userId)
  const system = assistantSystemPrompt()
  const prompt = buildUserPrompt({
    text: userText,
    route,
    context,
    commandResult,
    user,
    products,
    orders,
  })

  const failures = []
  let finalOutput
  try {
    const modelOutput = await callDeepSeek({ system, prompt })
    const parsed = parseJsonLoose(modelOutput.text)
    finalOutput = {
      ...sanitizeAssistantOutput(parsed, products),
      modelUsed: modelOutput.modelUsed,
    }
  } catch (err) {
    failures.push(`deepseek:${err.message}`)
  }
  if (!finalOutput) {
    try {
      const modelOutput = await callOllama({ system, prompt })
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
