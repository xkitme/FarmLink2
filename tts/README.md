# 本地 Kokoro 中文 TTS sidecar

田园通的离线中文语音合成服务。仿 ollama 的本地常驻服务模式：一次性加载
Kokoro onnx 模型常驻内存，后端通过 `/api/v1/ai/tts` 代理到本服务，App 拿
WAV 音频用 audioplayers 播放。**完全本地、离线，不依赖外网。**

- 引擎：[kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)（onnxruntime / CPU，不拖 torch）
- 中文 G2P：Kokoro 自带 espeak 不支持中文，改用官方 `misaki[zh]` 生成拼音音素，
  再以 `is_phonemes=True` 喂模型（Kokoro 中文正是用这套音素训练的）。
- 默认中文女声 `zf_xiaobei`，24kHz 单声道 WAV。实测 CPU 实时率 ~0.25（合成 6.8s 音频耗 ~1.7s）。

## 端口 / 接口
- 默认 `127.0.0.1:11435`（环境变量 `TTS_PORT` 可改；后端用 `TTS_BASE_URL` 对应）。
- `GET  /health` → `{"status":"ok","loaded":true}`
- `POST /tts`  body `{"text":"...", "voice":"zf_xiaobei", "speed":1.0}` → `audio/wav`

## 首次 setup（开发机联网一次即可）
```powershell
cd tts
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# 下载模型文件到本目录（约 311MB + 27MB）
curl -L -o kokoro-v1.0.onnx  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o voices-v1.0.bin   https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
> `.venv/`、`*.onnx`、`*.bin`、`*.wav` 已在 `.gitignore`，不进库。**离线机部署**：把整个
> `tts/`（含 .venv 与模型文件）拷过去即可，或在目标机重跑上面 setup（需联网一次）。

## 启动（建议先于后端）
```powershell
cd tts; .\start.ps1
```
启动后等日志出现 `[tts] ready on 127.0.0.1:11435` 即就绪。

## 启动顺序
ollama（如需 AI 问答）→ **tts sidecar** → 后端（8000）→ web（5000）。
后端启动不强依赖 sidecar：sidecar 离线时 `/ai/tts` 返错误，App 端静默降级（不朗读、不崩）。

## 可选中文音色（voices-v1.0.bin 内）
- 女声：`zf_xiaobei` `zf_xiaoni` `zf_xiaoxiao` `zf_xiaoyi`
- 男声：`zm_yunjian` `zm_yunxi` `zm_yunxia` `zm_yunyang`

改默认音色：设环境变量 `TTS_VOICE`，或后端 `config.tts.voice`。
