import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter/services.dart' show rootBundle;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:sherpa_onnx/sherpa_onnx.dart' as sherpa;

/// 离线语音识别（原生实现）。
///
/// sherpa-onnx 流式 zipformer 中英双语模型，麦克风经 `record` 取 16kHz/单声道/PCM16
/// 流，转 Float32 喂识别器，边说边出字；内置端点检测（静音停顿）判定一句说完。
/// 完全本地，不连网络、不依赖后端。
///
/// 模型文件随 APK 打包在 `assets/models/asr/`，首次使用时拷到应用支持目录（sherpa
/// 需要文件路径而非 asset bundle）。一切失败（模型缺失/无麦克风权限/引擎异常）均
/// 优雅降级返回 false / 空串，绝不抛出。
class OfflineStt {
  OfflineStt._();

  static const int _sampleRate = 16000;
  static const String _assetDir = 'assets/models/asr';
  // 复制到应用目录的模型文件清单（int8 编码器 + fp32 解码器 + int8 联合网络 + 词表）。
  static const List<String> _modelFiles = [
    'encoder-epoch-99-avg-1.int8.onnx',
    'decoder-epoch-99-avg-1.onnx',
    'joiner-epoch-99-avg-1.int8.onnx',
    'tokens.txt',
  ];

  static sherpa.OnlineRecognizer? _recognizer;
  static sherpa.OnlineStream? _stream;
  static final AudioRecorder _recorder = AudioRecorder();
  static StreamSubscription<Uint8List>? _audioSub;

  static bool _bindingsInited = false;
  static bool _listening = false;
  // 诊断用：统计收到的音频帧与最大振幅，判断麦克风是真有声还是静音（模拟器常喂静音）。
  static int _diagChunks = 0;
  static double _diagMaxAmp = 0;
  // 已断句确定下来的文本（多句拼接）+ 当前句的实时文本。
  static String _finalized = '';
  static String _partial = '';

  static void Function(String text)? _onText;
  static void Function(String text)? _onEndpoint;
  // 「有声但识别不出字」自动结束：检测到声音活动（振幅过阈）后，若 1 秒内仍无任何
  // 识别文字，触发一次 onNoSpeech 让调用方收尾（噪音环境 / 误触发开麦时不空等）。
  static void Function()? _onNoSpeech;
  static Timer? _noSpeechTimer;
  static bool _sawSpeech = false;
  // 归一化 [-1,1] 采样的最大绝对值 > 此值即视为有声音活动（模拟器静音≈0）。
  static const double _noiseAmpThreshold = 0.02;
  static const Duration _noSpeechWindow = Duration(seconds: 1);

  static bool get isListening => _listening;

  /// 平台原生 + 模型可就绪才可用。仅做轻量探测（不真正建识别器），失败返回 false。
  static Future<bool> isAvailable() async {
    try {
      return await _ensureRecognizer() != null;
    } catch (_) {
      return false;
    }
  }

