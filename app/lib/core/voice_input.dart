import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'constants.dart';
import 'offline_stt.dart';
import '../widgets/common.dart';

/// 语音输入辅助：封装「点击说话 → 中文识别 → 回填文本」的全流程。
///
/// 设计要点：
/// - **原生（APK）走 sherpa-onnx 离线识别**（完全本地，不依赖网络/后端）；
///   **web 走浏览器 `speech_to_text`**（临时测试用，非正式功能点）。
/// - 不可用时优雅降级，绝不崩溃。
/// - 通过底部弹层展示聆听状态与实时文字，用户点「完成」确认回填。
class VoiceInput {
  VoiceInput._();

  static final SpeechToText _speech = SpeechToText();
  static bool _initTried = false;
  static bool _available = false;

  /// 惰性初始化语音引擎。返回当前环境是否支持语音识别。
  static Future<bool> _ensureInitialized() async {
    if (_initTried) return _available;
    _initTried = true;
    try {
      _available = kIsWeb
          ? await _speech.initialize(onError: (_) {}, onStatus: (_) {})
          : await OfflineStt.isAvailable();
    } catch (_) {
      _available = false;
    }
    return _available;
  }

  /// 弹出语音输入弹层，识别到的中文文本通过返回值给出（用户取消或失败返回 null）。
  ///
  /// 不直接修改输入框——交由调用方决定回填还是追加，便于用户确认。
  static Future<String?> listen(BuildContext context) async {
    final available = await _ensureInitialized();
    if (!context.mounted) return null;
    if (!available) {
      toast(context, '当前环境暂不支持语音输入，请改用键盘输入', error: true);
      return null;
    }
    return showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: false,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetContext) => const _VoiceListenSheet(),
    );
  }

  static SpeechToText get engine => _speech;
}

class _VoiceListenSheet extends StatefulWidget {
  const _VoiceListenSheet();

  @override
  State<_VoiceListenSheet> createState() => _VoiceListenSheetState();
}

class _VoiceListenSheetState extends State<_VoiceListenSheet> {
  final SpeechToText _speech = VoiceInput.engine;
  String _recognized = '';
  bool _listening = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    try {
      if (kIsWeb) {
        await _speech.listen(
          onResult: (result) {
            if (!mounted) return;
            setState(() => _recognized = result.recognizedWords);
          },
          listenOptions: SpeechListenOptions(
            partialResults: true,
            cancelOnError: true,
            listenMode: ListenMode.dictation,
            localeId: 'zh_CN',
          ),
        );
      } else {
        final ok = await OfflineStt.start(
          onText: (text) {
            if (!mounted) return;
            setState(() => _recognized = text);
          },
        );
        if (!ok) {
          if (mounted) setState(() => _failed = true);
          return;
        }
      }
      if (mounted) setState(() => _listening = true);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  Future<void> _stopAndReturn() async {
    var text = _recognized;
    try {
      if (kIsWeb) {
        await _speech.stop();
      } else {
        text = await OfflineStt.stop();
      }
    } catch (_) {}
    if (!mounted) return;
    text = text.trim();
    Navigator.pop(context, text.isEmpty ? null : text);
  }

  Future<void> _cancel() async {
    try {
      if (kIsWeb) {
        await _speech.cancel();
      } else {
        await OfflineStt.stop();
      }
    } catch (_) {}
    if (mounted) Navigator.pop(context);
  }

  @override
  void dispose() {
    if (kIsWeb) {
      if (_speech.isListening) _speech.stop();
    } else {
      OfflineStt.stop();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.outlineVariant,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 18),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(R.md),
                border: Border.all(color: AppColors.primaryContainer),
              ),
              child: Icon(
                _failed ? Icons.mic_off_outlined : Icons.mic_none,
                color: _failed ? AppColors.outline : AppColors.primary,
                size: 32,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              _failed
                  ? '语音输入未能启动'
                  : _listening
                      ? '正在聆听，请说话...'
                      : '准备中...',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              constraints: const BoxConstraints(minHeight: 56),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(R.sm),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Text(
                _recognized.isEmpty
                    ? (_failed ? '当前环境暂不支持语音输入，请改用键盘输入。' : '识别到的文字会显示在这里')
                    : _recognized,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: _recognized.isEmpty
                      ? AppColors.onSurfaceVariant
                      : AppColors.onSurface,
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _cancel,
                    child: const Text('取消'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _failed ? null : _stopAndReturn,
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('完成'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
