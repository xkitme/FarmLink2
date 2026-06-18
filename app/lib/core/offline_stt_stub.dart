/// web 占位实现：sherpa-onnx 走 dart:ffi，web 无法编译，这里恒返回不可用。
/// web 端语音由调用方回落到浏览器 `speech_to_text`（临时测试用，非正式功能点）。
class OfflineStt {
  OfflineStt._();

  /// web 上离线识别不可用。
  static Future<bool> isAvailable() async => false;

  /// 当前是否在聆听（web 始终 false）。
  static bool get isListening => false;

  /// web 上不启动离线识别，直接返回 false。
  static Future<bool> start({
    required void Function(String text) onText,
    void Function(String text)? onEndpoint,
  }) async =>
      false;

  /// 无识别可停，返回空串。
  static Future<String> stop() async => '';

  /// 无资源可释放。
  static Future<void> dispose() async {}
}
