import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user.dart';

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
