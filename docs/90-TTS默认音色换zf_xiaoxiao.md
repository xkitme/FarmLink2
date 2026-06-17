# 分段 90 — TTS 默认中文音色由 zf_xiaobei 改为 zf_xiaoxiao

> 用户反馈默认女声 `zf_xiaobei` 有口音；本会话用 Kokoro voices-v1.0.bin 内 8 个中文嗓子合成同一句话给用户试听，用户挑定 `zf_xiaoxiao`。本段只改默认音色（一行级配置），不换引擎、不改接口。

## 一、目标

- 把本地 Kokoro TTS 的默认中文音色从 `zf_xiaobei` 换成 `zf_xiaoxiao`。

## 二、背景

- 当前 TTS 是本地离线 Kokoro，8 个中文嗓子（女声 `zf_xiaobei/zf_xiaoni/zf_xiaoxiao/zf_xiaoyi`、男声 `zm_yunjian/zm_yunxi/zm_yunxia/zm_yunyang`）共用同一模型、仅说话人不同。
- 生效路径：App 发 `/ai/tts` 不带 voice，后端 `tts.service.js` 用 `config.tts.voice` 填给 sidecar（`tts_server.py` 的 `DEFAULT_VOICE` 仅作请求未带 voice 时的兜底）。故 App 实际音色由**后端 config** 决定，两处一并改保持一致。

## 三、改动

- `backend/src/config/index.js`：`tts.voice` 默认值 `zf_xiaobei` → `zf_xiaoxiao`（仍可被环境变量 `TTS_VOICE` 覆盖）。
- `tts/tts_server.py`：`DEFAULT_VOICE` 默认值 `zf_xiaobei` → `zf_xiaoxiao`。

## 四、契约

- 接口、引擎、依赖均不变；仅默认音色变更。`TTS_VOICE` 环境变量优先级最高，可随时覆盖。

## 五、验收

- 重启 sidecar：`[tts] ready on 127.0.0.1:11435 (voice=zf_xiaoxiao)`。
- 重启后端（纯 `node src/server.js` 不自动 reload，需手动重启）后：
  - `GET /ai/tts/status` → `voice: "zf_xiaoxiao"`。
  - `POST /ai/tts`（App 路径，不带 voice）→ `HTTP 200 audio/wav`，使用新音色。

## 六、不在范围内

- 不换 TTS 引擎（若 `zf_xiaoxiao` 仍嫌口音，再议 Piper/CosyVoice 等更自然的本地引擎，属大改）。
- 不改朗读交互 / 接口 / 限流。

## 七、实施备注

- 试听样本由 sidecar 直接合成 8 个嗓子同句对比得到（`tts_samples/`，已 gitignore，不入库）。
- 生效需同时让后端与 sidecar 重启；本会话已重启二者并端到端验证。
