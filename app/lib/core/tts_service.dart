import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

import 'api_client.dart';

/// 中文文本朗读服务（TTS）。
///
/// 改用**本地 Kokoro 中文 TTS**：调后端 `/ai/tts` 拿到 WAV 音频字节，用
/// audioplayers 播放。相比旧的 `flutter_tts`（借浏览器/系统的嘴，音色不一、
/// 部分平台走云端），这套在 web 与 APK 上用同一把离线中文嗓子，发音一致、
/// 完全本地不依赖外网。
///
/// **分段流式播放**：本地 CPU 合成约等于实时（RTF≈1），整段长回答既慢又会
/// 撞后端超时。改为按句切分——第一句合成完即开播并返回，其余在后台边播边
/// 合成（预取下一句）；每次请求都是短句，首句 ~数秒出声、长回答连续播放、
/// 不再超时。
///
/// - [speakingId] 标识当前正在朗读的内容，便于 UI 高亮/切换图标。
/// - 不可用时（后端/ sidecar 离线、合成失败）静默降级，返回 false，不抛、不崩。
class TtsService {
  TtsService._();

  static final AudioPlayer _player = AudioPlayer();
  static String? _speakingId;
  static bool _wired = false;
  static int _seq = 0;
  // 当前正在播放的这一段的完成信号（自然播完或被 stop 时完成）。
  static Completer<void>? _segDone;

  /// 当前正在朗读的内容标识（无朗读时为 null）。
  static String? get speakingId => _speakingId;
  static bool get isSpeaking => _speakingId != null;

  static void _ensureWired() {
    if (_wired) return;
    _wired = true;
    // 一段播放自然结束 → 放行队列里的下一段。
    _player.onPlayerComplete.listen((_) => _releaseSegment());
  }

  /// 放行/作废当前段的等待（播完、被打断、被停止时调用）。
  static void _releaseSegment() {
    final c = _segDone;
    _segDone = null;
    if (c != null && !c.isCompleted) c.complete();
  }

  /// 朗读指定文本。[id] 用于标记「这一条」是否在朗读中。
  /// 返回 true 表示已开始播放（首句已出声），false 表示不可用/失败。
  /// 其余分段在后台继续，无需调用方等待。
  static Future<bool> speak(String text, {required String id}) async {
    final content = text.trim();
    if (content.isEmpty) return false;
    _ensureWired();
    final mySeq = ++_seq; // 防并发：合成期间又点了别条时，丢弃过期结果
    _releaseSegment(); // 唤醒可能仍在等待的上一条队列，让其尽快退出
    try {
      await _player.stop();
    } catch (_) {}
    final chunks = _splitIntoChunks(content);
    if (chunks.isEmpty) return false;
    try {
      // 首句阻塞合成：拿到即开播，调用方据此从「正在生成」切到「点按停止」。
      final first = await _fetch(chunks.first);
      if (mySeq != _seq) return false;
      if (first.isEmpty) {
        if (mySeq == _seq) _speakingId = null;
        return false;
      }
      _speakingId = id;
      // 其余分段在后台边播边合成，不阻塞调用方。
      unawaited(_playQueue(id, chunks, first, mySeq));
      return true;
    } catch (_) {
      if (mySeq == _seq) _speakingId = null;
      return false;
    }
  }

  /// 顺序播放整条队列：播当前段时预取下一段，尽量无缝衔接。
  static Future<void> _playQueue(
    String id,
    List<String> chunks,
    Uint8List first,
    int mySeq,
  ) async {
    try {
      var bytes = first;
      for (var i = 0; i < chunks.length; i++) {
        if (mySeq != _seq) return;
        // 边播当前段、边合成下一段。
        final nextFuture =
            (i + 1 < chunks.length) ? _safeFetch(chunks[i + 1]) : null;
        if (bytes.isNotEmpty) {
          _speakingId = id;
          await _playAndWait(bytes, mySeq);
          if (mySeq != _seq) return;
        }
        if (nextFuture == null) break;
        bytes = await nextFuture;
      }
    } finally {
      if (mySeq == _seq) _speakingId = null;
    }
  }

  /// 播放一段并等它播完（或被 stop/新朗读打断）。
  static Future<void> _playAndWait(Uint8List bytes, int mySeq) async {
    final done = Completer<void>();
    _segDone = done;
    try {
      await _player.play(BytesSource(bytes, mimeType: 'audio/wav'));
    } catch (_) {
      _releaseSegment();
      return;
    }
    await done.future;
  }

  static Future<Uint8List> _fetch(String text) => ApiClient.postBytes(
        '/ai/tts',
        body: {'text': text},
        // 分段后每次都是短句，60s 远超所需，不会再像整段那样超时。
        timeout: const Duration(seconds: 60),
      );

  /// 合成失败的某一段返回空字节而非抛出，避免一句失败打断整条朗读。
  static Future<Uint8List> _safeFetch(String text) async {
    try {
      return await _fetch(text);
    } catch (_) {
      return Uint8List(0);
    }
  }

  /// 按中文句末标点切句，过长句再按逗号/长度软切；与 sidecar 切分口径一致。
  static List<String> _splitIntoChunks(String text, {int maxChars = 80}) {
    final normalized = text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (normalized.isEmpty) return const [];
    final sentences = RegExp(r'[^。！？!?；;\n]+[。！？!?；;]?').allMatches(normalized);
    final chunks = <String>[];
    const softMarks = '，,、：: ';
    for (final m in sentences) {
      var part = m.group(0)?.trim() ?? '';
      while (part.length > maxChars) {
        var cut = -1;
        for (var i = maxChars; i >= maxChars ~/ 2; i--) {
          if (softMarks.contains(part[i])) {
            cut = i;
            break;
          }
        }
        if (cut < 0) cut = maxChars - 1;
        final head = part.substring(0, cut + 1).trim();
        if (head.isNotEmpty) chunks.add(head);
        part = part.substring(cut + 1).trim();
      }
      if (part.isNotEmpty) chunks.add(part);
    }
    return chunks;
  }

  /// 停止朗读。
  static Future<void> stop() async {
    _seq++; // 作废进行中的合成与队列
    _releaseSegment();
    try {
      await _player.stop();
    } catch (_) {}
    _speakingId = null;
  }
}
