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
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import soundfile as sf
from kokoro_onnx import Kokoro
from misaki import zh

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("TTS_PORT", "11435"))
DEFAULT_VOICE = os.environ.get("TTS_VOICE", "zf_xiaobei")  # 中文女声
MODEL = os.path.join(HERE, "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "voices-v1.0.bin")

print("[tts] loading Kokoro model + 中文 G2P ...", flush=True)
_kokoro = Kokoro(MODEL, VOICES)
# Kokoro 自带的 espeak G2P 不支持中文;改用官方 misaki[zh] 拼音音素,
# 再以 is_phonemes=True 喂模型(Kokoro 中文正是用这套音素训练的)。
_g2p = zh.ZHG2P()
_lock = threading.Lock()  # onnxruntime session 串行化,避免并发踩同一 session
print(f"[tts] ready on 127.0.0.1:{PORT} (voice={DEFAULT_VOICE})", flush=True)


def synth_wav(text: str, voice: str, speed: float) -> bytes:
    out = _g2p(text)
    phonemes = out[0] if isinstance(out, (tuple, list)) else out
    with _lock:
        samples, sr = _kokoro.create(
            phonemes, voice=voice, speed=speed, is_phonemes=True
        )
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
            voice = data.get("voice") or DEFAULT_VOICE
            speed = float(data.get("speed") or 1.0)
            wav = synth_wav(text, voice, speed)
        except Exception as e:  # noqa
            return self._json(500, {"error": str(e)})
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(wav)))
        self.end_headers()
        self.wfile.write(wav)

    def log_message(self, *args):
        pass  # 静音默认访问日志


if __name__ == "__main__":
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
