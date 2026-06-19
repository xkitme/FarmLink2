import { config } from '../../../config/index.js'
import { prisma } from '../../../db.js'
import { errors } from '../../../utils/response.js'

// 语音助手运行时配置：存 SiteSetting 单键 JSON，管理台改了即时生效（无需重启）。
const SETTING_KEY = 'ai_assistant_config'

// provider 取值（语音助手与主问答各自独立选择）：
//  auto    = DeepSeek 优先、失败回落 Ollama
//  deepseek= 只用 DeepSeek（失败即报错，便于排查 key/网络）
//  ollama  = 只用本地 Ollama（离线/无 key 时）
export const ASSISTANT_PROVIDERS = new Set(['auto', 'deepseek', 'ollama'])

/** 把 provider 解析成调用计划：是否尝试 DeepSeek / Ollama。 */
export function providerPlan(provider) {
  return {
    useDeepSeek: provider === 'auto' || provider === 'deepseek',
    useOllama: provider === 'auto' || provider === 'ollama',
  }
}

// 默认系统提示词。管理台留空时回落到这份；改写后存库覆盖。
export const DEFAULT_SYSTEM_PROMPT = [
  '你是 InkFlow 的 AI 语音自动化助手，只能输出严格 JSON。',
  '不要输出 Markdown 代码块，不要输出解释文字。',
  'JSON schema:',
  '{"replyMarkdown":"给用户看的中文回复","speakText":"与 replyMarkdown 一致的朗读文本","statusText":"可选的短状态","commands":[{"type":"命令名","params":{}}]}',
  '允许命令:',
  'open_page {routeKey} 可打开这些页面: home首页, all全部服务, search搜索, ai AI农技, ai_chat新AI对话, market乡村集市, orders我的订单, market_service集市服务, machinery农机共享, machinery_service农机服务, policy惠农政策, policy_service政策服务, disaster气象灾害, agri农业生产, agri_diagnose拍照识病, life乡村生活, data数据看板, data_service数据服务, iot物联看板, publish发布, messages消息, profile我的, settings设置, account账号资料, account_edit编辑资料, password改密码, push_settings消息推送, weather_alert天气提醒, storage存储管理, about关于, privacy隐私, help帮助反馈, elder_mode适老模式, screen村级驾驶舱',
  'show_products {productIds:number[]}',
  'open_product {productId:number}',
  'show_order_confirm {productId:number, quantity:number}',
  'create_order {productId:number, quantity:number}',
  'mock_pay {orderId:number}',
  'show_message {markdown:string, speak:boolean}',
  'end {}',
  '规则:',
  '1. 命令只能使用给定商品 id；不确定时先回复并 show_message，不要硬下单。',
  '2. 用户要推荐商品时，先 show_products 或 open_page market；用户明确选择某个商品时再 open_product。',
  '3. 下单流程：先 show_order_confirm 给用户确认，用户明确确认后再 create_order；收货信息由 App 用用户资料里的收货地址自动填充，你无需索要或填写地址（地址缺失时 App 会自行提示补全）。',
  '4. 用户说“没有了/结束/不用了/关闭”时，回复一句确认并输出 end。',
  '5. 不暴露技术命令、模型、接口、schema 或兜底细节。',
  '6. userText 来自语音识别，可能有同音字或近音错字；请结合 availableRoutes 自动纠正到最接近的真实功能名，不要因为一两个错字就拒绝打开页面。',
  '7. availableRoutes 每个页面带 features 功能点清单（如「实时行情/农事日历/补贴申请/村医问诊/水电气缴费/灾情上报/农机故障/遥感分析」等）。用户说出任意功能点名称时，找到包含它的页面并 open_page 打开该页面（在回复里说明该功能在哪个页面）；只要功能点能对应到某页面，就不要回答「不支持/没有这个功能」。',
].join('\n')

function parseSettingValue(value) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function clampTemperature(value, fallback = 0.1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(1, Math.max(0, n))
}

function pickProvider(value, fallback) {
  return ASSISTANT_PROVIDERS.has(value) ? value : fallback
}

