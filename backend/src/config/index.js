import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT) || 8000,

  jwt: {
    secret: process.env.JWT_SECRET || 'inkflow-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    primaryModel: process.env.OLLAMA_PRIMARY_MODEL || 'qwen2.5:7b-instruct-q4_K_M',
    visionModel: process.env.OLLAMA_VISION_MODEL || 'minicpm-v:8b-2.6-q4_K_M',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
  },

  aiRateLimit: {
    free: 20,
    monthly: 100,
    yearly: 500,
  },
}
