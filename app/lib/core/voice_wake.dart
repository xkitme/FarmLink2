import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

/// 语音唤醒（「呼叫唤起」）运行时状态。
///
/// - `enabled`：本地开关，默认关。开启后（仅 APK）悬浮小球可见时后台离线监听唤醒词。
/// - `wakeWords`：唤醒词列表，启动时从后端 `GET /ai/assistant/config` 拉取，失败回落默认。
///
/// 仿 `ElderModeState`：开关存本地 `SharedPreferences`，唤醒词随后端管理台实时配置。
class VoiceWakeState extends ChangeNotifier {
  static const String preferenceKey = 'voice_wake_enabled';
  static const List<String> defaultWakeWords = ['你好小田'];

  bool _enabled = false;
  List<String> _wakeWords = const ['你好小田'];
  bool _initialized = false;

  bool get enabled => _enabled;
  List<String> get wakeWords => _wakeWords;
  bool get initialized => _initialized;

  Future<void> init() async {
    final sp = await SharedPreferences.getInstance();
    _enabled = sp.getBool(preferenceKey) ?? false;
    _initialized = true;
    notifyListeners();
    // 唤醒词从后端拉，失败不影响开关功能（保留默认词）。
    await refreshWakeWords();
  }

  /// 从后端拉取最新唤醒词（登录后/进入相关页时可再调）。失败静默保留现值。
  Future<void> refreshWakeWords() async {
    try {
      final data = await ApiClient.get('/ai/assistant/config');
      final raw = data is Map ? data['wakeWords'] : null;
      if (raw is List) {
        final words = raw
            .map((e) => '$e'.trim())
            .where((e) => e.isNotEmpty)
            .toList();
        if (words.isNotEmpty) {
          _wakeWords = words;
          notifyListeners();
        }
      }
    } catch (_) {
      // 离线/未登录：保留默认或现有唤醒词。
    }
  }

  Future<void> setEnabled(bool value) async {
    if (_enabled != value) {
      _enabled = value;
      notifyListeners();
    }
    final sp = await SharedPreferences.getInstance();
    await sp.setBool(preferenceKey, value);
  }
}
