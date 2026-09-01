import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user.dart';

/// 适老模式运行时状态。三条取值路径必须一致（116h-A polish 核验口径）：
///
/// 1. 启动读取 SharedPreferences `elder_mode` —— 本地偏好**优先**（用户手动切过就以此为准）；
/// 2. 无本地偏好 → 回退用户 profile 默认（`AppUser.isElderMode`，登录/缓存的 user JSON），
///    且**立即持久化**，避免每次启动重复回退；
/// 3. 设置页切换 → [setEnabled] 写入本地偏好（同页还会同步 PUT `/user/profile`，
///    见 elder_mode_page），重启后读取一致。
///
/// web headless 注入口径：shared_preferences_web 存 JSON 字面量，布尔值写
/// `'true'` / `'false'` 即可被 [getBool] 正确读取（字符串值才需要 JSON 编码）。
class ElderModeState extends ChangeNotifier {
  static const String preferenceKey = 'elder_mode';

  bool _enabled = false;
  bool _initialized = false;

  bool get enabled => _enabled;
  bool get initialized => _initialized;

  Future<void> init({AppUser? user}) async {
    final sp = await SharedPreferences.getInstance();
    final localValue = sp.getBool(preferenceKey);
    _enabled = localValue ?? user?.isElderMode ?? false;
    _initialized = true;
    if (localValue == null) {
      await sp.setBool(preferenceKey, _enabled);
    }
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
