/// 离线语音识别（STT）门面。
///
/// 真实现走 **sherpa-onnx 流式 zipformer 中英双语模型**（完全本地、不依赖网络与后端），
/// 但 sherpa-onnx 用 `dart:ffi`，**web 无法编译**。因此用条件导出：
/// - 原生（Android/iOS/桌面）→ `offline_stt_io.dart`（真识别）。
/// - web → `offline_stt_stub.dart`（恒返回不可用，调用方回落到浏览器 `speech_to_text`）。
///
/// 两个实现暴露同一套静态 API（见下方约定），调用方只 import 本文件即可。
///
/// 约定：
/// - [OfflineStt.isAvailable] 平台原生 + 模型就绪才为 true。
/// - [OfflineStt.start] 开始麦克风流式识别；`onText` 持续回调当前完整文本，
///   `onEndpoint` 在检测到一次静音停顿（一句说完）时回调该句最终文本。
/// - [OfflineStt.stop] 停止并返回完整识别文本。
/// - [OfflineStt.dispose] 释放识别器与麦克风资源。
library;

export 'offline_stt_io.dart' if (dart.library.js_interop) 'offline_stt_stub.dart';
