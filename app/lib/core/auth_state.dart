import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'auth_credential_store.dart';
import 'notification_state.dart';
import 'voice_wake.dart';

/// 全局登录态。
class AuthState extends ChangeNotifier {
  AuthState({
    CredentialStorage? credentialStorage,
    bool? browserCookieSessionEnabled,
  })  : _credentialStorage = credentialStorage ?? SecureCredentialStorage(),
        _browserCookieSessionEnabled = browserCookieSessionEnabled ?? kIsWeb;

  final CredentialStorage _credentialStorage;
  final bool _browserCookieSessionEnabled;
  AppUser? _user;
  String? _token;
  String? _refreshToken;
  bool _cookieSessionActive = false;
  bool _loading = true;
  bool _onboardingSeen = false;
  bool _handlingExpiry = false;
  int _sessionGeneration = 0;
  Future<void> _credentialMutation = Future<void>.value();

  AppUser? get user => _user;
  String? get token => _token;
  bool get isLoggedIn => _token != null || _cookieSessionActive;
  bool get loading => _loading;

  /// 引导页是否已看过（只在首次启动展示）
  bool get onboardingSeen => _onboardingSeen;

  Future<void> init() async {
    if (!_loading) return;
    final sp = await SharedPreferences.getInstance();
    try {
      final credentials = await _credentialStorage.load();
      _token = credentials?.accessToken;
      _refreshToken = credentials?.refreshToken;
    } catch (_) {
      // 安全存储不可用或旧值迁移失败时不能回退到明文凭据。
      _token = null;
      _refreshToken = null;
    }
    _user = null;
    _onboardingSeen = sp.getBool('onboarding_seen') ?? false;
    final us = sp.getString('user');
    if (us != null) {
      try {
        _user = AppUser.fromJson(jsonDecode(us) as Map<String, dynamic>);
      } catch (_) {}
    }
    if (_token != null) {
      ApiClient.setToken(_token);
    } else {
      ApiClient.setToken(null);
    }
    ApiClient.setCookieSessionActive(false);
    ApiClient.configureAuth(
      refreshHandler: _refreshAccessToken,
      sessionExpiredHandler: _handleExpiry,
    );
    if (_token == null && _browserCookieSessionEnabled) {
      await _restoreCookieSession();
    }
    _loading = false;
    notifyListeners();
    // 冷启动恢复登录态：会话已建立，语音唤醒配置可安全拉取（未登录零请求）
    if (isLoggedIn) VoiceWakeState.notifySessionEstablished();
  }

  /// 标记引导页已看过
  Future<void> markOnboardingSeen() async {
    if (_onboardingSeen) return;
    _onboardingSeen = true;
    final sp = await SharedPreferences.getInstance();
    await sp.setBool('onboarding_seen', true);
  }

  /// 收到 401：清登录态（防重入），AuthState 通知后路由自动跳登录页
  Future<void> _handleExpiry() async {
    if ((_token == null && _refreshToken == null && !_cookieSessionActive) ||
        _handlingExpiry) {
      return;
    }
    _handlingExpiry = true;
    try {
      await _clearLocalSession();
    } finally {
      _handlingExpiry = false;
    }
  }

  Future<void> login(String username, String password) async {
    final data = await ApiClient.post('/auth/login',
        body: {'username': username, 'password': password});
    await _save(data as Map<String, dynamic>);
  }

