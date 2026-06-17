import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT) || 8000,
  isProd: process.env.NODE_ENV === 'production',
  apiPrefix: '/api/v1',

  jwt: {
    secret: process.env.JWT_SECRET || 'village-dev-secret',
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

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'village2025',
    jwtSecret: process.env.ADMIN_JWT_SECRET || 'village-admin-secret',
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
