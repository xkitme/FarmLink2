import app from './app.js'
import { prisma } from './db.js'
import { config } from './config/index.js'
import { cleanDefaultPwdChangedAt } from './startup/clean-default-pwd-changed-at.js'
import { migrateThreadIds } from './startup/migrate-thread-id.js'

// Windows terminals can default to GBK; keep startup logs UTF-8 when possible.
if (process.platform === 'win32') {
  try {
    process.stdout.setDefaultEncoding?.('utf8')
    process.stderr.setDefaultEncoding?.('utf8')
  } catch {
    // Keep the default stream behavior if the runtime does not support it.
  }
}

const PORT = config.port

async function checkOllama() {
  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function bootstrap() {
  await prisma.$connect()
  console.log('✓ SQLite 数据库已连接')

  const cleanedPwdChangedAt = await cleanDefaultPwdChangedAt()
  if (cleanedPwdChangedAt > 0) {
    console.log(`✓ 清理 ${cleanedPwdChangedAt} 条 48a 残留 passwordChangedAt`)
  }

  const migratedThreadIds = await migrateThreadIds()
  if (migratedThreadIds > 0) {
    console.log(`✓ 迁移 ${migratedThreadIds} 条 AI 记录 threadId`)
  }

  const ollamaOk = await checkOllama()
  if (ollamaOk) {
    console.log(`✓ Ollama 在线 [${config.ollama.primaryModel}]`)
  } else {
    console.warn('⚠ Ollama 未连接，平台知识库与规则服务可用；如需大模型推理请运行: ollama serve')
  }

  app.listen(PORT, () => {
    console.log('\n🌾 FarmLink 田园通服务已启动')
    console.log(`   后端 API: http://localhost:${PORT}${config.apiPrefix}`)
    console.log(`   健康检查: http://localhost:${PORT}/health`)
    console.log()
  })
}

bootstrap().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
