import app from './app.js'
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

  app.listen(PORT, () => {
    console.log('\n🌾 田园通服务已启动')
    console.log(`   后端 API: http://localhost:${PORT}${config.apiPrefix}`)
    console.log(`   健康检查: http://localhost:${PORT}/health`)
    console.log()
    void warmupVisionModelWithRetry()
  })
}

bootstrap().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
