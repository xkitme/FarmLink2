# 分段 97 — TTS 从后端 Kokoro sidecar 改回设备本地 flutter_tts（语音全链路本地化·上半场）

> 这是「语音全链路本地离线化」迁移的第一步。doc 94 已诊断出 Kokoro sidecar 朗读慢（CPU RTF≈3、长回答「生成一句卡一句」、且强依赖后端 + Python sidecar 常驻）。本段把 App 的 TTS 从「调后端 `/ai/tts` 拿 Kokoro WAV 用 audioplayers 播」改回**设备自带 TTS 引擎**（`flutter_tts`：Android 原生 TextToSpeech / iOS AVSpeechSynthesizer / web SpeechSynthesis），即时出声、完全离线、不依赖后端，由系统引擎自身排队连读、没有分段空档。
>
> 下半场（doc 98，待做）：STT 从浏览器/云 `speech_to_text` 换成 **sherpa-onnx 流式离线识别**（pubspec 依赖与模型已就位，详见「不在范围」）。

## 一、目标

- App 朗读 AI 回答（聊天页朗读按钮、语音助手 TTS 播报）走设备本地引擎，秒级出声、长回答连续无空档。
- 朗读前清洗 Markdown，避免把 `**`、`#`、`-`、`` ` ``、表格竖线等符号念出来。
- 保持 `TtsService` 既有静态 API（`speak`/`stop`/`speakingId`/`isSpeaking`）不变，调用方零改动。
- 后端不再为 TTS 常驻 Kokoro sidecar。

## 二、背景 / 根因

- doc 94 实测：长时间运行的 Kokoro sidecar 实例劣化，RTF≈3.3，整段长回答又慢又卡；即便新实例 RTF≈0.5，本机 CPU 合成对长文本仍吃力，且要 Python sidecar + 后端常驻、与「离线 on-device」目标背离。
- `flutter_tts` 本就是 Kokoro 方案之前的原 TTS（doc 18/20 一带），这次等于**回归设备引擎 + 补 Markdown 清洗**，而非全新引入。
- Android 11+ 包可见性：不声明 `TTS_SERVICE` 的 `<queries>`，`flutter_tts` 看不到系统 TTS 引擎，离线朗读会静默失败（与 doc 94 给 STT 补 `RecognitionService` 同理）。

## 三、改动

### A. `app/lib/core/tts_service.dart`（重写为 flutter_tts）
- 删 `audioplayers` + `ApiClient.postBytes('/ai/tts')` + 分段切句/预取队列（`_splitIntoChunks`/`_playQueue`/`_fetch` 等全删）。
- 改用 `FlutterTts`：`_ensureWired()` 异步设 `zh-CN` / `speechRate 0.5`(Android≈正常语速) / `volume 1.0` / `pitch 1.0` / `awaitSpeakCompletion(false)`，挂 completion/cancel/error 回调统一 `_clear` 清 `_speakingId`。
- `speak(text, id:)`：先 `_plainText` 清 Markdown → `_tts.stop()` 打断上一条 → `_tts.speak()`（返回 1=成功）；`_seq` 防并发（切到新朗读时自增，旧回调只在仍是当前序号时清状态）。
- 新增 `_plainText(md)`：去代码围栏/行内码、图片链接取 alt/text、去 `** __ * _`、去标题井号/引用/列表项符号/分隔线、表格竖线→空格、合并空白。
- API 完全保持：`speak`/`stop`/`speakingId`/`isSpeaking` 签名不变 → `ai_chat_page.dart`、`voice_assistant_layer.dart` 调用点零改动。

### B. `app/android/app/src/main/AndroidManifest.xml`
- `<queries>` 增 `<intent><action android:name="android.intent.action.TTS_SERVICE"/></intent>`（Android 11+ 才看得到系统 TTS 引擎）。

### C. `backend/package.json`
- `npm run dev` 的 `concurrently` 去掉 `tts` 一路（不再自动起 Kokoro sidecar）。`dev:tts` 脚本定义保留（需要时仍可单独起），后端 `/ai/tts` 端点保留但 App 已不再调用。

## 四、契约

- `TtsService` 对外 API 与语义不变；不可用/失败静默降级返回 false，不抛不崩。
- 后端接口无新增/删除；`/ai/tts` 端点继续存在但成为 App 侧 dead path（不影响其它调用方——全仓已确认 App/后端无其它 `/ai/tts` 调用）。
- 音色改为设备自带中文嗓子（非 Kokoro 统一 `zf_xiaoxiao`）；离线可用性取决于设备是否装中文语音数据（Android 多数预装 Google TTS 中文离线包）。

## 五、验收

- `flutter analyze lib/core/tts_service.dart lib/pages/ai/ai_chat_page.dart lib/widgets/voice_assistant_layer.dart`：No issues found。
- `flutter build web --no-tree-shake-icons --no-web-resources-cdn`：Built build\web（`main.dart.js` 4.07MB release）——确认 pubspec 里新增的 `sherpa_onnx` 依赖（尚未被任何 lib 代码 import）不拖累 web 编译。
- ⚠️ **真朗读需 APK/真机**：`flutter_tts` 在 Android 走系统原生 TextToSpeech，无头浏览器测不到；web 上走 SpeechSynthesis 会真出声，按记忆约定**未触发 `speak()` 验证**（避免突然外放）。真机点「朗读 AI 回答」与语音助手播报留 APK 验收。

## 六、不在范围

- 不在本段做 STT。**sherpa-onnx 离线识别留 doc 98**：`pubspec.yaml` 已加 `sherpa_onnx ^1.13.3 / record / path_provider / path`（lock 已 resolve），模型 `sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20`（流式 zipformer 中英双语，含 int8）已下到 `_asrdl/model.tar.bz2`（487MB，gitignore），但 `lib/` 尚无 sherpa 代码，`voice_input.dart`/`voice_assistant_layer.dart` 仍用 `speech_to_text`。本提交**不含** pubspec 的 sherpa 依赖改动（属 doc 98）。
- 不删后端 `/ai/tts` 端点与 `tts/` sidecar 代码（仅不再自动起）。
- 不改语音助手命令白名单/覆盖层交互/DeepSeek 配置。

## 七、实施备注 / 后续

- sherpa_onnx 走 dart:ffi，**不支持 web**。已与用户拍板：APK 走 sherpa 离线真识别；**web 端语音保留现有 `speech_to_text`（浏览器在线）仅作临时测试，不作为功能点投入**。
- 模型打包策略（用户拍板）：int8 模型**打进 APK assets**，首启拷到应用目录加载（真离线，代价 APK +~100MB）——doc 98 实施。
- 教训延续 doc 94：同一能力别让符号污染口播——Markdown 清洗放在 TtsService 入口集中处理，聊天页/助手共用。
