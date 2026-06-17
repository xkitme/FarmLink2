// DeepSeek 云端大模型调用（OpenAI 兼容 /chat/completions）。
// 语音助手用 json 模式；主问答用纯文本，支持 SSE 流式逐字输出。
// 凭证由调用方从运行时配置传入（见 assistant-config.service.js）。

function timeoutSignal(ms) {
  if (AbortSignal.timeout) return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

/**
 * @param {object} p
 * @param {string} p.apiKey     DeepSeek API Key
 * @param {string} p.baseUrl    接口根地址（默认 https://api.deepseek.com）
 * @param {string} p.model      模型名
 * @param {string} p.system     system 提示词
 * @param {string} p.prompt     user 内容
 * @param {number} [p.temperature]
 * @param {boolean} [p.json]    true=要求严格 JSON 输出（response_format）
 * @param {function} [p.onDelta] 提供则走流式，逐段回调增量文本
 * @param {number} [p.timeoutMs]
 * @returns {Promise<{text:string, model:string}>}
 */
export async function deepseekGenerate({
  apiKey,
  baseUrl,
  model,
  system,
  prompt,
  temperature = 0.2,
  json = false,
  thinking = false, // 默认非思考模式（快 ~2x，适合短指令）；true=开启思考模式（更强但更慢）
  onDelta = null,
  timeoutMs = 60000,
}) {
  if (!apiKey) throw new Error('deepseek-api-key-missing')
  const base = String(baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')
  const stream = typeof onDelta === 'function'

  const body = {
    model,
    temperature,
    stream,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ],
  }
  if (json) body.response_format = { type: 'json_object' }
  // DeepSeek V4（v4-flash/v4-pro）思考开关：deepseek-chat/-reasoner 弃用后的统一控制方式。
  // 关闭思考可避免推理吃光 token 导致 content 为空，并显著降低延迟。
  if (!thinking) body.thinking = { type: 'disabled' }

  // 连接到 DeepSeek 前的建连阶段加重试：吸收网络抖动 / undici 复用死连接
  // （"fetch failed"）以及对方 429/5xx 限流繁忙；4xx 配置错（key/模型）不重试。
  // 流式增量在 res.ok 校验之后才读取，此处重试不会重复吐字。
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
  const maxAttempts = 3
  let res
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Connection: 'close', // 不复用 keep-alive 连接，规避对端关闭后复用导致的 fetch failed
        },
        body: JSON.stringify(body),
        signal: timeoutSignal(timeoutMs),
      })
    } catch (err) {
      // 网络/连接级失败（fetch failed、连接重置、超时）→ 退避重试
      lastErr = new Error(`DeepSeek 连接失败：${err.message}`)
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
        continue
      }
      throw lastErr
    }
    if (res.ok) break
    // 非 2xx：可重试状态退避重试，其余（4xx 配置错）立即抛出含详情
    let detail = `HTTP ${res.status}`
    try {
      const errJson = await res.json()
      detail = errJson?.error?.message || detail
    } catch {
      // 保留 HTTP 状态码
    }
    if (RETRYABLE_STATUS.has(res.status) && attempt < maxAttempts) {
      lastErr = new Error(`DeepSeek ${detail}`)
      await new Promise((r) => setTimeout(r, 400 * attempt))
      continue
    }
    throw new Error(`DeepSeek ${detail}`)
  }

  if (!stream) {
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('deepseek-empty-content')
    return { text: content, model: data?.model || model }
  }

  // 流式：解析 OpenAI 兼容 SSE（行以 "data: " 开头，[DONE] 结束）。
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      let parsed
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }
      const delta = parsed?.choices?.[0]?.delta?.content || ''
      if (delta) {
        answer += delta
        await onDelta(delta)
      }
    }
  }
  if (!answer.trim()) throw new Error('deepseek-empty-content')
  return { text: answer.trim(), model }
}
