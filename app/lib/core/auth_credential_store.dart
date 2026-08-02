import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'auth_secret_store.dart';
import 'auth_secret_store_contract.dart';

class AuthCredentials {
  const AuthCredentials({required this.accessToken, this.refreshToken});

  final String accessToken;
  final String? refreshToken;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'version': 1,
        'accessToken': accessToken,
        if (refreshToken != null) 'refreshToken': refreshToken,
      };

  static AuthCredentials? tryParse(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map<String, dynamic>) return null;
      final access = '${value['accessToken'] ?? ''}'.trim();
      final refresh = '${value['refreshToken'] ?? ''}'.trim();
      if (access.isEmpty) return null;
      return AuthCredentials(
        accessToken: access,
        refreshToken: refresh.isEmpty ? null : refresh,
      );
    } catch (_) {
      return null;
    }
  }
}

abstract interface class CredentialStorage {
  Future<AuthCredentials?> load();

  Future<void> save(AuthCredentials credentials);

  Future<void> clear();
}

class SecureCredentialStorage implements CredentialStorage {
  SecureCredentialStorage({
    AuthSecretStore? secretStore,
    Future<SharedPreferences> Function()? preferencesLoader,
  })  : _secretStore = secretStore ?? createAuthSecretStore(),
        _preferencesLoader = preferencesLoader ?? SharedPreferences.getInstance;

  static const String secureKey = 'farmlink.auth.credentials.v1';
  static const List<String> legacyKeys = <String>[
    'token',
    'accessToken',
    'refreshToken',
    'refresh_token',
  ];

  final AuthSecretStore _secretStore;
  final Future<SharedPreferences> Function() _preferencesLoader;

  @override
  Future<AuthCredentials?> load() async {
    final secureRaw = await _secretStore.read(secureKey);
    final secureCredentials = AuthCredentials.tryParse(secureRaw);
    if (secureCredentials != null) {
      await _removeLegacyCredentials();
      return secureCredentials;
    }
    if (secureRaw != null) await _secretStore.delete(secureKey);

    final preferences = await _preferencesLoader();
    final legacyAccess = _firstNonEmpty(preferences, const <String>[
      'token',
      'accessToken',
    ]);
    final legacyRefresh = _firstNonEmpty(preferences, const <String>[
      'refreshToken',
      'refresh_token',
    ]);
    if (legacyAccess == null) {
      await _removeLegacyCredentials(preferences);
      return null;
    }

    final migrated = AuthCredentials(
      accessToken: legacyAccess,
      refreshToken: legacyRefresh,
    );
    // 必须先完成安全写入，再删除 SharedPreferences 明文；写入失败时保留
    // 旧值供下次启动重试，但当前启动不会继续使用不安全回退。
    await save(migrated);
    await _removeLegacyCredentials(preferences);
    return migrated;
  }

  @override
  Future<void> save(AuthCredentials credentials) async {
    if (credentials.accessToken.trim().isEmpty) {
      throw ArgumentError.value(
        credentials.accessToken,
        'accessToken',
        'access token 不能为空',
      );
    }
    await _secretStore.write(secureKey, jsonEncode(credentials.toJson()));
    await _removeLegacyCredentials();
  }

  @override
  Future<void> clear() async {
    await _secretStore.delete(secureKey);
    await _removeLegacyCredentials();
  }

  String? _firstNonEmpty(
    SharedPreferences preferences,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = preferences.getString(key)?.trim();
      if (value != null && value.isNotEmpty) return value;
    }
    return null;
  }

  Future<void> _removeLegacyCredentials([
    SharedPreferences? existing,
  ]) async {
    final preferences = existing ?? await _preferencesLoader();
    for (final key in legacyKeys) {
      await preferences.remove(key);
    }
  }
}
