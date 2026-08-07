import app from './app.js'
import https from 'node:https'
import fs from 'node:fs'
import { prisma } from './db.js'
import { config, validateSecurityConfig } from './config/index.js'
import { cleanDefaultPwdChangedAt } from './startup/clean-default-pwd-changed-at.js'
import { migrateThreadIds } from './startup/migrate-thread-id.js'
import { warmupVisionModel } from './modules/ai/services/ollama.service.js'

// 注：Windows 控制台中文乱码的真正修复在 start.bat 的 chcp 65001（47a 已验证）；
// setDefaultEncoding 对控制台代码页无效，已移除避免误导。

const PORT = config.port
const VISION_WARMUP_ATTEMPTS = Number(process.env.OLLAMA_VISION_WARMUP_ATTEMPTS || 3)
const VISION_WARMUP_INTERVAL_MS = Number(process.env.OLLAMA_VISION_WARMUP_INTERVAL_MS || 15000)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function checkOllama() {
  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { online: false }
    const data = await res.json().catch(() => ({ models: [] }))
    const names = (data.models || []).map((m) => m.name)
    return {
      online: true,
      models: names,
      hasVision: names.includes(config.ollama.visionModel),
      hasPrimary: names.includes(config.ollama.primaryModel),
    }
  } catch {
    return { online: false }
  }
}

async function warmupVisionModelWithRetry() {
  const attempts = Number.isFinite(VISION_WARMUP_ATTEMPTS)
    ? Math.max(1, Math.floor(VISION_WARMUP_ATTEMPTS))
    : 3
  const intervalMs = Number.isFinite(VISION_WARMUP_INTERVAL_MS)
    ? Math.max(1000, Math.floor(VISION_WARMUP_INTERVAL_MS))
    : 15000

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const ollama = await checkOllama()
    if (!ollama.online) {
      console.warn(`⚠ 视觉模型预热等待 Ollama 在线 (${attempt}/${attempts})`)
    } else if (!ollama.hasVision) {
      console.warn(`⚠ 视觉模型 ${config.ollama.visionModel} 未拉取，识图会走「无法识别」兜底；执行: ollama pull ${config.ollama.visionModel}`)
      return
    } else {
      const res = await warmupVisionModel()
      if (res.ok) {
        console.log(`✓ 视觉模型预热完成 (${res.elapsedMs} ms)`)
        return
      }
      console.warn(`⚠ 视觉模型预热失败 (${attempt}/${attempts}): ${res.reason}`)
    }

    if (attempt < attempts) await sleep(intervalMs)
  }

  console.warn('⚠ 视觉模型预热未完成，首次识图仍会冷启动')
}

async function bootstrap() {
  validateSecurityConfig(config)
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

  const ollama = await checkOllama()
  if (ollama.online) {
    console.log(`✓ Ollama 在线 [${config.ollama.primaryModel}]`)
    if (!ollama.hasPrimary) {
      console.warn(`⚠ 主模型 ${config.ollama.primaryModel} 未拉取，问答会走规则兜底；执行: ollama pull ${config.ollama.primaryModel}`)
    }
    if (!ollama.hasVision) {
      console.warn(`⚠ 视觉模型 ${config.ollama.visionModel} 未拉取，识图会走「无法识别」兜底；执行: ollama pull ${config.ollama.visionModel}`)
    }
  } else {
    console.warn('⚠ Ollama 未连接，平台知识库与规则服务可用；如需大模型推理请运行: ollama serve')
  }

  function startHttpServer() {
    app.listen(PORT, () => {
      console.log('\n🌾 田园通服务已启动')
      console.log(`   后端 API: http://localhost:${PORT}${config.apiPrefix}`)
      console.log(`   健康检查: http://localhost:${PORT}/health`)
      if (!config.https.enabled) {
        const env = config.runtime.environment
        console.log(`   ⚠ ${env === 'release' ? '生产' : '当前'}环境未启用 HTTPS，建议生产部署时配置 HTTPS`)
        console.log('     设置 HTTPS_ENABLED=true 并指定 HTTPS_CERT_PATH / HTTPS_KEY_PATH')
      }
      console.log()
      void warmupVisionModelWithRetry()
    })
    return app
  }

  function startHttpsServer() {
    const { port: httpsPort, certPath, keyPath } = config.https

    if (!certPath || !keyPath) {
      console.warn(`⚠ HTTPS 已启用但未配置证书路径，跳过 HTTPS 监听`)
      console.warn('   请设置 HTTPS_CERT_PATH 和 HTTPS_KEY_PATH 环境变量')
      return null
    }

    if (!fs.existsSync(certPath)) {
      console.warn(`⚠ HTTPS 证书文件不存在：${certPath}`)
      return null
    }
    if (!fs.existsSync(keyPath)) {
      console.warn(`⚠ HTTPS 私钥文件不存在：${keyPath}`)
      return null
    }

    const httpsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    }

    const httpsServer = https.createServer(httpsOptions, app)
    httpsServer.listen(httpsPort, () => {
      console.log(`🔒 HTTPS 服务已启动：https://localhost:${httpsPort}${config.apiPrefix}`)
    })
    return httpsServer
  }

  startHttpServer()
  if (config.https.enabled) startHttpsServer()
}

bootstrap().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
