import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/auth_credential_store.dart';
import 'package:farmlink/core/auth_state.dart';
import 'package:farmlink/core/constants.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fakes.dart';

Future<HttpServer> startServer(
  Future<void> Function(HttpRequest request) handler,
) async {
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  server.listen((request) {
    unawaited(handler(request));
  });
  return server;
}

void configureApiClient() {
  ApiClient.baseUrl = kBaseUrl;
  ApiClient.setToken(null);
  ApiClient.configureAuth(
    refreshHandler: () async => false,
    sessionExpiredHandler: () async {},
  );
}

void main() {
  setUp(configureApiClient);
  tearDown(configureApiClient);

  test('SecureCredentialStorage migrates legacy access and refresh', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'token': 'legacy-access',
      'refreshToken': 'legacy-refresh',
      'onboarding_seen': true,
    });
    final secretStore = InMemorySecretStore();
    final storage = SecureCredentialStorage(
      secretStore: secretStore,
      preferencesLoader: SharedPreferences.getInstance,
    );

    final credentials = await storage.load();
    final preferences = await SharedPreferences.getInstance();

    expect(credentials?.accessToken, 'legacy-access');
    expect(credentials?.refreshToken, 'legacy-refresh');
    expect(secretStore.values[SecureCredentialStorage.secureKey], isNotNull);
    expect(preferences.getString('token'), isNull);
    expect(preferences.getString('refreshToken'), isNull);
    expect(preferences.getBool('onboarding_seen'), isTrue);
  });

  test('SecureCredentialStorage migrates legacy access only', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'token': 'legacy-access',
    });
    final secretStore = InMemorySecretStore();
    final storage = SecureCredentialStorage(
      secretStore: secretStore,
      preferencesLoader: SharedPreferences.getInstance,
    );

    final credentials = await storage.load();
    final preferences = await SharedPreferences.getInstance();

    expect(credentials?.accessToken, 'legacy-access');
    expect(credentials?.refreshToken, isNull);
    expect(secretStore.values[SecureCredentialStorage.secureKey], isNotNull);
    expect(preferences.getString('token'), isNull);
    expect(preferences.getString('refreshToken'), isNull);
  });

  test(
      'SecureCredentialStorage preserves legacy values when secure write fails',
      () async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'token': 'legacy-access',
      'refreshToken': 'legacy-refresh',
    });
    final secretStore = InMemorySecretStore()..failWrites = true;
    final storage = SecureCredentialStorage(
      secretStore: secretStore,
      preferencesLoader: SharedPreferences.getInstance,
    );

    await expectLater(storage.load(), throwsStateError);
    final preferences = await SharedPreferences.getInstance();

    expect(secretStore.values[SecureCredentialStorage.secureKey], isNull);
    expect(preferences.getString('token'), 'legacy-access');
    expect(preferences.getString('refreshToken'), 'legacy-refresh');
  });

  test('ApiClient deduplicates concurrent refresh rotation', () async {
    var refreshCalls = 0;
    var protectedHits = 0;
    final server = await startServer((request) async {
      switch (request.uri.path) {
        case '$kApiPrefix/protected':
          protectedHits += 1;
          final authorization =
              request.headers.value(HttpHeaders.authorizationHeader);
          if (authorization == 'Bearer access-old') {
            request.response.statusCode = HttpStatus.unauthorized;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode(<String, dynamic>{
              'code': 40101,
              'msg': 'access expired',
            }));
          } else if (authorization == 'Bearer access-new') {
            request.response.statusCode = HttpStatus.ok;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode(<String, dynamic>{
              'code': 200,
              'data': <String, dynamic>{'ok': true},
            }));
          } else {
            request.response.statusCode = HttpStatus.unauthorized;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode(<String, dynamic>{
              'code': 40101,
              'msg': 'missing token',
            }));
          }
          break;
        case '$kApiPrefix/auth/refresh':
          refreshCalls += 1;
          request.response.statusCode = HttpStatus.ok;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 200,
            'data': <String, dynamic>{
              'token': 'access-new',
              'refreshToken': 'refresh-new',
            },
          }));
          break;
        default:
          request.response.statusCode = HttpStatus.notFound;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 404,
            'msg': 'not found',
          }));
      }
      await request.response.close();
    });
    addTearDown(() async => server.close(force: true));

    ApiClient.baseUrl = 'http://${server.address.host}:${server.port}';
    ApiClient.setToken('access-old');
    ApiClient.configureAuth(
      refreshHandler: () async {
        refreshCalls += 1;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        ApiClient.setToken('access-new');
        return true;
      },
      sessionExpiredHandler: () async {},
    );

    final results = await Future.wait<dynamic>(
      List.generate(8, (_) => ApiClient.get('/protected')),
    );

    expect(refreshCalls, 1);
    expect(protectedHits, greaterThanOrEqualTo(16));
    expect(results, hasLength(8));
    for (final value in results) {
      expect(value, isA<Map<String, dynamic>>());
      expect((value as Map<String, dynamic>)['ok'], isTrue);
    }
  });

  test('AuthState logout revokes server session and clears local credentials',
      () async {
    final serverLogoutBodies = <Map<String, dynamic>>[];
    final server = await startServer((request) async {
      switch (request.uri.path) {
        case '$kApiPrefix/auth/logout':
          final body = await utf8.decoder.bind(request).join();
          serverLogoutBodies.add(
            body.isEmpty
                ? <String, dynamic>{}
                : jsonDecode(body) as Map<String, dynamic>,
          );
          request.response.statusCode = HttpStatus.ok;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 200,
            'data': <String, dynamic>{},
          }));
          break;
        default:
          request.response.statusCode = HttpStatus.notFound;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 404,
            'msg': 'not found',
          }));
      }
      await request.response.close();
    });
    addTearDown(() async => server.close(force: true));

    ApiClient.baseUrl = 'http://${server.address.host}:${server.port}';
    SharedPreferences.setMockInitialValues(<String, Object>{
      'user': jsonEncode(<String, dynamic>{
        'id': 1,
        'username': 'farmer',
        'nickname': '老李',
      }),
    });
    final storage = InMemoryCredentialStorage(
      const AuthCredentials(
        accessToken: 'access-old',
        refreshToken: 'refresh-old',
      ),
    );
    final auth = AuthState(credentialStorage: storage);
    await auth.init();

    await auth.logout();
    final preferences = await SharedPreferences.getInstance();

    expect(serverLogoutBodies, hasLength(1));
    expect(serverLogoutBodies.single['refreshToken'], 'refresh-old');
    expect(auth.isLoggedIn, isFalse);
    expect(auth.user, isNull);
    expect(storage.current, isNull);
    expect(ApiClient.token, isNull);
    expect(preferences.getString('user'), isNull);
  });

  test('AuthState clears session after refresh failure', () async {
    final server = await startServer((request) async {
      switch (request.uri.path) {
        case '$kApiPrefix/protected':
          request.response.statusCode = HttpStatus.unauthorized;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 40101,
            'msg': 'access expired',
          }));
          break;
        case '$kApiPrefix/auth/refresh':
          request.response.statusCode = HttpStatus.unauthorized;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 40101,
            'msg': 'refresh expired',
          }));
          break;
        default:
          request.response.statusCode = HttpStatus.notFound;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode(<String, dynamic>{
            'code': 404,
            'msg': 'not found',
          }));
      }
      await request.response.close();
    });
    addTearDown(() async => server.close(force: true));

    ApiClient.baseUrl = 'http://${server.address.host}:${server.port}';
    SharedPreferences.setMockInitialValues(<String, Object>{
      'user': jsonEncode(<String, dynamic>{
        'id': 2,
        'username': 'tester',
      }),
    });
    final storage = InMemoryCredentialStorage(
      const AuthCredentials(
        accessToken: 'access-old',
        refreshToken: 'refresh-old',
      ),
    );
    final auth = AuthState(credentialStorage: storage);
    await auth.init();

    await expectLater(
        ApiClient.get('/protected'), throwsA(isA<ApiException>()));

    expect(auth.isLoggedIn, isFalse);
    expect(auth.user, isNull);
    expect(storage.current, isNull);
    expect(ApiClient.token, isNull);
  });
}
