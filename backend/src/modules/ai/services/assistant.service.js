import { config } from '../../../config/index.js'
import { prisma } from '../../../db.js'
import { errors } from '../../../utils/response.js'
import { generateText } from './ollama.service.js'
import { loadAssistantConfig, providerPlan } from './assistant-config.service.js'
import { deepseekGenerate } from './deepseek.service.js'

const ROUTE_CATALOG = [
  ['home', '首页'],
  ['all', '全部服务'],
  ['search', '全局搜索'],
  ['ai', 'AI 农技'],
  ['ai_chat', '新建 AI 对话'],
  ['market', '乡村集市'],
  ['orders', '我的订单'],
  ['market_service', '集市服务工具'],
  ['machinery', '农机共享'],
  ['machinery_service', '农机服务工具'],
  ['policy', '惠农政策'],
  ['policy_service', '政策服务工具'],
  ['disaster', '气象灾害'],
  ['agri', '农业生产'],
  ['agri_diagnose', '拍照识病'],
  ['life', '乡村生活'],
  ['data', '数据看板'],
  ['data_service', '数据服务工具'],
  ['iot', '模拟 IoT 看板'],
  ['publish', '发布'],
  ['messages', '消息'],
  ['profile', '我的'],
  ['settings', '设置中心'],
  ['account', '账号资料'],
  ['account_edit', '编辑资料'],
  ['password', '修改密码'],
  ['push_settings', '消息推送设置'],
  ['weather_alert', '天气提醒设置'],
  ['storage', '存储管理'],
  ['about', '关于田园通'],
  ['privacy', '隐私设置'],
  ['help', '帮助与反馈'],
  ['elder_mode', '适老模式'],
  ['screen', '村级数字驾驶舱'],
]

const ALLOWED_ROUTE_KEYS = new Set(ROUTE_CATALOG.map(([key]) => key))

// 每个页面 routeKey 实际承载的「功能点」别名（与 App 端 feature_catalog.dart 对齐）。
// 语音助手只认页面名时，用户说「查行情」「农事日历」「交水电费」等细粒度功能会「不认识」；
// 把功能点喂给模型，它就能把用户口语的功能名映射到所属页面再 open_page。
const ROUTE_FEATURES = {
  agri_diagnose: ['病虫害识别', '拍照识病', '叶片识别', '植保诊断'],
  agri: [
    '作物长势监测', '杂草识别', '种子检测', '智能施肥', '施肥配方', '灌溉计划', '浇水',
    '产量预测', '农事日历', '节气农时', '农药安全查询', '用药间隔', '地块管理', '田块',
    '农事记录', '打药记录', '碳排放核算',
  ],
  iot: ['智能物联', '物联网', '传感器', '设备监测', '田间监测', '设备联动', '自动灌溉', '联动规则'],
  market: ['乡村集市', '商城', '买卖下单', '实时行情', '农产品价格', '报价'],
  market_service: [
    '价格预测', '期货行情', '出口合规', '收购站地图', '农资团购', 'AI质量分级', '品控',
    '直播话术', '带货', '包装文案', '溯源码', '追溯', '物流查询', '快递运输',
  ],
  machinery: ['农机租赁', '拖拉机', '收割机', '找农机'],
  machinery_service: [
    '维保提醒', '保养', '故障诊断', '农机维修', '作业轨迹', '成本核算', '土地流转',
    '机手认证', '农机保险',
  ],
  disaster: [
    '极端天气预警', '天气预报', '气象', '暴雨', '灾情上报', '受灾', '保险理赔', '应急预案',
    '冻害防护', '霜冻', '火险预警', '干旱指数', '旱情', '一键求助', 'SOS', '紧急求助',
  ],
  policy: ['政策推送', '惠农政策', '三农', '党建学习', '村务公开', '文明乡风榜'],
  policy_service: ['补贴申请', '补助', '政策AI问答', '法律咨询', '普法维权', '职业农民培训', '课程'],
  life: [
    '村医问诊', '看病健康', '快递代收', '取件', '就业平台', '招工找工作', '水电气缴费',
    '水费电费', '乡村旅游', '农家乐', '养老关爱', '农业贷款', '金融借款', '教育辅导',
    '邻里互助', '二手交易', '闲置转让', '民俗记录', '非遗文化', '环境举报', '污染举报',
  ],
  data: ['农情数据看板', '驾驶舱', '遥感分析', '卫星NDVI'],
  data_service: ['农事年度报告', '统计上报', '数据同步'],
  ai_chat: ['AI智能问答', 'AI助手', '聊天咨询'],
  ai: ['AI对话历史', '历史记录'],
  orders: ['我的订单', '订单查询', '查快递', '订单状态'],
}

const ALLOWED_COMMANDS = new Set([
  'open_page',
  'search',
  'show_products',
  'open_product',
  'show_order_confirm',
  'create_order',
  'mock_pay',
  'toggle_linkage',
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
  if (type === 'search') {
    // 语音全局搜索：把用户要查的词带到搜索页并即时执行检索。
    const keyword = cleanText(params.keyword || params.query || params.text, 50)
    if (!keyword) return null
    return { type, params: { keyword } }
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
    if (!productId || !availableProductIds.has(productId) || !quantity) {
      return null
    }
    // receiverInfo 可选：App 用登录用户资料里的收货地址兜底填充；模型给了就一并透传。
    const receiverInfo = sanitizeReceiverInfo(params.receiverInfo)
    return { type, params: { productId, quantity, ...(receiverInfo ? { receiverInfo } : {}) } }
  }
  if (type === 'mock_pay') {
    const orderId = positiveInt(params.orderId)
    if (!orderId) return null
    return { type, params: { orderId } }
  }
  if (type === 'toggle_linkage') {
    // 页面内动作：启用/停用 IoT 设备联动规则（按规则名匹配，App 端解析到真实规则 id）。
    const ruleName = cleanText(params.ruleName || params.name, 40)
    if (!ruleName) return null
    const enabled = params.enabled !== false && params.enabled !== 'false'
    return { type, params: { ruleName, enabled } }
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

export function sanitizeAssistantOutput(parsed, products) {
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
  const speakText = replyMarkdown
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
    availableRoutes: ROUTE_CATALOG.map(([key, label]) => {
      const features = ROUTE_FEATURES[key]
      return features && features.length ? { key, label, features } : { key, label }
    }),
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
