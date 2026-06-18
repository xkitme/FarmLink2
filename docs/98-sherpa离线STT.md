# 分段 98 — STT 换 sherpa-onnx 离线流式识别（语音全链路本地化·下半场）

> doc 97 把 TTS 换成设备本地 `flutter_tts`；本段把 STT 从浏览器/云 `speech_to_text` 换成 **sherpa-onnx 流式 zipformer 中英双语离线识别**，至此语音全链路（识别 + 朗读）在 APK 上**完全本地、不连网络、不依赖后端**。
>
> 硬约束：`sherpa_onnx` 走 `dart:ffi`，**web 无法编译**。已与用户拍板：**APK 走 sherpa 离线真识别；web 保留 `speech_to_text`（浏览器在线）仅作临时测试，不作为功能点**。

## 一、目标

- APK 上语音输入（聊天页/发布/搜索的 mic 弹层 + 语音助手覆盖层）走 sherpa 离线识别，边说边出字、静音停顿自动断句。
- web 端保持现有 `speech_to_text` 行为（不退化、不投入），同一套调用代码按平台分流。
- 模型随 APK 打包，首启拷到应用目录加载；一切失败优雅降级（返回不可用 → 提示改键盘输入），绝不崩。
- 不破坏 web 编译（核心验收点）。

## 二、背景 / 选型

- `speech_to_text` 在 web 走浏览器 Web Speech API（多数云端、离线不可用），在 Android 走系统识别服务（同样多为云端）——与「强制离线」目标背离。
- 模型：`sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20`（流式 transducer，中英双语，内置端点检测）。用户已下到 `_asrdl/`，但首份 `model.tar.bz2`（487MB）**下载截断损坏**（`bzip2 -t` 报 file ends unexpectedly，int8 encoder 正好是归档末位文件被切掉）→ 本段从官方 release 重下完整包 `model_full.tar.bz2`（511,274,346 B，`bzip2 -t` 通过）再解压。
- 选用 int8 权重压体积：encoder.int8(173MB) + decoder.fp32(13.8MB) + joiner.int8(3.2MB) + tokens(56KB)，共 ~190MB。

## 三、改动

### A. 离线 STT 服务（条件导出，保 web 编译）
- 新增 `app/lib/core/offline_stt.dart`：门面，`export 'offline_stt_io.dart' if (dart.library.js_interop) 'offline_stt_stub.dart'`——原生编 io 实现、web 编 stub，**sherpa 的 ffi 永不进 web 编译**。调用方只 import 这一个文件。
- 新增 `offline_stt_io.dart`（原生真实现）：`initBindings()` → 首启把 assets 模型拷到 `getApplicationSupportDirectory()/asr`（已存在且大小一致则跳过）→ `OnlineRecognizer`（transducer/zipformer、greedy_search、enableEndpoint、rule2 静音 1.2s 断句）→ `record` 取 16kHz/单声道/PCM16 流 → `_pcm16ToFloat32` 转换喂 `stream.acceptWaveform` → `while(isReady) decode` → `getResult().text` 实时回调 `onText`；`isEndpoint` 触发时把当前句并入已确定文本、`reset`、回调 `onEndpoint`。开了 echoCancel/noiseSuppress 减少朗读 TTS 时误拾。全程 try/catch 降级。
- 新增 `offline_stt_stub.dart`（web 占位）：`isAvailable()` 恒 false、`start` 返回 false，调用方回落浏览器识别。
- 统一静态 API：`isAvailable()` / `start({onText,onEndpoint})` / `stop()→完整文本` / `dispose()` / `isListening`。

