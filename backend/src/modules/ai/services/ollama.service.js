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

/** 查询 Ollama 服务与本地模型列表。 */
export async function getOllamaStatus(timeoutMs = 1500) {
  try {
    const res = await fetch(`${baseUrl()}/api/tags`, { signal: timeoutSignal(timeoutMs) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      online: true,
      baseUrl: config.ollama.baseUrl,
      models: (data.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      })),
      primaryModel: config.ollama.primaryModel,
      visionModel: config.ollama.visionModel,
      embedModel: config.ollama.embedModel,
    }
  } catch (err) {
    return {
      online: false,
      baseUrl: config.ollama.baseUrl,
      models: [],
      primaryModel: config.ollama.primaryModel,
      visionModel: config.ollama.visionModel,
      embedModel: config.ollama.embedModel,
      error: err.message,
    }
  }
}

/** 非流式本地大模型生成。 */
export async function generateText({ prompt, system, model, images, temperature = 0.2, timeoutMs = 90000 }) {
  const started = Date.now()
  const res = await postJson('/api/generate', {
    model: model || config.ollama.primaryModel,
    prompt,
    system,
    images,
    stream: false,
    options: {
      temperature,
      num_ctx: 4096,
      num_predict: 700,
    },
  }, timeoutMs)
  const data = await res.json()
  return {
    answer: String(data.response || '').trim(),
    model: data.model || model || config.ollama.primaryModel,
    totalDurationMs: Date.now() - started,
    raw: data,
  }
}

/** 流式生成，按 Ollama JSONL 响应逐段吐出 delta。 */
export async function streamText({ prompt, system, model, onDelta, images, temperature = 0.2, timeoutMs = 90000 }) {
  const res = await postJson('/api/generate', {
    model: model || config.ollama.primaryModel,
    prompt,
    system,
    images,
    stream: true,
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
