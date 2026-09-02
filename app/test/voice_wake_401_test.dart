// 116x：登录前 401 噪音治理（voice_wake + auth_state 会话事件）。
// 锁定：未登录 init 零请求 / 登录后刷新 / 401 保持默认词 / wakeWords 返回后更新。
// 说明：ApiClient 的 post/get 分别走顶层 http 与可注入 client，为统一行为，
// 本测试与 auth_security_test 一致使用真实 loopback HttpServer 应答（纯 test()，无 testWidgets）。
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/auth_state.dart';
import 'package:farmlink/core/voice_wake.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fakes.dart';

Future<HttpServer> startServer(
  Future<HttpResponse> Function(HttpRequest request) handler,
) async {
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  server.listen((request) {
    unawaited(handler(request).then((response) => response.close()));
  });
  return server;
}

Future<HttpResponse> respondJson(HttpResponse response, int status, Map<String, dynamic> body) async {
  response.statusCode = status;
  response.headers.contentType = ContentType.json;
  response.write(jsonEncode(body));
  return response;
}

void configureApiClient({String? token, String? baseUrl}) {
  ApiClient.baseUrl = baseUrl ?? 'http://localhost:8000';
  ApiClient.setToken(token);
  ApiClient.configureAuth(
    refreshHandler: () async => false,
    sessionExpiredHandler: () async {},
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    ApiClient.setClientForTesting(null);
    ApiClient.setToken(null);
    ApiClient.setAutomaticRefreshEnabled(true);
  });

  tearDown(() {
    ApiClient.setClientForTesting(null);
    ApiClient.setToken(null);
  });

  test('未登录 init() 不发 /ai/assistant/config（零请求）', () async {
    var configHits = 0;
    final server = await startServer((request) async {
      if (request.uri.path == '/api/v1/ai/assistant/config') configHits++;
      return respondJson(request.response, 200, {'code': 200, 'data': {}});
    });
    addTearDown(() async => server.close(force: true));
    configureApiClient(token: null, baseUrl: 'http://${server.address.host}:${server.port}');

    final wake = VoiceWakeState();
    await wake.init();
    // init 只恢复本地开关；未登录不得发起任何请求
    expect(configHits, 0, reason: '未登录 init 不得请求后端');
    expect(wake.initialized, isTrue);
    expect(wake.wakeWords, VoiceWakeState.defaultWakeWords);
    wake.dispose();
  });

  test('登录后 notifySessionEstablished 触发 /ai/assistant/config 刷新', () async {
    final server = await startServer((request) async {
      if (request.uri.path == '/api/v1/ai/assistant/config') {
        return respondJson(request.response, 200, {
          'code': 200,
          'data': {'wakeWords': ['你好小田', '呼叫小田']},
        });
      }
      return respondJson(request.response, 200, {'code': 200, 'data': {}});
    });
    addTearDown(() async => server.close(force: true));
    configureApiClient(token: 'access-token', baseUrl: 'http://${server.address.host}:${server.port}');

    final wake = VoiceWakeState();
    VoiceWakeState.notifySessionEstablished();
    await Future<void>.delayed(const Duration(milliseconds: 100));

    expect(wake.wakeWords, ['你好小田', '呼叫小田'], reason: '远端返回后应更新唤醒词');
    wake.dispose();
  });

  test('登录后 401（会话失效）→ 保持默认唤醒词，不抛错不打印', () async {
    final server = await startServer((request) async {
      if (request.uri.path == '/api/v1/ai/assistant/config') {
        return respondJson(request.response, 401, {
          'code': 40101,
          'msg': '未登录或登录已失效',
          'data': null,
        });
      }
      return respondJson(request.response, 200, {'code': 200, 'data': {}});
    });
    addTearDown(() async => server.close(force: true));
    configureApiClient(token: 'expired-token', baseUrl: 'http://${server.address.host}:${server.port}');

    final wake = VoiceWakeState();
    VoiceWakeState.notifySessionEstablished();
    await Future<void>.delayed(const Duration(milliseconds: 100));

    expect(wake.wakeWords, VoiceWakeState.defaultWakeWords,
        reason: '401 时不得用失败结果覆盖默认词');
    wake.dispose();
  });

  test('未登录时 notifySessionEstablished 也零请求（内部仍检查 token）', () async {
    var hits = 0;
    final server = await startServer((request) async {
      hits++;
      return respondJson(request.response, 200, {'code': 200, 'data': {}});
    });
    addTearDown(() async => server.close(force: true));
    configureApiClient(token: null, baseUrl: 'http://${server.address.host}:${server.port}');

    final wake = VoiceWakeState();
    VoiceWakeState.notifySessionEstablished();
    await Future<void>.delayed(const Duration(milliseconds: 100));
    expect(hits, 0, reason: '未登录广播会话事件也不得发请求');
    wake.dispose();
  });

  test('logout（会话清除）后唤醒词清回默认', () async {
    final server = await startServer((request) async {
      if (request.uri.path == '/api/v1/ai/assistant/config') {
        return respondJson(request.response, 200, {
          'code': 200,
          'data': {'wakeWords': ['你好小田', '远配置词']},
        });
      }
      return respondJson(request.response, 200, {'code': 200, 'data': {}});
    });
    addTearDown(() async => server.close(force: true));
    configureApiClient(token: 'access-token', baseUrl: 'http://${server.address.host}:${server.port}');

    final wake = VoiceWakeState();
    VoiceWakeState.notifySessionEstablished();
    await Future<void>.delayed(const Duration(milliseconds: 100));
    expect(wake.wakeWords, ['你好小田', '远配置词'], reason: '前置：登录后已拉到远端词');

    // 登出：清回默认词
    VoiceWakeState.notifySessionCleared();
    expect(wake.wakeWords, VoiceWakeState.defaultWakeWords,
        reason: 'logout 后必须清回默认词，不残留上一会话远端配置');
    wake.dispose();
  });

  test('AuthState 登录成功经 _save 触发刷新；登出触发清回默认（集成面）', () async {
    final server = await startServer((request) async {
      final path = request.uri.path;
      if (path == '/api/v1/auth/login') {
        return respondJson(request.response, 200, {
          'code': 200,
          'data': {
            'token': 'new-access',
            'refreshToken': 'new-refresh',
            'user': {
              'id': 7,
              'username': 'voice-farmer',
              'nickname': '语音农户',
              'role': 'FARMER',
            },
          },
        });
      }
      if (path == '/api/v1/notification/unread') {
        return respondJson(request.response, 200, {
          'code': 200,
          'data': {'unread': 3},
        });
      }
      if (path == '/api/v1/ai/assistant/config') {
        return respondJson(request.response, 200, {
          'code': 200,
          'data': {'wakeWords': ['你好小田', '登录后词']},
        });
      }
      if (path == '/api/v1/auth/logout') {
        return respondJson(request.response, 200, {'code': 200, 'data': {'ok': true}});
      }
      return respondJson(request.response, 200, {'code': 200, 'data': {}});
    });
    addTearDown(() async => server.close(force: true));
    configureApiClient(token: null, baseUrl: 'http://${server.address.host}:${server.port}');
    ApiClient.setAutomaticRefreshEnabled(false);

    final auth = AuthState(credentialStorage: InMemoryCredentialStorage());
    await auth.init();
    final wake = VoiceWakeState();

    await auth.login('voice-farmer', 'pass');
    await Future<void>.delayed(const Duration(milliseconds: 150));
    expect(auth.isLoggedIn, isTrue);
    expect(wake.wakeWords, ['你好小田', '登录后词'], reason: '登录成功后应刷新语音配置');

    await auth.logout();
    await Future<void>.delayed(const Duration(milliseconds: 100));
    expect(auth.isLoggedIn, isFalse);
    expect(wake.wakeWords, VoiceWakeState.defaultWakeWords, reason: '登出后应清回默认词');

    wake.dispose();
    auth.dispose();
  });
}
