import app, { prisma } from './app.js'
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
    console.warn('⚠ Ollama 未启动，AI 功能不可用。请运行: ollama serve')
  }

  app.listen(PORT, () => {
    console.log(`\n🌾 数字乡村助农 已启动（${config.isProd ? '生产' : '开发'}模式）`)
    console.log(`   后端 API: http://localhost:${PORT}${config.apiPrefix}`)
    console.log(`   健康检查: http://localhost:${PORT}/health`)
    console.log()
  })
}

bootstrap().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
