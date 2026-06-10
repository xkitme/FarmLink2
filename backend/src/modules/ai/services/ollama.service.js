import { config } from '../../../config/index.js'

function timeoutSignal(ms) {
  if (AbortSignal.timeout) return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

function baseUrl() {
  return config.ollama.baseUrl.replace(/\/+$/, '')
}

async function postJson(path, body, timeoutMs = 60000) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  return res
}

/** 查询 Ollama 服务与模型列表，同时查已加载到显存的模型（/api/ps），
 *  让 /ai/status 能告诉运维「视觉模型是否还热着」。 */
export async function getOllamaStatus(timeoutMs = 1500) {
  try {
    const tagsRes = await fetch(`${baseUrl()}/api/tags`, { signal: timeoutSignal(timeoutMs) })
    if (!tagsRes.ok) throw new Error(`HTTP ${tagsRes.status}`)
    const tagsData = await tagsRes.json()
    let loaded = []
    try {
      const psRes = await fetch(`${baseUrl()}/api/ps`, { signal: timeoutSignal(timeoutMs) })
      if (psRes.ok) {
        const psData = await psRes.json()
        loaded = (psData.models || []).map((m) => ({
          name: m.name,
          sizeVram: m.size_vram,
          expiresAt: m.expires_at,
        }))
      }
    } catch { /* /api/ps 失败不影响 tags 结果 */ }
    return {
      online: true,
      baseUrl: config.ollama.baseUrl,
      models: (tagsData.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      })),
      loadedInVram: loaded,
      visionWarm: loaded.some((m) => m.name === config.ollama.visionModel),
      primaryWarm: loaded.some((m) => m.name === config.ollama.primaryModel),
      primaryModel: config.ollama.primaryModel,
      visionModel: config.ollama.visionModel,
      embedModel: config.ollama.embedModel,
    }
  } catch (err) {
    return {
      online: false,
      baseUrl: config.ollama.baseUrl,
      models: [],
      loadedInVram: [],
      visionWarm: false,
      primaryWarm: false,
      primaryModel: config.ollama.primaryModel,
      visionModel: config.ollama.visionModel,
      embedModel: config.ollama.embedModel,
      error: err.message,
    }
  }
}

/** 非流式大模型生成。
 *  format='json' 时走 Ollama 内置的 JSON 强制模式（仅服务端约束，模型仍可能出 schema 之外字段，
 *  但能挡住「输出英文段落 + 编号列表」这种完全跑题的情况——小视觉模型对 prompt 遵守度差，必须叠加用）。
 */
export async function generateText({ prompt, system, model, images, temperature = 0.2, timeoutMs = 180000, format }) {
  const started = Date.now()
  const body = {
    model: model || config.ollama.primaryModel,
    prompt,
    system,
    images,
    stream: false,
    keep_alive: '60m',
    options: {
      temperature,
      num_ctx: 4096,
      num_predict: 700,
    },
  }
  if (format) body.format = format
  const res = await postJson('/api/generate', body, timeoutMs)
  const data = await res.json()
  return {
    answer: String(data.response || '').trim(),
    model: data.model || model || config.ollama.primaryModel,
    totalDurationMs: Date.now() - started,
    raw: data,
  }
}

/** 视觉模型预热：启动时调一次（不传图片，只让 ollama 把模型权重加载进显存），
 *  避免第一个真实用户请求承担 30–60s 冷启动。
 *  失败不抛——预热失败不应阻塞服务启动；用户后续请求自然会经历冷启动。 */
export async function warmupVisionModel(timeoutMs = 240000) {
  const model = config.ollama.visionModel
  if (!model) return { ok: false, reason: 'no-vision-model-configured' }
  const started = Date.now()
  try {
    // 用极短的 prompt + num_predict=1 触发权重加载，最大限度减小推理耗时。
    await postJson('/api/generate', {
      model,
      prompt: 'warmup',
      stream: false,
      keep_alive: '60m',
      options: { num_predict: 1, temperature: 0 },
    }, timeoutMs)
    return { ok: true, model, elapsedMs: Date.now() - started }
  } catch (err) {
    return { ok: false, model, reason: err.message, elapsedMs: Date.now() - started }
  }
}

/** 流式生成，按 Ollama JSONL 响应逐段吐出 delta。 */
export async function streamText({ prompt, system, model, onDelta, images, temperature = 0.2, timeoutMs = 180000 }) {
  const res = await postJson('/api/generate', {
    model: model || config.ollama.primaryModel,
    prompt,
    system,
    images,
    stream: true,
    keep_alive: '60m',
    options: {
      temperature,
      num_ctx: 4096,
      num_predict: 700,
    },
  }, timeoutMs)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  let finalModel = model || config.ollama.primaryModel

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      const data = JSON.parse(line)
      finalModel = data.model || finalModel
      const delta = data.response || ''
      if (delta) {
        answer += delta
        await onDelta(delta)
      }
    }
  }

  return { answer: answer.trim(), model: finalModel }
}
