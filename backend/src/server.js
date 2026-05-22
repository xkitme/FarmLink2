import app from './app.js'
import { prisma } from './db.js'
import { config } from './config/index.js'

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

  const ollamaOk = await checkOllama()
  if (ollamaOk) {
    console.log(`✓ Ollama 在线 [${config.ollama.primaryModel}]`)
  } else {
    console.warn('⚠ Ollama 未连接，本地知识库与规则兜底可用；如需大模型推理请运行: ollama serve')
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
