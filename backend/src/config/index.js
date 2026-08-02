import 'dotenv/config'

const INSECURE_SECRETS = new Set([
  'village-dev-secret',
  'village-dev-secret-change-me',
  'village-dev-refresh-secret',
  'village-dev-refresh-secret-change-me',
  'village-admin-secret',
  'village-admin-secret-change-me',
])

export function resolveRuntimeEnvironment(env = process.env) {
  const explicit = `${env.APP_ENV || ''}`.trim().toLowerCase()
  if (explicit) return explicit
  return env.NODE_ENV === 'production' ? 'release' : 'dev'
}

export function validateSecurityConfig(target) {
  const environment = target.runtime.environment
  if (!['dev', 'demo', 'release'].includes(environment)) {
    throw new Error(`APP_ENV 必须是 dev、demo 或 release，当前为 ${environment}`)
  }
  if (environment === 'dev') return target

  const secrets = [
    ['JWT_SECRET', target.jwt.secret],
    ['JWT_REFRESH_SECRET', target.jwt.refreshSecret],
  ]
  const issues = []
  for (const [name, value] of secrets) {
    if (!value || value.length < 32) issues.push(`${name} 至少需要 32 个字符`)
    if (INSECURE_SECRETS.has(value)) issues.push(`${name} 不能使用已知默认值`)
  }
  if (target.jwt.secret === target.jwt.refreshSecret) {
    issues.push('JWT_SECRET 与 JWT_REFRESH_SECRET 必须不同')
  }
  if (issues.length > 0) {
    throw new Error(`安全配置校验失败（${environment}）：${issues.join('；')}`)
  }
  return target
}

export function resolveSeedPassword(target, env = process.env) {
  validateSecurityConfig(target)
  if (target.runtime.environment === 'release') {
    throw new Error('release 环境禁止执行种子脚本')
  }
  const password = `${env.SEED_PASSWORD || ''}`
    || (target.runtime.environment === 'dev' ? '123456' : '')
  if (password.length < 6) {
    throw new Error('demo 环境必须设置 SEED_PASSWORD（至少 6 位）')
  }
  return password
}

const runtimeEnvironment = resolveRuntimeEnvironment()
const accessSecret = process.env.JWT_SECRET || 'village-dev-secret'

export const config = {
  port: parseInt(process.env.PORT) || 8000,
  isProd: process.env.NODE_ENV === 'production',
  apiPrefix: '/api/v1',

  runtime: {
    environment: runtimeEnvironment,
  },

  jwt: {
    secret: accessSecret,
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'village-dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    // 8GB 显存 demo 默认用 3B，降低与视觉模型切换时的冷加载成本；显存充足时可用环境变量升到 7B。
    // 1.5B 太小常复读/答非所问，不作为默认推荐。
    primaryModel: process.env.OLLAMA_PRIMARY_MODEL || 'qwen2.5:3b-instruct-q4_K_M',
    visionModel: process.env.OLLAMA_VISION_MODEL || 'minicpm-v:8b-2.6-q4_K_M',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'bge-m3',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },

  // 本地 Kokoro 中文 TTS sidecar（tts/tts_server.py，仿 ollama 的本地常驻服务）。
  tts: {
    baseUrl: process.env.TTS_BASE_URL || 'http://localhost:11435',
    voice: process.env.TTS_VOICE || 'zf_xiaoxiao',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
  },

  // AI 接口限流：每用户每小时调用上限
  aiRateLimit: {
    perHour: 20,
  },

}

// 角色常量
export const ROLES = {
  FARMER: 'FARMER',       // 普通农户
  BIGFARMER: 'BIGFARMER', // 种植大户/合作社
  VILLAGE: 'VILLAGE',     // 村委/基层干部
  EXPERT: 'EXPERT',       // 农技员
  MERCHANT: 'MERCHANT',   // 收购商/农资商
  ADMIN: 'ADMIN',         // 平台管理员
}

// 业务错误码
export const CODES = {
  OK: 200,
  PARAM_ERROR: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  RATE_LIMIT: 42901,
  SERVER_ERROR: 50001,
  AI_BUSY: 60001,
  OFFLINE: 60002,
}
