# 81 · TTS 长文本分段合成 + 超时与健壮性增强

> 状态：✅ 完成（Claude 实施，2026-06-15~16 遗留改动后补工单）
> 范围：`tts/tts_server.py`、`backend/src/modules/ai/services/tts.service.js`、
> `app/lib/core/tts_service.dart`、`app/lib/core/api_client.dart`
> 关联：[79-AI回答语音播报TTS.md](79-AI回答语音播报TTS.md) 的后续增强批。

## 目标

让平台语音播报能稳定合成**较长 AI 回答**（AI 文本动辄数百字），并在合成耗时、引擎繁忙、
客户端中途断开等情况下不崩、不超时、有日志可排查。

## 背景

doc 79 落地的 TTS sidecar 单次整段合成长文本时：① 整段一次 `create` 耗时长，前端 30s 超时易截断；
② onnxruntime session 串行锁无超时，繁忙时请求悬挂；③ 客户端取消播报断开连接时 `wfile.write`
抛 BrokenPipe 噪声；④ 中文文本走 `Content-Type: application/json`（无 charset）有乱码风险。

## 改动清单

**`tts/tts_server.py`**：
- `split_text()`：按句末标点（。！？；等）切句，超长句再按软标点（，、：空格）二次切，
  单块上限 `CHUNK_CHARS=120`；逐块合成后用 `np.concatenate` 拼接，块间插 `CHUNK_GAP_SECONDS=0.12s`
  静音，自然停顿。
- `create_audio()`：`_lock.acquire(timeout=LOCK_TIMEOUT_SECONDS=20)`，繁忙超时抛 `TimeoutError`
  而非无限等待。
- 入参防护：`MAX_TEXT_CHARS=1000` 超长返 400；空文本返 400/ValueError。
- 合成前后打 `[tts] synth start/done`（字符数 / 分块数 / 字节 / 耗时）日志；异常打 `[tts] synth error`。
- `wfile.write` 包 try，吞 `BrokenPipeError/ConnectionAbortedError`（客户端提前断开不报错）。
- 以上阈值均可用环境变量覆盖（`TTS_CHUNK_CHARS` / `TTS_CHUNK_GAP_SECONDS` / `TTS_LOCK_TIMEOUT_SECONDS`
  / `TTS_MAX_TEXT_CHARS`）。

**`backend/src/modules/ai/services/tts.service.js`**：`synthSpeech` 默认 `timeoutMs` 30000 → 90000。

**`app/lib/core/tts_service.dart`**：调 `/ai/tts` 的 `postBytes` 超时 → 90s（与后端对齐，容纳长文本分段合成）。

**`app/lib/core/api_client.dart`**：`_headers` 的 `Content-Type` 加 `; charset=utf-8`，避免中文请求体乱码。

> 注：本批的 App 侧播报态 UI（`ai_chat_page.dart` 的「正在生成」态 + 失败 toast）因与 docs/80 同文件，
> 已随 [80 提交](80-AI聊天页历史图片回显与场景条移除.md) 一并落地。

## 接口契约

无新增/变更路径，沿用 doc 79：`POST /api/v1/ai/tts`（body `{text, voice?, speed?}` → `audio/wav`）。
仅行为增强：文本上限 1000 字、长文本内部分段合成。

## 验收

- `python -c "import ast; ast.parse(...)"` 语法通过；`node --check tts.service.js` 通过；`flutter analyze lib` 全绿（已过）。
- 端到端实测（**待做**，需 sidecar + 后端在跑）：POST 一段数百字中文 → 200 audio/wav、日志显示
  `chunks>1`、音频连续可播；超长(>1000)返 400。

## 不在范围内

- 端上离线 TTS / 流式分块返回（当前一次性返完整 WAV）。
- 音色 / 语速调参（沿用 doc 79 默认 `zf_xiaobei`）。

## 实施备注

- 本批为 2026-06-15 TTS 落地（doc 79）后的健壮性遗留改动，2026-06-16 后补本工单并提交。
- 验证：语法/分析三项全绿；长文本端到端真机实测尚未做（需起 sidecar 11435 + 后端 8000）。
