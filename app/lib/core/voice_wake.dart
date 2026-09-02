import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

/// 语音唤醒（「呼叫唤起」）运行时状态。
///
/// - `enabled`：本地开关，默认关。开启后（仅 APK）悬浮小球可见时后台离线监听唤醒词。
/// - `wakeWords`：唤醒词列表，登录后从后端 `GET /ai/assistant/config` 拉取，失败回落默认。
///
/// 116x 401 噪音治理：`init()` 在**未登录**时不再主动请求 `/ai/assistant/config`
/// （该端点 requireAuth，未登录请求只产生 401 噪音）；改为登录成功后由
/// `AuthState` 广播会话事件时按需刷新（`refreshWakeWordsIfAuthenticated`）。
/// 仿 `ElderModeState`：开关存本地 `SharedPreferences`，唤醒词随后端管理台实时配置。
class VoiceWakeState extends ChangeNotifier {
  static const String preferenceKey = 'voice_wake_enabled';
  static const List<String> defaultWakeWords = ['你好小田'];

  /// 存活实例注册表（AppBootstrap 装配；用于会话事件广播，避免 core 状态间强耦合）。
  static final List<VoiceWakeState> _alive = <VoiceWakeState>[];

  /// 登录/注册成功后调用：所有存活实例在已认证时刷新唤醒词（未登录零请求）。
  static void notifySessionEstablished() {
    for (final state in List<VoiceWakeState>.of(_alive)) {
      unawaited(state.refreshWakeWordsIfAuthenticated());
    }
  }

  /// 退出登录/会话失效后调用：所有存活实例清回默认唤醒词。
  static void notifySessionCleared() {
    for (final state in List<VoiceWakeState>.of(_alive)) {
      state.resetToDefaults();
    }
  }

  VoiceWakeState() {
    _alive.add(this);
  }

  bool _enabled = false;
  List<String> _wakeWords = const ['你好小田'];
  bool _initialized = false;

  bool get enabled => _enabled;
  List<String> get wakeWords => _wakeWords;
  bool get initialized => _initialized;

  @override
  void dispose() {
    _alive.remove(this);
    super.dispose();
  }

  /// 启动装配（AppBootstrap 顺序：认证 → 适老 → 语音唤醒）。
  ///
  /// 只恢复本地开关，**不主动请求后端**——未登录时零请求；
  /// 已登录场景的唤醒词刷新由 [AuthState] 登录成功事件驱动。
  Future<void> init() async {
    final sp = await SharedPreferences.getInstance();
    _enabled = sp.getBool(preferenceKey) ?? false;
    _initialized = true;
    notifyListeners();
  }

  /// 已登录才拉取唤醒词；未登录直接返回（不发 `/ai/assistant/config`）。
  Future<void> refreshWakeWordsIfAuthenticated() async {
    if (!ApiClient.hasAuthSession) return;
    await refreshWakeWords();
  }

  /// 从后端拉取最新唤醒词（登录后/进入相关页时可再调）。失败静默保留现值。
  Future<void> refreshWakeWords() async {
    try {
      final data = await ApiClient.get('/ai/assistant/config');
      final raw = data is Map ? data['wakeWords'] : null;
      if (raw is List) {
        final words =
            raw.map((e) => '$e'.trim()).where((e) => e.isNotEmpty).toList();
        if (words.isNotEmpty) {
          _wakeWords = words;
          notifyListeners();
        }
      }
    } catch (_) {
      // 401/离线/服务端错误：保留默认或现有唤醒词，不打印噪音。
    }
  }

  /// 退出登录后清回默认唤醒词（由 [AuthState] 会话清除事件触发）。
  void resetToDefaults() {
    if (identical(_wakeWords, defaultWakeWords)) return;
    _wakeWords = defaultWakeWords;
    notifyListeners();
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