### B. 调用方平台分流
- `app/lib/core/voice_input.dart`（聊天/发布/搜索的 mic 弹层）：`_ensureInitialized` 与 `_VoiceListenSheet` 的 start/stop/cancel/dispose 按 `kIsWeb` 分流——web 用 `_speech`(speech_to_text)，原生用 `OfflineStt`。UI 不变。
- `app/lib/widgets/voice_assistant_layer.dart`（语音助手覆盖层）：`_ensureSpeech`/`_startListening`/`_submitRecognized`/`_deactivate`/`dispose` 同样 `kIsWeb` 分流。原生用 sherpa 的 **endpoint 回调直接触发自动提交**（取代 web 那条静音 Timer，Timer 作兜底保留）。

### C. 模型 assets 与打包
- 解压 int8 四件到 `app/assets/models/asr/`；`pubspec.yaml` `flutter.assets` 加目录 `assets/models/asr/`（声明目录而非单文件——缺 onnx 也能 build，运行时 ASR 优雅不可用）。
- `.gitignore`：`app/assets/models/asr/*.onnx` 不入库（encoder int8 173MB **超 GitHub 单文件 100MB 硬上限**，照 Kokoro `tts/*.onnx` 的 precedent 走交付包/本地保留）；`tokens.txt`(56KB) 照常入库。`_asrdl/`、`docs.zip` 也加入忽略。
- Android `RECORD_AUDIO` 权限与 `RecognitionService` 可见性 doc 94 已补；本段录音用 `record` 同样依赖 `RECORD_AUDIO`（已在）。

## 四、契约

- `OfflineStt` 失败/不可用一律降级（false/空串），不抛不崩；与 `speech_to_text` 调用方语义对齐。
- web 行为不变（仍 speech_to_text）；原生行为：边说边出字 + 静音 ~1.2s 自动断句提交。
- 不改后端、命令白名单、`_executeCommand`、TTS、DeepSeek 配置；助手交互语义不变。

## 五、验收

- `flutter analyze lib`：No issues found。
- `flutter build web --no-tree-shake-icons --no-web-resources-cdn`：Built build\web —— **确认条件导出把 sherpa 的 dart:ffi 挡在 web 编译外**（核心验收：web 不被原生 STT 拖垮）。
- 完整模型重下 `bzip2 -t` 通过；int8 四件解压入 `app/assets/models/asr/`。
- ⚠️ **真识别需 APK 真机**：sherpa 走 ffi + 麦克风，无头浏览器测不到。build APK 前必须先解压模型到 assets（见下）。真机点「mic 弹层识别」与「语音助手聆听→自动断句提交」留 APK 验收。

## 六、不在范围

- web 不接 sherpa（ffi 限制）；web 语音仅临时测试，不投入打磨。
- 不做热词/标点后处理、不做 VAD 独立模块（用识别器自带 endpoint）。
- 不上 Git LFS（改用 gitignore + 交付包/解压脚本，避免比赛机 clone 依赖 lfs）。
- 桌面端（win/linux/mac）sherpa 理论可用但本段聚焦移动端，未专门验。

## 七、实施备注 / 后续

- **build APK 前置步骤**（模型不入库）：
  ```
  tar -xjf _asrdl/model_full.tar.bz2 --strip-components=1 -C app/assets/models/asr \
    sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/encoder-epoch-99-avg-1.int8.onnx \
    sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/decoder-epoch-99-avg-1.onnx \
    sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/joiner-epoch-99-avg-1.int8.onnx \
    sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/tokens.txt
  ```
- **APK 体积**：模型 ~190MB + sherpa 原生 .so（arm64/armeabi/x86/x86_64 四 ABI）。建议打包用 `--target-platform android-arm64`（真机都是 arm64）或 `--split-per-abi` 砍掉多余 ABI 的原生库，避免 APK 过大。
- 教训：大文件下载务必校验完整性（`bzip2 -t` / 比对 Content-Length 511,274,346）——首份 tar 截断 4MB（差 int8 encoder 末尾）解压才暴露，列目录 `head` 提前关流没暴露。
- 端点参数（rule2 1.2s）按对话手感调；嫌断句太急可调大 `rule2MinTrailingSilence`。
