import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

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
  // 已断句确定下来的文本（多句拼接）+ 当前句的实时文本。
  static String _finalized = '';
  static String _partial = '';

  static void Function(String text)? _onText;
  static void Function(String text)? _onEndpoint;

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
  /// 返回 true 表示已开始；false 表示不可用/无权限/失败（调用方应回落或提示）。
  static Future<bool> start({
    required void Function(String text) onText,
    void Function(String text)? onEndpoint,
  }) async {
    if (_listening) return true;
    final recognizer = await _ensureRecognizer();
    if (recognizer == null) return false;

    try {
      if (!await _recorder.hasPermission()) return false;
    } catch (_) {
      return false;
    }

    _onText = onText;
    _onEndpoint = onEndpoint;
    _finalized = '';
    _partial = '';

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
      _audioSub = audio.listen(
        _onAudioChunk,
        onError: (_) {},
        cancelOnError: false,
      );
      return true;
    } catch (_) {
      await _teardownAudio();
      return false;
    }
  }

  /// 停止识别，返回完整识别文本。
  static Future<String> stop() async {
    _listening = false;
    await _stopRecorder();
    _flushStream();
    final text = _fullText();
    _onText = null;
    _onEndpoint = null;
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
      stream.acceptWaveform(
        samples: _pcm16ToFloat32(bytes),
        sampleRate: _sampleRate,
      );
      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }
      _partial = recognizer.getResult(stream).text;
      _onText?.call(_fullText());

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
      return _recognizer;
    } catch (_) {
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
