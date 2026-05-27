import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'notification_state.dart';

/// 全局登录态。
class AuthState extends ChangeNotifier {
  AppUser? _user;
  String? _token;
  bool _loading = true;
  bool _onboardingSeen = false;
  bool _handlingExpiry = false;

  AppUser? get user => _user;
  String? get token => _token;
  bool get isLoggedIn => _token != null;
  bool get loading => _loading;

  /// 引导页是否已看过（只在首次启动展示）
  bool get onboardingSeen => _onboardingSeen;

  Future<void> init() async {
    if (!_loading) return;
    final sp = await SharedPreferences.getInstance();
    _token = sp.getString('token');
    _onboardingSeen = sp.getBool('onboarding_seen') ?? false;
    final us = sp.getString('user');
    if (us != null) {
      try {
        _user = AppUser.fromJson(jsonDecode(us) as Map<String, dynamic>);
      } catch (_) {}
    }
    if (_token != null) ApiClient.setToken(_token);
    // token 失效时自动登出 → 路由守卫把用户送回登录页
    ApiClient.onUnauthorized = _handleExpiry;
    _loading = false;
    notifyListeners();
  }

  /// 标记引导页已看过
  Future<void> markOnboardingSeen() async {
    if (_onboardingSeen) return;
    _onboardingSeen = true;
    final sp = await SharedPreferences.getInstance();
    await sp.setBool('onboarding_seen', true);
  }

  /// 收到 401：清登录态（防重入），AuthState 通知后路由自动跳登录页
  void _handleExpiry() {
    if (_token == null || _handlingExpiry) return;
    _handlingExpiry = true;
    logout().whenComplete(() => _handlingExpiry = false);
  }

  Future<void> login(String username, String password) async {
    final data = await ApiClient.post('/auth/login',
        body: {'username': username, 'password': password});
    await _save(data as Map<String, dynamic>);
  }

  Future<void> register(
      String username, String password, String nickname) async {
    final data = await ApiClient.post('/auth/register', body: {
      'username': username,
      'password': password,
      'nickname': nickname
    });
    await _save(data as Map<String, dynamic>);
  }

  Future<void> refreshProfile() async {
    final data = await ApiClient.get('/user/profile');
    _user = AppUser.fromJson(data as Map<String, dynamic>);
    final sp = await SharedPreferences.getInstance();
    await sp.setString('user', jsonEncode(_user!.toJson()));
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    ApiClient.setToken(null);
    NotificationState.setUnread(0);
    final sp = await SharedPreferences.getInstance();
    await sp.remove('token');
    await sp.remove('user');
    notifyListeners();
  }

  Future<void> _save(Map<String, dynamic> data) async {
    _token = data['token'] as String;
    final u = data['user'];
    if (u != null) _user = AppUser.fromJson(u as Map<String, dynamic>);
    ApiClient.setToken(_token);
    final sp = await SharedPreferences.getInstance();
    await sp.setString('token', _token!);
    if (_user != null) await sp.setString('user', jsonEncode(_user!.toJson()));
    await NotificationState.refresh();
    notifyListeners();
  }
}
