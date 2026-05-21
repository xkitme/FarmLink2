import app, { prisma } from './app.js'
import { config } from './config/index.js'
import { checkHealth } from './services/ai.service.js'

const PORT = config.port

async function bootstrap() {
  // 数据库连接
  await prisma.$connect()
  console.log('✓ SQLite 数据库已连接')

  // Ollama 健康检查
  const ollamaOk = await checkHealth()
  if (ollamaOk) {
    console.log(`✓ Ollama 在线 [${config.ollama.primaryModel}]`)
  } else {
    console.warn('⚠ Ollama 未启动，AI 功能不可用。请运行: ollama serve')
  }

  app.listen(PORT, () => {
    console.log(`\n🖌  墨脉 InkFlow 后端已启动`)
    console.log(`   本地: http://localhost:${PORT}`)
    console.log(`   API 文档: http://localhost:${PORT}/api`)
    console.log(`   环境: ${process.env.NODE_ENV || 'development'}\n`)
  })
}

bootstrap().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