  Future<void> register(
    String username,
    String password,
    String nickname, {
    String? phone,
  }) async {
    // 手机号来源：优先显式手机号字段；否则若「用户名」本身是手机号格式则回退取用。
    final explicit = (phone ?? '').trim();
    final fallback = RegExp(r'^1\d{10}$').hasMatch(username) ? username : '';
    final resolvedPhone = explicit.isNotEmpty ? explicit : fallback;
    final data = await ApiClient.post('/auth/register', body: {
      'username': username,
      'password': password,
      // 后端 schema 认 displayName（strip 会丢弃 nickname），此处直接对齐字段名，
      // 昵称才能真正生效，而不是被静默丢弃后回退成用户名。
      if (nickname.trim().isNotEmpty) 'displayName': nickname.trim(),
      if (resolvedPhone.isNotEmpty) 'phone': resolvedPhone,
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
    ApiClient.setAutomaticRefreshEnabled(false);
    try {
      // 如果已经有 rotation 在途，先接收其最新 refresh，再撤销对应后继会话，
      // 避免退出与刷新竞态留下孤儿服务端会话。
      await ApiClient.waitForPendingRefresh();
      final refreshToken = _refreshToken;
      if (_token != null || refreshToken != null || _cookieSessionActive) {
        try {
          await ApiClient.post(
            '/auth/logout',
            body: <String, dynamic>{
              if (refreshToken != null) 'refreshToken': refreshToken,
            },
          );
        } catch (_) {
          // 服务端不可达或会话已失效时仍需完成本地退出。
        }
      }
    } finally {
      await _clearLocalSession();
      ApiClient.setAutomaticRefreshEnabled(true);
    }
  }

  Future<bool> _refreshAccessToken() async {
    final refreshToken = _refreshToken;
    final generation = _sessionGeneration;
    if ((refreshToken == null || refreshToken.isEmpty) &&
        !(_browserCookieSessionEnabled && _cookieSessionActive)) {
      return false;
    }

    try {
      if (_browserCookieSessionEnabled && _cookieSessionActive) {
        final data = await ApiClient.refreshCookieSession();
        final rawUser = data['user'];
        final user = rawUser == null
            ? null
            : AppUser.fromJson(rawUser as Map<String, dynamic>);
        if (generation != _sessionGeneration) return false;
        if (user != null) {
          _user = user;
          final sp = await SharedPreferences.getInstance();
          await sp.setString('user', jsonEncode(user.toJson()));
        }
        ApiClient.setCookieSessionActive(true);
        notifyListeners();
        return true;
      }

      final data = await ApiClient.refreshSession(refreshToken!);
      final access = '${data['token'] ?? ''}'.trim();
      final rotatedRefresh = '${data['refreshToken'] ?? ''}'.trim();
      if (access.isEmpty || rotatedRefresh.isEmpty) return false;

      final stored = await _mutateCredentials<bool>(() async {
        if (generation != _sessionGeneration) return false;
        await _credentialStorage.save(AuthCredentials(
          accessToken: access,
          refreshToken: rotatedRefresh,
        ));
        if (generation != _sessionGeneration) return false;
        _token = access;
        _refreshToken = rotatedRefresh;
        ApiClient.setToken(access);
        return true;
      });
      return stored;
    } catch (_) {
      return false;
    }
  }

  Future<T> _mutateCredentials<T>(Future<T> Function() action) {
    final result = _credentialMutation.then((_) => action());
    _credentialMutation = result.then<void>(
      (_) {},
      onError: (Object _, StackTrace __) {},
    );
    return result;
  }

  Future<void> _clearLocalSession() async {
    _sessionGeneration += 1;
    _user = null;
    _token = null;
    _refreshToken = null;
    _cookieSessionActive = false;
    ApiClient.setToken(null);
    ApiClient.setCookieSessionActive(false);
    NotificationState.setUnread(0);
    // 退出登录/会话失效：语音唤醒词清回默认（不残留上一会话的远端配置）
    VoiceWakeState.notifySessionCleared();
    await _mutateCredentials<void>(() async {
      await _credentialStorage.clear();
      final sp = await SharedPreferences.getInstance();
      await sp.remove('user');
    });
    notifyListeners();
  }

  Future<void> _save(Map<String, dynamic> data) async {
    final access = '${data['token'] ?? ''}'.trim();
    final refresh = '${data['refreshToken'] ?? ''}'.trim();
    if (access.isEmpty || refresh.isEmpty) {
      if (_browserCookieSessionEnabled &&
          access.isEmpty &&
          refresh.isEmpty &&
          data['user'] is Map<String, dynamic>) {
        await _saveCookieSession(
          AppUser.fromJson(data['user'] as Map<String, dynamic>),
        );
        return;
      }
      throw ApiException(50001, '登录会话响应异常');
    }
    final u = data['user'];
    final user = u == null ? null : AppUser.fromJson(u as Map<String, dynamic>);
    final generation = ++_sessionGeneration;

    await _mutateCredentials<void>(() async {
      if (generation != _sessionGeneration) {
        throw ApiException(40101, '登录状态已变化，请重新登录');
      }
      await _credentialStorage.save(AuthCredentials(
        accessToken: access,
        refreshToken: refresh,
      ));
      if (generation != _sessionGeneration) {
        throw ApiException(40101, '登录状态已变化，请重新登录');
      }
      _token = access;
      _refreshToken = refresh;
      _cookieSessionActive = false;
      _user = user;
      ApiClient.setToken(access);
      ApiClient.setCookieSessionActive(false);
    });

    final sp = await SharedPreferences.getInstance();
    if (_user != null) {
      await sp.setString('user', jsonEncode(_user!.toJson()));
    } else {
      await sp.remove('user');
    }
    await NotificationState.refresh();
    // 登录/注册成功：会话已建立，语音唤醒配置可安全拉取（未登录零请求）
    VoiceWakeState.notifySessionEstablished();
    notifyListeners();
  }

  Future<void> _restoreCookieSession() async {
    try {
      final data = await ApiClient.get('/auth/me');
      if (data is Map<String, dynamic>) {
        await _saveCookieSession(AppUser.fromJson(data));
      }
    } catch (_) {
      _cookieSessionActive = false;
      ApiClient.setCookieSessionActive(false);
    }
  }

  Future<void> _saveCookieSession(AppUser user) async {
    final generation = ++_sessionGeneration;
    await _mutateCredentials<void>(() async {
      if (generation != _sessionGeneration) {
        throw ApiException(40101, '登录状态已变化，请重新登录');
      }
      await _credentialStorage.clear();
      if (generation != _sessionGeneration) {
        throw ApiException(40101, '登录状态已变化，请重新登录');
      }
      _token = null;
      _refreshToken = null;
      _cookieSessionActive = true;
      _user = user;
      ApiClient.setToken(null);
      ApiClient.setCookieSessionActive(true);
    });

    final sp = await SharedPreferences.getInstance();
    await sp.setString('user', jsonEncode(user.toJson()));
    await NotificationState.refresh();
    VoiceWakeState.notifySessionEstablished();
    notifyListeners();
  }
}
