# 79 · AI 回答语音播报（TTS）

> ⚠️ 流程说明：本段为**已实现后补工单**。本会话（2026-06-15）Claude 直接实现并验证，
> 未走「Claude 出工单 → Codex 实施」的标准 review-driven 流程（见 [协作约定.md](协作约定.md)）。
> 后补本文件以保持 docs 一致；后续同类大改回归标准流程。实现细节见文末「实施备注」与
> [claude-memory.md](claude-memory.md) 顶部 2026-06-15 条目。

## 目标（对外口径）
为「适老模式」提供 **AI 回答语音播报**：长辈点 AI 回答气泡即可听读，发音清晰一致。
对外按 [产品呈现口径.md](产品呈现口径.md) —— 称「平台内置语音播报 / 中文语音引擎」，
**不提「本地 / 离线 TTS」**。

## 背景
- 原 `tts_service.dart` 用 `flutter_tts`，借浏览器 `SpeechSynthesis` / 系统 TTS 发声：
  音色因端而异、web 部分浏览器走云端、APK 依赖设备已装中文 TTS 引擎，不可控。
- 需要一把**平台自有、发音一致**的中文嗓子，且不依赖外部 API（契合内网/私有化部署）。

## 架构
平台内置中文语音引擎，**与 Ollama 同为本机常驻服务**：
```
App → 后端 /api/v1/ai/tts → 语音引擎 sidecar(127.0.0.1:11435) → WAV → audioplayers 播放
```
- 引擎：Kokoro（kokoro-onnx，onnxruntime CPU，不依赖 torch）。中文 G2P 用 misaki[zh]
  拼音音素 + `is_phonemes`（Kokoro 自带 espeak 不支持中文）。默认女声 `zf_xiaobei`，24kHz。
- App = 本地后端瘦客户端：**web 与 APK 同样调 /ai/tts**，无需把模型打进 APK。

## 改动清单
**新增 sidecar**：`tts/`（`tts_server.py` 常驻服务、`requirements.txt`、`README.md`、
`start.ps1`；venv 与模型 `.gitignore`）。
**后端**：
- `config/index.js`：+`config.tts`（baseUrl 11435 / 默认 voice）。
- `modules/ai/services/tts.service.js`：`synthSpeech()` 代理 sidecar 返 Buffer；`getTtsStatus()`。
- `modules/ai/ai.controller.js`：`tts`（返 audio/wav，文本≤1000）、`ttsStatus`。
- `modules/ai/ai.routes.js`：`POST /ai/tts`、`GET /ai/tts/status`。
- `middleware/apiControl.js`：`/ai/tts` 单独限流桶 300/h，不挤占 AI 20/h 配额。
**App**：
- `core/api_client.dart`：+`postBytes()`（按 content-type 辨音频/错误的二进制响应）。
- `core/tts_service.dart`：改调 `/ai/tts` + `audioplayers` 播 WAV，保持同样静态 API
  （`speak/stop/speakingId`），`ai_chat_page.dart` 调用处不变；不可用静默降级。
- `pubspec.yaml`：+`audioplayers ^6.1.0`。

## 接口契约
- `POST /api/v1/ai/tts`（requireAuth）body `{text, voice?, speed?}` → `audio/wav`（PCM16/24kHz/单声道）。
- `GET /api/v1/ai/tts/status` → `{online, loaded, voice}`。

## 验收
1. sidecar：`curl 127.0.0.1:11435/health` → `{"status":"ok","loaded":true}`。
2. 后端端到端：登录拿 token → `POST /ai/tts` → HTTP 200 `audio/wav`、RIFF、峰值非静音、`x-ratelimit-policy: tts`。
3. 浏览器源(5000)→/ai/tts(跨域 8000)：200 audio/wav，`<audio>` readyState4 可解码播放（CORS+鉴权 OK）。
4. `flutter analyze lib` 全绿；`dist/FarmLink.apk` debug 包含 audioplayers、编译通过。
5. 真机/APK：适老模式点 AI 回答气泡听读（需后端+ sidecar 在跑、手机连同 WiFi）。

## 不在范围内
- 端上离线 TTS（sherpa-onnx + 模型进 APK）：仅「真·无后端单机 App」才需要，非当前架构需求。
- 语音输入（STT）：见 #18 / #72，与本段无关。
- TTS 接入一键启动脚本（让 sidecar 随 ollama/后端拉起）：可作后续小段。

## 实施备注（2026-06-15）
- 踩坑：kokoro-onnx 默认 G2P 走 phonemizer+espeak，**espeak 不支持中文**（`language "zh" is not supported`）；
  改 misaki[zh] 拼音音素 + `is_phonemes=True` 解决。CPU 实时率 ~0.25（合成 6.8s 音频 ~1.7s）。
- 验证踩坑：浏览器 `audio.play()` 验证时**真从音箱放出声音吓到用户**——后续浏览器验 TTS 只验
  readyState/duration，不触发 play()。
- APK：`scripts/build-apk.ps1 -ApiBaseUrl http://10.178.46.24:8000 -Mode debug` 已出 `dist/FarmLink.apk`(217M
  debug 胖包，全 ABI，**非 TTS 撑大**)。PowerShell 5.1 把 flutter 的 x86 弃用警告(stderr)当错误，脚本在
  Copy-Item 前 abort，手动补拷即可（待后续给脚本加 stderr 容错）。用户自行改局域网 IP 重打。
- 提交：`da7f466c`（功能）、`78b019dd`（交接簿厘清 APK 结论）等。
