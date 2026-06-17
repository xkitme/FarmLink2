# 分段 89 — 文字转语音（TTS）任何情况可用 + `npm run dev` 同时拉起 TTS sidecar

> 用户两点诉求：① AI 回答的「点按朗读」不该只在「适老模式」下才有，**任何情况都能文字转语音**；② `npm run dev` 希望**同时**把本地 TTS sidecar 一起起起来，省得单独开。本段只动朗读门控与 dev 启动脚本，不改 TTS 引擎/接口。

## 一、目标

- 去掉 AI 聊天页 AI 文本回答气泡「点按朗读」的**适老模式门控**，让任何用户、任何情况都可点按朗读 / 停止。
- `npm run dev` 在原有 backend + admin 两进程基础上，**再并行拉起本地 Kokoro TTS sidecar**（端口 11435），且对缺失环境（无 `.venv`/模型）友好跳过、不拖垮后端。

## 二、背景

- 「为什么现在提示语音播报不可用」：根因是 **TTS sidecar 进程没起**（`ai_chat_page.dart` 在 `/ai/tts` 失败时弹「语音播报暂时不可用，请稍后重试」）。TTS 引擎是本地离线 Kokoro，能一直可用，但它是独立进程（11435），必须被拉起来；此前 `dev` 脚本只起 backend+admin，sidecar 要靠 `scripts/start-local.ps1` 或手动起 —— 用户单独 `npm run dev` 时就没有它。
- 朗读能力此前写死 `speakable = elderMode && ...`（仅适老模式可朗读），与用户「任何情况都能」预期不符。

## 三、改动

### 1. 朗读门控（`app/lib/pages/ai/ai_chat_page.dart`）

- `_textBotBubble`：`speakable` 去掉 `elderMode &&`，改为 `!msg.streaming && msg.text.trim().isNotEmpty` —— 非流式、有文本的 AI 气泡一律可朗读。
- 移除随之失效的 `context.watch<ElderModeState>()` 及 `import '../../core/elder_mode.dart'`；`provider` 包在本文件仅此一处使用，import 一并移除（其余 ImageProvider / TickerProvider 为 Flutter SDK，非 provider 包）。
- 朗读交互（点按朗读 / 正在生成 / 点按停止、`_toggleSpeak`、`TtsService`）逻辑不变。

### 2. dev 同启 TTS（`backend/package.json` + 新增 `backend/scripts/start-tts.mjs`）

- 新增 `scripts/start-tts.mjs`：解析 `../tts`，校验 `.venv` python 与 `kokoro-v1.0.onnx`；缺失则打印友好提示并 `exit 0`（不影响 backend/admin）；存在则 `spawn` python `tts_server.py`（stdio 继承、转发 SIGINT/SIGTERM、`TTS_PORT` 默认 11435）。
- `package.json` scripts：
  - `dev` 增加第三进程：`concurrently -n backend,admin,tts -c bgBlue,bgGreen,bgMagenta "nodemon src/server.js" "npm run dev --prefix admin" "npm run dev:tts"`。
  - 新增 `dev:tts`: `node scripts/start-tts.mjs`。
- `concurrently` 已是现成 devDependency，无需新装。未用 `-k`，故 tts 跳过/退出不会连带杀掉 backend。

## 四、契约

- TTS 接口不变：`POST /api/v1/ai/tts`（audio/wav）、`GET /api/v1/ai/tts/status`；引擎仍是本地 Kokoro（默认音色 `zf_xiaobei`，本段未改音色）。
- App 行为：TTS sidecar 不在时 `/ai/tts` 报错，气泡点按朗读静默降级 + toast，不崩。
- 无新增路由、无后端接口改动、无新依赖。

## 五、验收

- `dart format` + `flutter analyze lib/pages/ai/ai_chat_page.dart` → `No issues found!`。
- `flutter build web --no-web-resources-cdn --no-tree-shake-icons` → 成功。
- `node --check scripts/start-tts.mjs` → 通过；`npm run dev:tts` 实测拉起 sidecar（`[tts] ready on 127.0.0.1:11435`），端到端 `POST /ai/tts` 返回 `HTTP 200 audio/wav`。
- ⚠️ 朗读气泡「点按朗读」的浏览器实测本轮因 Playwright 工具断连未做：改动为「删除一个 elderMode 条件」，analyze 干净、TTS 端到端可用；建议下次 Playwright 恢复后在非适老账号开 `/ai` 确认问候气泡即显示「点按朗读」并可播放。

## 六、不在范围内

- 不改 TTS 引擎 / 音色 / 接口（换音色是另议：`tts.voice` / `DEFAULT_VOICE` 一行配置，用户正在试听 8 个 Kokoro 中文嗓子后再定）。
- 不改适老模式本身（全局字号放大等仍由适老开关控制）。
- 不动 `start-local.ps1`（它本就起 sidecar）。

## 七、实施备注

- 「不可用」当场处置：本会话发现 11435 未监听，先手动起 sidecar 验证 `/ai/tts` 恢复 200，再做 dev 脚本集成，使之后 `npm run dev` 自动带上。
- 若用户仍只单独跑 `npm run dev:backend`，则不含 sidecar —— 需要 TTS 时用 `npm run dev`（带 tts）或 `npm run dev:tts` 单起。
