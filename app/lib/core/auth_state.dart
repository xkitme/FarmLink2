import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class AuthState extends ChangeNotifier {
  Map<String, dynamic>? _user;
  String? _token;
  bool _loading = true;

  Map<String, dynamic>? get user => _user;
  String? get token => _token;
  bool get isLoggedIn => _token != null;
  bool get loading => _loading;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    final userStr = prefs.getString('user');
    if (userStr != null) _user = jsonDecode(userStr) as Map<String, dynamic>;
    if (_token != null) ApiClient.setToken(_token);
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    final res = await ApiClient.post('/api/auth/login', body: {
      'username': username,
      'password': password,
    });
    await _saveSession(res['data'] as Map<String, dynamic>);
  }

  Future<void> register(String username, String password, String nickname) async {
    final res = await ApiClient.post('/api/auth/register', body: {
      'username': username,
      'password': password,
      'nickname': nickname,
    });
    await _saveSession(res['data'] as Map<String, dynamic>);
  }

  Future<void> refreshProfile() async {
    final res = await ApiClient.get('/api/auth/me');
    _user = res['data'] as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user', jsonEncode(_user));
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    ApiClient.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    notifyListeners();
  }

  Future<void> _saveSession(Map<String, dynamic> data) async {
    _token = data['token'] as String;
    _user = data['user'] as Map<String, dynamic>?;
    ApiClient.setToken(_token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token!);
    if (_user != null) await prefs.setString('user', jsonEncode(_user));
    notifyListeners();
  }
}
