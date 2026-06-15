import { config } from '../../../config/index.js'

// 代理到本地 Kokoro TTS sidecar（tts/tts_server.py）。完全本地/离线，不依赖外网。

function timeoutSignal(ms) {
  if (AbortSignal.timeout) return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

function baseUrl() {
  return config.tts.baseUrl.replace(/\/+$/, '')
}

/** 合成中文语音，返回 WAV 音频 Buffer（PCM16 / 24kHz / 单声道）。 */
export async function synthSpeech(text, { voice, speed } = {}, timeoutMs = 90000) {
  const res = await fetch(`${baseUrl()}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: voice || config.tts.voice,
      speed: speed || 1.0,
    }),
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.error || ''
    } catch {
      // ignore
    }
    throw new Error(`TTS HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

/** 查询 sidecar 是否在线、模型是否加载（供 /ai/tts/status 与运维探活）。 */
export async function getTtsStatus(timeoutMs = 1500) {
  try {
    const res = await fetch(`${baseUrl()}/health`, { signal: timeoutSignal(timeoutMs) })
    if (!res.ok) return { online: false, loaded: false }
    const data = await res.json()
    return { online: true, loaded: !!data.loaded, voice: config.tts.voice }
  } catch {
    return { online: false, loaded: false }
  }
}
