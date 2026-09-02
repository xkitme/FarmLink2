import 'dart:async';
import 'dart:convert';

import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/auth_credential_store.dart';
import 'package:farmlink/core/auth_state.dart';
import 'package:farmlink/core/constants.dart';
import 'package:farmlink/design_system/farm_state_views.dart';
import 'package:farmlink/pages/home/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fakes.dart';

class _CapturedRequest {
  final String method;
  final String fullUri;
  final String? authHeader;
  final String? contentType;

  _CapturedRequest({
    required this.method,
    required this.fullUri,
    this.authHeader,
    this.contentType,
  });
}

void main() {
  final captured = <_CapturedRequest>[];
  http.Client? mockClient;

  AuthState? auth;
  GoRouter? router;

  void resetApiClient() {
    ApiClient.baseUrl = kBaseUrl;
    ApiClient.setToken(null);
    ApiClient.configureAuth(
      refreshHandler: () async => false,
      sessionExpiredHandler: () async {},
    );
  }

  http.Client createMockClient(
    List<_CapturedRequest> captured, {
    bool emptyPrices = false,
    Future<void>? weatherGate,
  }) {
    return MockClient((request) async {
      final uri = request.url;
      final req = _CapturedRequest(
        method: request.method,
        fullUri: uri.toString(),
        authHeader: request.headers['authorization'],
        contentType: request.headers['content-type'],
      );
      captured.add(req);

      switch (uri.path) {
        case '$kApiPrefix/agri/weather':
          // 116h-A polish：加载态测试用——请求挂起直到测试放行，保证首帧处于 loading。
          if (weatherGate != null) await weatherGate;
          return http.Response(
            jsonEncode({
              'code': 200,
              'msg': 'success',
              'data': {
                'days': [
                  {
                    'date': '2026-08-11',
                    'condition': '晴',
                    'tempLow': 22,
                    'tempHigh': 34,
                    'humidity': 62,
                    'windLevel': 2,
                  },
                ],
                'alerts': [],
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        case '$kApiPrefix/agri/record/list':
          return http.Response(
            jsonEncode({
              'code': 200,
              'msg': 'success',
              'data': {
                'records': [],
                'total': 0,
                'pageNum': 1,
                'pageSize': 50,
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        case '$kApiPrefix/market/price':
          if (emptyPrices) {
            return http.Response(
              jsonEncode({
                'code': 200,
                'msg': 'success',
                'data': <dynamic>[],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response(
            jsonEncode({
              'code': 200,
              'msg': 'success',
              'data': [
                {
                  'productName': '高山玉米',
                  'unit': '公斤',
                  'price': 5.80,
                  'marketName': '云谷农贸市场',
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        case '$kApiPrefix/policy/list':
          return http.Response(
            jsonEncode({
              'code': 200,
              'msg': 'success',
              'data': {
                'records': [
                  {
                    'title': '玉米种植补贴',
                    'category': '农业补贴',
                    'summary': '每亩补贴120元',
                    'publishOrg': '县农业农村局',
                  },
                ],
                'total': 1,
                'pageNum': 1,
                'pageSize': 10,
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        case '$kApiPrefix/notification/unread':
          return http.Response(
            jsonEncode({
              'code': 200,
              'msg': 'success',
              'data': {'count': 0},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        default:
          return http.Response(
            jsonEncode({'code': 404, 'msg': 'not found'}),
            404,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
      }
    });
  }

  void assertCommonRequests(List<_CapturedRequest> reqs) {
    expect(reqs.length, 5,
        reason: 'exactly 5 requests expected, got ${reqs.length}: '
            '${reqs.map((r) => r.fullUri).join(', ')}');

    for (final r in reqs) {
      expect(r.method, 'GET',
          reason: 'expected GET, got ${r.method} for ${r.fullUri}');
      expect(r.authHeader, 'Bearer test-token',
          reason:
              'expected Bearer test-token, got ${r.authHeader} for ${r.fullUri}');
      expect(r.contentType, 'application/json; charset=utf-8',
          reason: 'unexpected content-type for ${r.fullUri}: ${r.contentType}');
    }

    final paths = reqs.map((r) => r.fullUri).toSet();
    final testHost = ApiClient.baseUrl;
    expect(testHost, 'http://farmlink.test',
        reason: 'baseUrl should equal fixed test host');

    expect(
        paths,
        {
          '$testHost$kApiPrefix/agri/record/list?pageNum=1&pageSize=50',
          '$testHost$kApiPrefix/agri/weather',
          '$testHost$kApiPrefix/market/price',
          '$testHost$kApiPrefix/notification/unread',
          '$testHost$kApiPrefix/policy/list?pageNum=1&pageSize=10',
        },
        reason: 'exact request paths mismatch. Got: $paths');
  }

  setUp(() {
    captured.clear();
    resetApiClient();
    SharedPreferences.setMockInitialValues({
      'user': jsonEncode({
        'id': 1,
        'username': 'farmer1',
        'nickname': '老李',
        'role': 'FARMER',
      }),
    });
    mockClient = createMockClient(captured);
    ApiClient.setClientForTesting(mockClient);
  });

  tearDown(() async {
    router?.dispose();
    auth?.dispose();
    resetApiClient();
    ApiClient.setClientForTesting(null);
    mockClient?.close();
    mockClient = null;
  });

  Future<void> pumpFarmLinkApp(WidgetTester tester) async {
    final storage = InMemoryCredentialStorage(
      const AuthCredentials(
          accessToken: 'test-token', refreshToken: 'test-refresh'),
    );

    final localAuth = AuthState(credentialStorage: storage);
    await localAuth.init();
    auth = localAuth;

    ApiClient.baseUrl = 'http://farmlink.test';

    router = GoRouter(
      initialLocation: '/start',
      refreshListenable: auth!,
      redirect: (ctx, state) {
        if (auth!.loading) return null;
        final loc = state.uri.path;
        final loggedIn = auth!.isLoggedIn;
        if (!loggedIn && !loc.startsWith('/auth')) return '/auth/login';
        if (loggedIn && loc.startsWith('/auth')) return '/home';
        return null;
      },
      routes: [
        GoRoute(
          path: '/start',
          builder: (_, __) => const Scaffold(body: SizedBox.shrink()),
        ),
        GoRoute(path: '/home', builder: (_, __) => const HomePage()),
        GoRoute(
          path: '/agri',
          builder: (_, __) => const Scaffold(
            body: Center(child: Text('智慧种植', key: Key('agri_placeholder'))),
          ),
        ),
        GoRoute(
          path: '/market',
          builder: (_, __) => const Scaffold(
            body: Center(child: Text('乡村集市', key: Key('market_placeholder'))),
          ),
        ),
        GoRoute(
          path: '/machinery',
          builder: (_, __) => const Scaffold(
            body:
                Center(child: Text('农机共享', key: Key('machinery_placeholder'))),
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ChangeNotifierProvider<AuthState>.value(
        value: auth!,
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> openHome(WidgetTester tester) async {
    router!.go('/home');
    await tester.pumpAndSettle();
    expect(router!.routeInformationProvider.value.uri.toString(), '/home');
  }

  final filteredImageErrors = <String>[];

  const allowedImageUris = {
    'http://farmlink.test/uploads/site/smart-farming.jpg',
    'http://farmlink.test/uploads/site/farm-market.jpg',
    'http://farmlink.test/uploads/site/machinery-sharing.jpg',
  };

  Future<void> runTest(
      WidgetTester tester, Future<void> Function() body) async {
    filteredImageErrors.clear();
    final oldHandler = FlutterError.onError!;
    FlutterError.onError = (FlutterErrorDetails details) {
      final ex = details.exception;
      if (ex is NetworkImageLoadException &&
          ex.statusCode == 400 &&
          allowedImageUris.contains(ex.uri.toString())) {
        filteredImageErrors.add(ex.uri.toString());
        return;
      }
      oldHandler(details);
    };
    try {
      try {
        await body();
      } finally {
        // 仍在过滤器生效时卸载 widget
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump();
      }
    } finally {
      FlutterError.onError = oldHandler;
    }
  }

  /// 选中包裹 subtitle 的 GestureDetector 且 onTap 非 null（即 _bannerCard 自身），
  /// 排除 ListView/父级手势等 onTap 为 null 的拦截器。
  Finder tappableBannerFor(String subtitle) {
    final matches = find.ancestor(
      of: find.text(subtitle),
      matching: find.byWidgetPredicate(
        (widget) => widget is GestureDetector && widget.onTap != null,
        description: 'GestureDetector with non-null onTap for $subtitle',
      ),
    );
    expect(matches, findsOneWidget,
        reason:
            'expected exactly one tappable GestureDetector for "$subtitle"');
    return matches;
  }

  /// 拖动 ListView 直到目标 Text 构建，ensureVisible 后再 pumpAndSettle，
  /// 最后原 finder 严格 findsOneWidget。
  Future<void> scrollToAndVerify(
    WidgetTester tester,
    String text, {
    int maxScrolls = 20,
  }) async {
    final finder = find.text(text);
    for (int i = 0; i < maxScrolls; i++) {
      final matches = finder.evaluate();
      if (matches.isNotEmpty) {
        await tester.ensureVisible(finder.first);
        await tester.pumpAndSettle();
        break;
      }
      await tester.drag(find.byType(ListView).first, const Offset(0, -200));
      await tester.pumpAndSettle();
    }
    await tester.pumpAndSettle();
    expect(finder, findsOneWidget,
        reason: 'expected exactly one "$text" after scroll');
  }

  testWidgets('B15a: logged-in FARMER renders HomePage with core content',
      (WidgetTester tester) async {
    await runTest(tester, () async {
      await pumpFarmLinkApp(tester);
      await openHome(tester);

      assertCommonRequests(captured);

      expect(find.text('22°~34°  晴 · 湿度62% · 风2级 · 墒情适宜'), findsOneWidget);

      await scrollToAndVerify(tester, '核心服务');

      await scrollToAndVerify(tester, '病虫害识别 · 农事建档 · 专家在线');
      await scrollToAndVerify(tester, '产地直发 · 溯源好物 · 一键下单');
      await scrollToAndVerify(tester, '就近租用 · 真实预约 · 机主直联');

      await scrollToAndVerify(tester, '周边行情速览');

      await scrollToAndVerify(tester, '高山玉米 · 云谷农贸市场');
      await scrollToAndVerify(tester, '￥5.80');
      await scrollToAndVerify(tester, ' / 公斤');

      await scrollToAndVerify(tester, '符合你的补贴');
      await scrollToAndVerify(tester, '玉米种植补贴');
      await scrollToAndVerify(tester, '每亩补贴120元');
    });
  });

  testWidgets('B15b: navigate from /home to /agri via smart farming banner',
      (WidgetTester tester) async {
    await runTest(tester, () async {
      await pumpFarmLinkApp(tester);
      await openHome(tester);

      assertCommonRequests(captured);

      await scrollToAndVerify(tester, '病虫害识别 · 农事建档 · 专家在线');
      final bannerFinder = tappableBannerFor('病虫害识别 · 农事建档 · 专家在线');
      await tester.ensureVisible(bannerFinder);
      await tester.pumpAndSettle();
      // 验证仍在树中且唯一
      expect(bannerFinder, findsOneWidget);
      final center = tester.getCenter(bannerFinder);
      final logicalSize =
          tester.view.physicalSize / tester.view.devicePixelRatio;
      expect(center.dx, inExclusiveRange(0, logicalSize.width));
      expect(center.dy, inExclusiveRange(0, logicalSize.height));
      await tester.tap(bannerFinder);
      await tester.pumpAndSettle();

      final agriPlaceholder = find.byKey(const Key('agri_placeholder'));
      expect(agriPlaceholder, findsOneWidget);
      expect(GoRouterState.of(tester.element(agriPlaceholder)).uri.toString(),
          '/agri');
    });
  });

  testWidgets('B15c: navigate from /home to /market via trade banner',
      (WidgetTester tester) async {
    await runTest(tester, () async {
      await pumpFarmLinkApp(tester);
      await openHome(tester);

      assertCommonRequests(captured);

      await scrollToAndVerify(tester, '产地直发 · 溯源好物 · 一键下单');
      final bannerFinder = tappableBannerFor('产地直发 · 溯源好物 · 一键下单');
      await tester.ensureVisible(bannerFinder);
      await tester.pumpAndSettle();
      expect(bannerFinder, findsOneWidget);
      final center = tester.getCenter(bannerFinder);
      final logicalSize =
          tester.view.physicalSize / tester.view.devicePixelRatio;
      expect(center.dx, inExclusiveRange(0, logicalSize.width));
      expect(center.dy, inExclusiveRange(0, logicalSize.height));
      await tester.tap(bannerFinder);
      await tester.pumpAndSettle();

      final marketPlaceholder = find.byKey(const Key('market_placeholder'));
      expect(marketPlaceholder, findsOneWidget);
      expect(GoRouterState.of(tester.element(marketPlaceholder)).uri.toString(),
          '/market');
    });
  });

  testWidgets('B15d: navigate from /home to /machinery via machinery banner',
      (WidgetTester tester) async {
    await runTest(tester, () async {
      await pumpFarmLinkApp(tester);
      await openHome(tester);

      assertCommonRequests(captured);

      await scrollToAndVerify(tester, '就近租用 · 真实预约 · 机主直联');
      final bannerFinder = tappableBannerFor('就近租用 · 真实预约 · 机主直联');
      await tester.ensureVisible(bannerFinder);
      await tester.pumpAndSettle();
      expect(bannerFinder, findsOneWidget);
      final center = tester.getCenter(bannerFinder);
      final logicalSize =
          tester.view.physicalSize / tester.view.devicePixelRatio;
      expect(center.dx, inExclusiveRange(0, logicalSize.width));
      expect(center.dy, inExclusiveRange(0, logicalSize.height));
      await tester.tap(bannerFinder);
      await tester.pumpAndSettle();

      final machPlaceholder = find.byKey(const Key('machinery_placeholder'));
      expect(machPlaceholder, findsOneWidget);
      expect(GoRouterState.of(tester.element(machPlaceholder)).uri.toString(),
          '/machinery');
    });
  });

  // ── 116h-A polish：首页统一五态组件使用点（结构 + 文案断言） ──

  testWidgets('B17a: 首页加载态使用统一 FarmLoading 五态组件', (tester) async {
    await runTest(tester, () async {
      final gate = Completer<void>();
      mockClient = createMockClient(captured, weatherGate: gate.future);
      ApiClient.setClientForTesting(mockClient);
      await pumpFarmLinkApp(tester);

      router!.go('/home');
      await tester.pump(); // 处理 go_router 异步导航
      await tester.pump(const Duration(milliseconds: 300)); // 过渡帧：仍在加载态
      expect(find.byType(FarmLoading), findsOneWidget,
          reason: '首页加载态必须用统一五态 FarmLoading');
      expect(find.text('正在加载首页...'), findsOneWidget);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.byType(FarmLoading), findsNothing,
          reason: '数据就绪后加载态应消失');
      expect(find.text('22°~34°  晴 · 湿度62% · 风2级 · 墒情适宜'), findsOneWidget);
    });
  });

  testWidgets('B17b: 首页空行情使用统一 FarmEmpty 五态组件（紧凑模式）',
      (tester) async {
    await runTest(tester, () async {
      mockClient = createMockClient(captured, emptyPrices: true);
      ApiClient.setClientForTesting(mockClient);
      await pumpFarmLinkApp(tester);
      await openHome(tester);

      await scrollToAndVerify(tester, '周边行情速览');
      expect(find.byType(FarmEmpty), findsOneWidget,
          reason: '行情为空时必须渲染统一五态 FarmEmpty');
      expect(find.text('行情数据更新中'), findsOneWidget);
      // 紧凑行内图标（非整页大图标）
      final icon = tester.widget<Icon>(find.byIcon(Icons.trending_up_rounded));
      expect(icon.size, 20);
    });
  });
}
