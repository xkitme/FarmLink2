"""本地 Kokoro 中文 TTS 常驻服务(仿 ollama 的本地 sidecar)。

- 启动时一次性加载 Kokoro onnx 模型,常驻内存。
- POST /tts   body: {"text": "...", "voice": "zf_xiaobei", "speed": 1.0}
              resp: audio/wav (PCM16)
- GET  /health -> {"status":"ok","loaded":true}

完全离线:模型文件 kokoro-v1.0.onnx / voices-v1.0.bin 与本脚本同目录。
后端通过 /ai/tts 代理到本服务;App 不直连本服务。
"""
import io
import json
import os
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from misaki import zh

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("TTS_PORT", "11435"))
DEFAULT_VOICE = os.environ.get("TTS_VOICE", "zf_xiaoxiao")  # 中文女声
MODEL = os.path.join(HERE, "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "voices-v1.0.bin")
MAX_TEXT_CHARS = int(os.environ.get("TTS_MAX_TEXT_CHARS", "1000"))
CHUNK_CHARS = int(os.environ.get("TTS_CHUNK_CHARS", "120"))
CHUNK_GAP_SECONDS = float(os.environ.get("TTS_CHUNK_GAP_SECONDS", "0.12"))
LOCK_TIMEOUT_SECONDS = float(os.environ.get("TTS_LOCK_TIMEOUT_SECONDS", "20"))

print("[tts] loading Kokoro model + 中文 G2P ...", flush=True)
_kokoro = Kokoro(MODEL, VOICES)
# Kokoro 自带的 espeak G2P 不支持中文;改用官方 misaki[zh] 拼音音素,
# 再以 is_phonemes=True 喂模型(Kokoro 中文正是用这套音素训练的)。
_g2p = zh.ZHG2P()
_lock = threading.Lock()  # onnxruntime session 串行化,避免并发踩同一 session
print(f"[tts] ready on 127.0.0.1:{PORT} (voice={DEFAULT_VOICE})", flush=True)


def split_text(text: str, max_chars: int = CHUNK_CHARS) -> list[str]:
    text = re.sub(r"\s+", " ", text.strip())
    if len(text) <= max_chars:
        return [text] if text else []
    parts = re.findall(r"[^。！？!?；;\n]+[。！？!?；;]?", text) or [text]
    chunks: list[str] = []
    soft_marks = "，,、：: "
    for part in parts:
        part = part.strip()
        while len(part) > max_chars:
            cut = max(part.rfind(mark, 0, max_chars + 1) for mark in soft_marks)
            if cut < max_chars // 2:
                cut = max_chars
            chunk = part[: cut + 1].strip()
            if chunk:
                chunks.append(chunk)
            part = part[cut + 1 :].strip()
        if part:
            chunks.append(part)
    return chunks


def create_audio(phonemes: str, voice: str, speed: float):
    if not _lock.acquire(timeout=LOCK_TIMEOUT_SECONDS):
        raise TimeoutError("TTS engine busy")
    try:
        return _kokoro.create(
            phonemes, voice=voice, speed=speed, is_phonemes=True
        )
    finally:
        _lock.release()


def synth_wav(text: str, voice: str, speed: float) -> bytes:
    chunks = split_text(text)
    if not chunks:
        raise ValueError("empty text")
    all_samples = []
    sr_out = None
    for index, chunk in enumerate(chunks):
        out = _g2p(chunk)
        phonemes = out[0] if isinstance(out, (tuple, list)) else out
        samples, sr = create_audio(phonemes, voice, speed)
        sr_out = sr if sr_out is None else sr_out
        all_samples.append(samples)
        if index != len(chunks) - 1 and CHUNK_GAP_SECONDS > 0:
            all_samples.append(
                np.zeros(int(sr * CHUNK_GAP_SECONDS), dtype=samples.dtype)
            )
    samples = np.concatenate(all_samples) if len(all_samples) > 1 else all_samples[0]
    sr = sr_out or 24000
    buf = io.BytesIO()
    sf.write(buf, samples, sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/health"):
            return self._json(200, {"status": "ok", "loaded": True})
        self._json(404, {"error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/tts"):
            return self._json(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(n) or b"{}")
            text = (data.get("text") or "").strip()
            if not text:
                return self._json(400, {"error": "empty text"})
            if len(text) > MAX_TEXT_CHARS:
                return self._json(
                    400, {"error": f"text too long (max {MAX_TEXT_CHARS})"}
                )
            voice = data.get("voice") or DEFAULT_VOICE
            speed = float(data.get("speed") or 1.0)
            t0 = time.time()
            print(
                f"[tts] synth start chars={len(text)} chunks={len(split_text(text))} voice={voice}",
                flush=True,
            )
            wav = synth_wav(text, voice, speed)
            print(
                f"[tts] synth done bytes={len(wav)} elapsed={time.time() - t0:.2f}s",
                flush=True,
            )
        except Exception as e:  # noqa
            print(f"[tts] synth error: {e}", flush=True)
            return self._json(500, {"error": str(e)})
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(wav)))
        self.end_headers()
        try:
            self.wfile.write(wav)
        except (BrokenPipeError, ConnectionAbortedError):
            print("[tts] client disconnected before audio was written", flush=True)

    def log_message(self, *args):
        pass  # 静音默认访问日志


if __name__ == "__main__":
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