  /// 开始麦克风流式识别。
  /// - [onText]：当前完整文本（已断句 + 当前句实时）持续回调。
  /// - [onEndpoint]：检测到一次静音停顿（一句说完）时回调当前完整文本，便于自动提交。
  /// - [onNoSpeech]：检测到声音活动后 1 秒内仍无任何识别文字时回调一次（噪音/误触发开麦
  ///   场景下让调用方收尾结束）。不传则不启用；出过字后本轮永久关闭，正常说话不受影响。
  /// 返回 true 表示已开始；false 表示不可用/无权限/失败（调用方应回落或提示）。
  static Future<bool> start({
    required void Function(String text) onText,
    void Function(String text)? onEndpoint,
    void Function()? onNoSpeech,
  }) async {
    if (_listening) return true;
    final recognizer = await _ensureRecognizer();
    if (recognizer == null) return false;

    try {
      final granted = await _recorder.hasPermission();
      debugPrint('[STT] hasPermission=$granted');
      if (!granted) return false;
    } catch (e) {
      debugPrint('[STT] hasPermission threw: $e');
      return false;
    }

    _onText = onText;
    _onEndpoint = onEndpoint;
    _onNoSpeech = onNoSpeech;
    _finalized = '';
    _partial = '';
    _diagChunks = 0;
    _diagMaxAmp = 0;
    _sawSpeech = false;
    _noSpeechTimer?.cancel();
    _noSpeechTimer = null;

    try {
      _stream = recognizer.createStream();
      final audio = await _recorder.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: _sampleRate,
          numChannels: 1,
          // TTS 已严格播完再开麦；这里保留原始麦克风信号，避免虚拟机的软件
          // 回声消除/降噪把人声一并压掉。
          echoCancel: false,
          noiseSuppress: false,
          androidConfig: AndroidRecordConfig(
            manageBluetooth: false,
            audioSource: AndroidAudioSource.mic,
          ),
        ),
      );
      _listening = true;
      debugPrint('[STT] recorder.startStream ok, listening');
      _audioSub = audio.listen(
        _onAudioChunk,
        onError: (e) => debugPrint('[STT] audio stream error: $e'),
        cancelOnError: false,
      );
      return true;
    } catch (e) {
      debugPrint('[STT] startStream threw: $e');
      await _teardownAudio();
      return false;
    }
  }

  /// 停止识别，返回完整识别文本。
  static Future<String> stop() async {
    _listening = false;
    _noSpeechTimer?.cancel();
    _noSpeechTimer = null;
    await _stopRecorder();
    _flushStream();
    final text = _fullText();
    _onText = null;
    _onEndpoint = null;
    _onNoSpeech = null;
    await _freeStream();
    return text;
  }

  /// 释放识别器与麦克风（App 退出/页面销毁时调用）。
  static Future<void> dispose() async {
    await _teardownAudio();
    try {
      _recognizer?.free();
    } catch (_) {}
    _recognizer = null;
  }

  // ── 内部 ──────────────────────────────────────────────────────────────

  static String _fullText() {
    final t = (_finalized + _partial).trim();
    return t;
  }

  static void _onAudioChunk(Uint8List bytes) {
    final recognizer = _recognizer;
    final stream = _stream;
    if (recognizer == null || stream == null || !_listening) return;
    try {
      final samples = _pcm16ToFloat32(bytes);
      // 诊断：每 ~25 帧打印一次帧数/最大振幅/当前识别文本。
      // maxAmp≈0 => 麦克风是静音(模拟器没接真麦)；maxAmp>0 但无文本 => sherpa 侧问题。
      var amp = 0.0;
      for (final s in samples) {
        final a = s < 0 ? -s : s;
        if (a > amp) amp = a;
      }
      if (amp > _diagMaxAmp) _diagMaxAmp = amp;
      if (++_diagChunks % 25 == 0) {
        debugPrint(
            '[STT] chunks=$_diagChunks bytes=${bytes.length} maxAmp=${_diagMaxAmp.toStringAsFixed(4)} partial="$_partial"');
      }
      stream.acceptWaveform(
        samples: samples,
        sampleRate: _sampleRate,
      );
      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }
      _partial = recognizer.getResult(stream).text;
      _onText?.call(_fullText());
      _trackNoSpeech(amp);

      if (recognizer.isEndpoint(stream)) {
        // 一句结束：把当前句并入已确定文本，回调端点，重置流接着听下一句。
        final seg = _partial.trim();
        if (seg.isNotEmpty) _finalized = '$_finalized$seg';
        _partial = '';
        recognizer.reset(stream);
        if (seg.isNotEmpty) _onEndpoint?.call(_fullText());
      }
    } catch (_) {
      // 单帧异常不打断整段聆听。
    }
  }

  /// 「有声但无字」自动结束：检测到声音活动后 1 秒仍无识别文字则触发 onNoSpeech。
  /// 一旦出过字（_sawSpeech）即永久关闭本轮该机制，正常说话不受影响。
  static void _trackNoSpeech(double amp) {
    if (_onNoSpeech == null) return;
    if (_fullText().isNotEmpty) {
      // 出字了：标记并撤销待触发的自动结束。
      _sawSpeech = true;
      _noSpeechTimer?.cancel();
      _noSpeechTimer = null;
      return;
    }
    if (_sawSpeech) return;
    // 检测到声音活动且尚无文字：开一个 1 秒窗口，到点仍无字则结束。
    if (amp > _noiseAmpThreshold && _noSpeechTimer == null) {
      _noSpeechTimer = Timer(_noSpeechWindow, () {
        _noSpeechTimer = null;
        if (!_listening || _sawSpeech || _fullText().isNotEmpty) return;
        _onNoSpeech?.call();
      });
    }
  }

  /// PCM16 小端字节流 → [-1,1] Float32 采样。
  static Float32List _pcm16ToFloat32(Uint8List bytes) {
    final n = bytes.length ~/ 2;
    final out = Float32List(n);
    final bd = ByteData.sublistView(bytes);
    for (var i = 0; i < n; i++) {
      out[i] = bd.getInt16(i * 2, Endian.little) / 32768.0;
    }
    return out;
  }

  /// 惰性建识别器（含首次拷贝模型 + initBindings）。失败返回 null。
  static Future<sherpa.OnlineRecognizer?> _ensureRecognizer() async {
    if (_recognizer != null) return _recognizer;
    if (!Platform.isAndroid && !Platform.isIOS) {
      // 桌面端 sherpa 原生库由插件提供，理论可用；这里聚焦移动端，桌面不强求。
    }
    try {
      if (!_bindingsInited) {
        sherpa.initBindings();
        _bindingsInited = true;
      }
      final dir = await _prepareModelDir();
      if (dir == null) return null;
      String path(String name) => p.join(dir, name);

      final config = sherpa.OnlineRecognizerConfig(
        model: sherpa.OnlineModelConfig(
          transducer: sherpa.OnlineTransducerModelConfig(
            encoder: path('encoder-epoch-99-avg-1.int8.onnx'),
            decoder: path('decoder-epoch-99-avg-1.onnx'),
            joiner: path('joiner-epoch-99-avg-1.int8.onnx'),
          ),
          tokens: path('tokens.txt'),
          numThreads: 2,
          modelType: 'zipformer',
          debug: false,
        ),
        decodingMethod: 'greedy_search',
        enableEndpoint: true,
        // 静音停顿超过 ~1.2s（rule2）即判一句结束 → 自动提交手感。
        rule1MinTrailingSilence: 2.4,
        rule2MinTrailingSilence: 1.2,
        rule3MinUtteranceLength: 20,
      );
      _recognizer = sherpa.OnlineRecognizer(config);
      debugPrint('[STT] recognizer ready (model dir=$dir)');
      return _recognizer;
    } catch (e) {
      debugPrint('[STT] recognizer init failed: $e');
      _recognizer = null;
      return null;
    }
  }

  /// 把打包在 assets 的模型拷到应用支持目录，返回该目录路径；任一文件缺失返回 null。
  static Future<String?> _prepareModelDir() async {
    try {
      final base = await getApplicationSupportDirectory();
      final dir = Directory(p.join(base.path, 'asr'));
      if (!await dir.exists()) await dir.create(recursive: true);
      for (final name in _modelFiles) {
        final dest = File(p.join(dir.path, name));
        final data = await rootBundle.load('$_assetDir/$name');
        final expected = data.lengthInBytes;
        // 已存在且大小一致则跳过（避免每次启动重复写大文件）。
        if (await dest.exists() && await dest.length() == expected) continue;
        await dest.writeAsBytes(
          data.buffer.asUint8List(data.offsetInBytes, expected),
          flush: true,
        );
      }
      return dir.path;
    } catch (_) {
      return null;
    }
  }

  static Future<void> _teardownAudio() async {
    _listening = false;
    _noSpeechTimer?.cancel();
    _noSpeechTimer = null;
    await _stopRecorder();
    await _freeStream();
  }

  static Future<void> _stopRecorder() async {
    try {
      await _audioSub?.cancel();
    } catch (_) {}
    _audioSub = null;
    try {
      if (await _recorder.isRecording()) await _recorder.stop();
    } catch (_) {}
  }

  /// 手动停止时把最后一小段音频刷进识别器，否则短句容易还没出 partial 就被释放。
  static void _flushStream() {
    final recognizer = _recognizer;
    final stream = _stream;
    if (recognizer == null || stream == null) return;
    try {
      stream.inputFinished();
      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }
      _partial = recognizer.getResult(stream).text;
    } catch (_) {}
  }

  static Future<void> _freeStream() async {
    try {
      _stream?.free();
    } catch (_) {}
    _stream = null;
  }
}
