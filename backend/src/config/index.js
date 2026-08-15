import 'dotenv/config'
import { isIP } from 'node:net'

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

/**
 * 解析 TRUST_PROXY 环境变量为 Express trust proxy 配置。
 *
 * 使用 node:net isIP 进行可靠 IP/CIDR 校验，拒绝 999.999.999.999、
 * 10.0.0.1/99、::::、IPv6 /999 等非法地址。
 * 仍然拒绝 true/1（过于危险）。
 *
 * @param {object} env
 * @returns {false|string[]}
 */
export function resolveTrustProxy(env = process.env) {
  const raw = `${env.TRUST_PROXY || ''}`.trim()

  if (!raw || raw === 'false' || raw === '0') {
    return false
  }

  if (raw === 'true' || raw === '1') {
    throw new Error(
      'TRUST_PROXY=true 过于危险（会信任任意来源的 X-Forwarded-For）。'
      + '请显式指定可信代理的 IP 地址或 CIDR（逗号分隔多个），'
      + '或使用 TRUST_PROXY=loopback 仅信任本机反向代理。',
    )
  }

  if (raw === 'loopback') {
    return ['loopback']
  }

  // 逗号分隔的 IP 地址/CIDR 列表。空段（纯逗号、尾逗号、双逗号）fail-fast，
  // 不静默降级：显式配置必须完全可解析。
  const segments = raw.split(',')
  const addrs = []
  for (const seg of segments) {
    const trimmed = seg.trim()
    if (!trimmed) {
      throw new Error(
        'TRUST_PROXY 含空段（如连续逗号、头尾逗号）。'
        + '请使用合法地址列表，如 10.0.0.1,192.168.0.0/24。',
      )
    }
    addrs.push(trimmed)
  }

  for (const addr of addrs) {
    if (addr === 'loopback') continue

    const slashIdx = addr.indexOf('/')
    if (slashIdx !== -1) {
      const ipPart = addr.slice(0, slashIdx)
      const prefixStr = addr.slice(slashIdx + 1)

      const version = isIP(ipPart)
      if (!version) {
        throw new Error(
          `TRUST_PROXY 地址 "${addr}" 的 IP 部分非法。`
          + '请使用合法的 IPv4/IPv6 地址加可选 CIDR 前缀（如 10.0.0.1 或 10.0.0.0/24）。',
        )
      }

      // 严格纯数字：拒绝空串、+1、空格等 Number() 会接受但非法的值
      if (!/^\d+$/.test(prefixStr)) {
        throw new Error(
          `TRUST_PROXY CIDR "${addr}" 的前缀必须是 0..32 (IPv4) 或 0..128 (IPv6) 的非负整数。`,
        )
      }
      const prefix = Number(prefixStr)
      const maxPrefix = version === 4 ? 32 : 128
      if (prefix > maxPrefix) {
        throw new Error(
          `TRUST_PROXY CIDR "${addr}" 前缀 ${prefix} 超出 IPv${version} 最大 ${maxPrefix}。`,
        )
      }
    } else {
      if (!isIP(addr)) {
        throw new Error(
          `TRUST_PROXY 包含无法识别的地址: "${addr}"。`
          + '请使用 IPv4/IPv6 地址或 CIDR（如 10.0.0.1 或 10.0.0.0/24），'
          + '多个地址用逗号分隔。',
        )
      }
    }
  }

  return addrs
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
  apiPrefixV2: '/api/v2',

  runtime: {
    environment: runtimeEnvironment,
  },

  jwt: {
    secret: accessSecret,
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'village-dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    // 浏览器管理台 refresh token 7 天（与 cookie Max-Age 对齐）；原生壳沿用 30 天
    refreshExpiresInBrowser: process.env.JWT_REFRESH_EXPIRES_IN_BROWSER || '7d',
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

  // HTTPS：release 环境启用，demo/dev 默认关闭；通过环境变量控制
  https: {
    enabled: runtimeEnvironment === 'release' || process.env.HTTPS_ENABLED === 'true',
    port: parseInt(process.env.HTTPS_PORT) || 8443,
    certPath: process.env.HTTPS_CERT_PATH || '',
    keyPath: process.env.HTTPS_KEY_PATH || '',
  },

  // Cookie：管理台 HttpOnly 认证
  cookie: {
    secure: runtimeEnvironment !== 'dev',
    sameSite: 'Strict',
    accessTokenMaxAge: 15 * 60 * 1000,           // 15 min，与 JWT expiresIn 对齐
    refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // 代理信任：控制 Express 对 X-Forwarded-For 的信任策略
  trustProxy: resolveTrustProxy(),

  // CORS：dev 放行本地开发源 + Capacitor；demo/release 从 CORS_ORIGINS 环境变量读取
  cors: {
    allowDevOrigins: runtimeEnvironment === 'dev',
    explicitOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Name', 'X-CSRF-Token'],
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
