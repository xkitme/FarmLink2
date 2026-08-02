import 'auth_secret_store_contract.dart';

// Flutter Web 只是开发预览端。局域网 HTTP 下不能把 refresh token 写入
// localStorage 冒充安全存储，因此这里只保留当前页面生命周期内的内存值。
class _WebMemoryAuthSecretStore implements AuthSecretStore {
  static final Map<String, String> _values = <String, String>{};

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async {
    _values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }
}

AuthSecretStore createAuthSecretStore() => _WebMemoryAuthSecretStore();
