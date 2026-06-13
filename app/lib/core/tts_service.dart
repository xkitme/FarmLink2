import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';

/// 中文文本朗读服务（TTS）。封装初始化、朗读、停止与「当前朗读哪条」的状态。
///
/// 主要供适老模式下点击 AI 回答气泡朗读使用：
/// - 中文发音（locale `zh-CN`），语速放慢一档便于长辈听清。
/// - 不可用时静默降级，不抛异常、不崩溃。
/// - 通过 [speakingId] 标识当前正在朗读的内容，便于 UI 高亮/切换图标。
class TtsService {
  TtsService._();

  static final FlutterTts _tts = FlutterTts();
  static bool _configured = false;
  static String? _speakingId;

  /// 当前正在朗读的内容标识（无朗读时为 null）。
  static String? get speakingId => _speakingId;
  static bool get isSpeaking => _speakingId != null;

  static Future<void> _ensureConfigured() async {
    if (_configured) return;
    _configured = true;
    try {
      await _tts.setLanguage('zh-CN');
      await _tts.setSpeechRate(0.45);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);
      _tts.setCompletionHandler(() => _speakingId = null);
      _tts.setCancelHandler(() => _speakingId = null);
      _tts.setErrorHandler((_) => _speakingId = null);
    } catch (_) {
      // 配置失败不致命：朗读时再降级处理。
    }
  }

  /// 朗读指定文本。[id] 用于标记「这一条」是否在朗读中。
  /// 返回 true 表示已开始朗读，false 表示不可用/失败（已优雅降级）。
  static Future<bool> speak(String text, {required String id}) async {
    final content = text.trim();
    if (content.isEmpty) return false;
    await _ensureConfigured();
    try {
      await _tts.stop();
      _speakingId = id;
      final result = await _tts.speak(content);
      // 部分平台返回 0/1，部分返回 null；只要没抛异常即视为已发起。
      if (result == 0) {
        _speakingId = null;
        return false;
      }
      return true;
    } catch (_) {
      _speakingId = null;
      return false;
    }
  }

  /// 停止朗读。
  static Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
    _speakingId = null;
  }
}
