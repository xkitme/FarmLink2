import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';

/// 中文文本朗读服务（TTS）。
///
/// **改用设备本地（离线）TTS**：走 `flutter_tts`（Android 原生 TextToSpeech /
/// iOS AVSpeechSynthesizer / web SpeechSynthesis）。相比旧的后端 Kokoro sidecar
/// 方案——本机 Kokoro CPU 合成 RTF≈3，整段长回答又慢又「生成一句卡一句」，且强依赖
/// 后端 + Python sidecar 常驻——本地 TTS **即时出声、完全离线、不依赖后端**，由系统
/// 引擎自身做排队与连读，没有分段空档。
///
/// 代价：音色为设备自带中文嗓子（非 Kokoro 统一音色）；离线可用性取决于设备是否装了
/// 中文语音数据（Android 多数预装 Google TTS 中文离线包）。不可用时静默降级返回 false。
///
/// - [speakingId] 标识当前正在朗读的内容，便于 UI 高亮/切换图标。
/// - 保持与旧实现一致的 API：[speak] / [stop] / [speakingId] / [isSpeaking]。
class TtsService {
  TtsService._();

  static final FlutterTts _tts = FlutterTts();
  static bool _wired = false;
  static String? _speakingId;
  // 防并发：切到新朗读时自增；旧 utterance 的完成/取消回调只在仍是当前序号时清状态。
  static int _seq = 0;

  /// 当前正在朗读的内容标识（无朗读时为 null）。
  static String? get speakingId => _speakingId;
  static bool get isSpeaking => _speakingId != null;

  static Future<void> _ensureWired() async {
    if (_wired) return;
    _wired = true;
    try {
      await _tts.setLanguage('zh-CN');
      await _tts.setSpeechRate(0.5); // Android 上 0.5≈正常语速
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);
      // speak() 不阻塞到播完：立即返回、用回调维护 speakingId。
      await _tts.awaitSpeakCompletion(false);
    } catch (_) {
      // 引擎设置失败不致命，后续 speak 仍可尝试。
    }
    _tts.setCompletionHandler(_clear);
    _tts.setCancelHandler(_clear);
    _tts.setErrorHandler((_) => _clear());
  }

  static void _clear() => _speakingId = null;

  /// 朗读前把 Markdown 清成口播纯文本，避免把 `**`、`#`、`-`、`` ` `` 等符号念出来。
  static String _plainText(String md) {
    var t = md;
    // 代码块 ```...``` → 去围栏留内容
    t = t.replaceAll(RegExp(r'```[a-zA-Z]*\n?'), ' ');
    // 图片 ![alt](url) → alt；链接 [text](url) → text
    t = t.replaceAllMapped(RegExp(r'!\[([^\]]*)\]\([^)]*\)'), (m) => m[1] ?? '');
    t = t.replaceAllMapped(RegExp(r'\[([^\]]*)\]\([^)]*\)'), (m) => m[1] ?? '');
    // 行内代码 `code` → code
    t = t.replaceAllMapped(RegExp(r'`([^`]*)`'), (m) => m[1] ?? '');
    // 加粗/斜体标记 ** __ * _ → 去掉（保留文字）
    t = t.replaceAll(RegExp(r'(\*\*|__|\*|_)'), '');
    // 标题井号、引用 >、列表项符号（行首 - * + 或 1. ）、分隔线
    t = t.replaceAll(RegExp(r'^\s{0,3}#{1,6}\s*', multiLine: true), '');
    t = t.replaceAll(RegExp(r'^\s{0,3}>\s?', multiLine: true), '');
    t = t.replaceAll(RegExp(r'^\s*([-*+]|\d+[.、])\s+', multiLine: true), '');
    t = t.replaceAll(RegExp(r'^\s*([-*_]\s*){3,}\s*$', multiLine: true), ' ');
    // 表格竖线 → 顿号；多余空白合并
    t = t.replaceAll('|', ' ');
    t = t.replaceAll(RegExp(r'[ \t]+'), ' ');
    t = t.replaceAll(RegExp(r'\n{2,}'), '\n');
    return t.trim();
  }

  /// 朗读指定文本。[id] 用于标记「这一条」是否在朗读中。
  /// 返回 true 表示已开始朗读，false 表示不可用/失败。
  static Future<bool> speak(String text, {required String id}) async {
    final content = _plainText(text);
    if (content.isEmpty) return false;
    await _ensureWired();
    final mySeq = ++_seq;
    try {
      await _tts.stop(); // 打断上一条
    } catch (_) {}
    if (mySeq != _seq) return false;
    _speakingId = id;
    try {
      // flutter_tts.speak 成功返回 1；引擎自身负责长文本排队与连读。
      final result = await _tts.speak(content);
      if (mySeq != _seq) return false;
      if (result == 0) {
        _speakingId = null;
        return false;
      }
      return true;
    } catch (_) {
      if (mySeq == _seq) _speakingId = null;
      return false;
    }
  }

  /// 停止朗读。
  static Future<void> stop() async {
    _seq++; // 作废进行中的朗读，回调不再清新状态
    _speakingId = null;
    try {
      await _tts.stop();
    } catch (_) {}
  }
}
