import 'dart:async';

import 'package:audioplayers/audioplayers.dart';

import 'api_client.dart';

/// 中文文本朗读服务（TTS）。
///
/// 改用**本地 Kokoro 中文 TTS**：调后端 `/ai/tts` 拿到 WAV 音频字节，用
/// audioplayers 播放。相比旧的 `flutter_tts`（借浏览器/系统的嘴，音色不一、
/// 部分平台走云端），这套在 web 与 APK 上用同一把离线中文嗓子，发音一致、
/// 完全本地不依赖外网。
///
/// 主要供适老模式下点击 AI 回答气泡朗读使用：
/// - [speakingId] 标识当前正在朗读的内容，便于 UI 高亮/切换图标。
/// - 不可用时（后端/ sidecar 离线、合成失败）静默降级，返回 false，不抛、不崩。
class TtsService {
  TtsService._();

  static final AudioPlayer _player = AudioPlayer();
  static String? _speakingId;
  static bool _wired = false;
  static int _seq = 0;

  /// 当前正在朗读的内容标识（无朗读时为 null）。
  static String? get speakingId => _speakingId;
  static bool get isSpeaking => _speakingId != null;

  static void _ensureWired() {
    if (_wired) return;
    _wired = true;
    // 播放自然结束 → 清空朗读态，让 UI 图标复位。
    _player.onPlayerComplete.listen((_) => _speakingId = null);
  }

  /// 朗读指定文本。[id] 用于标记「这一条」是否在朗读中。
  /// 返回 true 表示已开始播放，false 表示不可用/失败（已优雅降级）。
  static Future<bool> speak(String text, {required String id}) async {
    final content = text.trim();
    if (content.isEmpty) return false;
    _ensureWired();
    final mySeq = ++_seq; // 防并发：合成期间又点了别条时，丢弃过期结果
    try {
      await _player.stop();
      final bytes = await ApiClient.postBytes(
        '/ai/tts',
        body: {'text': content},
        timeout: const Duration(seconds: 90),
      );
      if (bytes.isEmpty || mySeq != _seq) {
        if (mySeq == _seq) _speakingId = null;
        return false;
      }
      _speakingId = id;
      await _player.play(BytesSource(bytes, mimeType: 'audio/wav'));
      return true;
    } catch (_) {
      if (mySeq == _seq) _speakingId = null;
      return false;
    }
  }

  /// 停止朗读。
  static Future<void> stop() async {
    _seq++; // 作废进行中的合成请求
    try {
      await _player.stop();
    } catch (_) {}
    _speakingId = null;
  }
}
