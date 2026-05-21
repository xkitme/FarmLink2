import app, { prisma } from './app.js'
import { config } from './config/index.js'
import { checkHealth } from './services/ai.service.js'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = config.port
const isProd = process.env.NODE_ENV === 'production'

// 生产模式：把 admin/dist 挂载到同一端口
if (isProd) {
  const adminDist = path.resolve(__dirname, '../../../admin/dist')
  if (fs.existsSync(adminDist)) {
    app.use(express.static(adminDist))
    // SPA fallback（不拦截 /api /admin /health）
    app.get(/^(?!\/(api|admin|health))/, (req, res) => {
      res.sendFile(path.join(adminDist, 'index.html'))
    })
  }
}

async function bootstrap() {
  await prisma.$connect()
  console.log('✓ SQLite 数据库已连接')

  const ollamaOk = await checkHealth()
  if (ollamaOk) {
    console.log(`✓ Ollama 在线 [${config.ollama.primaryModel}]`)
  } else {
    console.warn('⚠ Ollama 未启动，AI 功能不可用。请运行: ollama serve')
  }

  app.listen(PORT, () => {
    if (isProd) {
      console.log(`\n🖌  墨脉 InkFlow 已启动（生产模式）`)
      console.log(`   管理面板: http://localhost:${PORT}`)
      console.log(`   API:      http://localhost:${PORT}/api`)
    } else {
      console.log(`\n🖌  墨脉 InkFlow 已启动（开发模式）`)
      console.log(`   后端 API: http://localhost:${PORT}`)
      console.log(`   管理面板: http://localhost:3001`)
    }
    console.log()
  })
}

bootstrap().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
