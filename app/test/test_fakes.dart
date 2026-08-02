import 'package:farmlink/core/auth_credential_store.dart';
import 'package:farmlink/core/auth_secret_store_contract.dart';

class InMemorySecretStore implements AuthSecretStore {
  InMemorySecretStore({Map<String, String>? initialValues})
      : values = Map<String, String>.of(initialValues ?? const {});

  final Map<String, String> values;
  bool failWrites = false;

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async {
    if (failWrites) {
      throw StateError('secret store write failed');
    }
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }
}

class InMemoryCredentialStorage implements CredentialStorage {
  InMemoryCredentialStorage([AuthCredentials? initial]) : _current = initial;

  AuthCredentials? _current;

  AuthCredentials? get current => _current;

  @override
  Future<AuthCredentials?> load() async => _current;

  @override
  Future<void> save(AuthCredentials credentials) async {
    _current = credentials;
  }

  @override
  Future<void> clear() async {
    _current = null;
  }
}