// 把库里存的原始 JSON + env 默认合成一份完整配置（含敏感 key，仅供服务端内部使用）。
function normalize(raw = {}) {
  // 语音助手提供方：兼容老字段 provider；主问答提供方默认 ollama（保持历史行为）。
  const assistantProvider = pickProvider(raw.assistantProvider ?? raw.provider, 'auto')
  const chatProvider = pickProvider(raw.chatProvider, 'ollama')
  const systemPrompt = String(raw.systemPrompt || '').trim() || DEFAULT_SYSTEM_PROMPT
  const deepseekBaseUrl = String(raw.deepseekBaseUrl || '').trim() || config.deepseek.baseUrl
  const deepseekModel = String(raw.deepseekModel || '').trim() || config.deepseek.model
  // key：库里有就用库里的；否则回落 env（兼容老部署）。
  const deepseekApiKey = String(raw.deepseekApiKey || '').trim() || config.deepseek.apiKey
  return {
    enabled: raw.enabled !== false,
    assistantProvider,
    chatProvider,
    systemPrompt,
    temperature: clampTemperature(raw.temperature),
    deepseekApiKey,
    deepseekBaseUrl,
    deepseekModel,
    deepseekThinking: raw.deepseekThinking === true, // 默认 false=非思考(快)
  }
}

/** 服务端内部读取完整配置（含明文 key）。 */
export async function loadAssistantConfig() {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } })
  return normalize(parseSettingValue(row?.value))
}

function maskKey(key) {
  const k = String(key || '')
  if (!k) return ''
  if (k.length <= 8) return '••••'
  return `${k.slice(0, 4)}••••${k.slice(-4)}`
}

/** 管理台读取视图：key 脱敏，只回是否已配置 + 掩码，绝不回明文。 */
export async function getAssistantConfigView() {
  const cfg = await loadAssistantConfig()
  const { deepseekApiKey, ...rest } = cfg
  return {
    ...rest,
    deepseekApiKeySet: Boolean(deepseekApiKey),
    deepseekApiKeyMasked: maskKey(deepseekApiKey),
    defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
  }
}

/**
 * 管理台保存：只覆盖传入字段。
 * - deepseekApiKey 缺省/空串 = 保持原 key（避免脱敏回显把 key 抹掉）；
 *   传 clearKey:true 才清空。
 */
export async function saveAssistantConfig(patch = {}) {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } })
  const stored = parseSettingValue(row?.value)
  const next = { ...stored }

  if (patch.enabled !== undefined) {
    next.enabled = patch.enabled === true || patch.enabled === 'true'
  }
  // 语音助手提供方（兼容老字段名 provider）
  const assistantProviderInput = patch.assistantProvider ?? patch.provider
  if (assistantProviderInput !== undefined) {
    if (!ASSISTANT_PROVIDERS.has(assistantProviderInput)) throw errors.param('语音助手 provider 取值非法')
    next.assistantProvider = assistantProviderInput
    delete next.provider // 收敛到新字段名
  }
  if (patch.chatProvider !== undefined) {
    if (!ASSISTANT_PROVIDERS.has(patch.chatProvider)) throw errors.param('问答 provider 取值非法')
    next.chatProvider = patch.chatProvider
  }
  if (patch.systemPrompt !== undefined) {
    const prompt = String(patch.systemPrompt || '').trim()
    if (prompt.length > 8000) throw errors.param('系统提示词过长（≤8000 字）')
    next.systemPrompt = prompt // 留空 = 回落默认提示词
  }
  if (patch.temperature !== undefined) {
    next.temperature = clampTemperature(patch.temperature)
  }
  if (patch.deepseekThinking !== undefined) {
    next.deepseekThinking = patch.deepseekThinking === true || patch.deepseekThinking === 'true'
  }
  if (patch.deepseekBaseUrl !== undefined) {
    const url = String(patch.deepseekBaseUrl || '').trim()
    if (url && !/^https?:\/\//i.test(url)) throw errors.param('DeepSeek 接口地址需以 http(s):// 开头')
    next.deepseekBaseUrl = url
  }
  if (patch.deepseekModel !== undefined) {
    next.deepseekModel = String(patch.deepseekModel || '').trim()
  }
  if (patch.clearKey === true) {
    next.deepseekApiKey = ''
  } else if (patch.deepseekApiKey !== undefined && String(patch.deepseekApiKey).trim()) {
    next.deepseekApiKey = String(patch.deepseekApiKey).trim()
  }

  const value = JSON.stringify(next)
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value, description: 'AI 语音助手运行时配置（提供方/提示词/DeepSeek key）' },
    update: { value },
  })
  return getAssistantConfigView()
}
