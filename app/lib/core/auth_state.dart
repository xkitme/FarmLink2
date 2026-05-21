import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_client.dart';

/// 全局登录态。
class AuthState extends ChangeNotifier {
  AppUser? _user;
  String? _token;
  bool _loading = true;

  AppUser? get user => _user;
  String? get token => _token;
  bool get isLoggedIn => _token != null;
  bool get loading => _loading;

  Future<void> init() async {
    final sp = await SharedPreferences.getInstance();
    _token = sp.getString('token');
    final us = sp.getString('user');
    if (us != null) {
      try {
        _user = AppUser.fromJson(jsonDecode(us) as Map<String, dynamic>);
      } catch (_) {}
    }
    if (_token != null) ApiClient.setToken(_token);
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    final data = await ApiClient.post('/auth/login',
        body: {'username': username, 'password': password});
    await _save(data as Map<String, dynamic>);
  }

  Future<void> register(String username, String password, String nickname) async {
    final data = await ApiClient.post('/auth/register',
        body: {'username': username, 'password': password, 'nickname': nickname});
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
    notifyListeners();
  }
}
