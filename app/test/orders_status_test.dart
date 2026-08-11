import 'dart:convert';

import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/auth_credential_store.dart';
import 'package:farmlink/core/auth_state.dart';
import 'package:farmlink/core/constants.dart';
import 'package:farmlink/pages/market/orders_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/painting.dart';
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
  final filteredImageErrors = <String>[];

  const _allowedImageUris = <String>{
    'http://farmlink.test/uploads/site/smart-farming.jpg',
    'http://farmlink.test/uploads/site/farm-market.jpg',
    'http://farmlink.test/uploads/site/machinery-sharing.jpg',
  };

  void resetApiClient() {
    ApiClient.baseUrl = kBaseUrl;
    ApiClient.setToken(null);
    ApiClient.configureAuth(
      refreshHandler: () async => false,
      sessionExpiredHandler: () async {},
    );
  }

  http.Client createMockClient(List<_CapturedRequest> captured) {
    return MockClient((request) async {
      final uri = request.url;
      captured.add(_CapturedRequest(
        method: request.method,
        fullUri: uri.toString(),
        authHeader: request.headers['authorization'],
        contentType: request.headers['content-type'],
      ));

      if (uri.path == '$kApiPrefix/market/order/list') {
        return http.Response(
          jsonEncode({
            'code': 200,
            'msg': 'success',
            'data': {
              'records': [
                {
                  'orderNo': 'OR20260811001',
                  'status': 'PENDING',
                  'totalAmount': 128.00,
                  'quantity': 5,
                  'product': {'title': '高山散养土鸡蛋', 'unit': '公斤'},
                  'receiverInfo': {
                    'realName': '老李',
                    'phone': '13800001111',
                    'address': '云谷村三组'
                  },
                },
                {
                  'orderNo': 'OR20260811002',
                  'status': 'PAID',
                  'totalAmount': 58.50,
                  'quantity': 3,
                  'product': {'title': '有机西红柿', 'unit': '公斤'},
                  'receiverInfo': {
                    'realName': '老李',
                    'phone': '13800001111',
                    'address': '云谷村三组'
                  },
                },
                {
                  'orderNo': 'OR20260811003',
                  'status': 'SHIPPED',
                  'totalAmount': 256.00,
                  'quantity': 2,
                  'product': {'title': '农家腊肉', 'unit': '份'},
                  'receiverInfo': {
                    'realName': '老李',
                    'phone': '13800001111',
                    'address': '云谷村三组'
                  },
                },
                {
                  'orderNo': 'OR20260811004',
                  'status': 'DONE',
                  'totalAmount': 39.90,
                  'quantity': 1,
                  'product': {'title': '手工红薯粉条', 'unit': '袋'},
                  'receiverInfo': {
                    'realName': '老李',
                    'phone': '13800001111',
                    'address': '云谷村三组'
                  },
                },
                {
                  'orderNo': 'OR20260811005',
                  'status': 'CANCELLED',
                  'totalAmount': 88.00,
                  'quantity': 4,
                  'product': {'title': '新鲜竹笋', 'unit': '公斤'},
                  'receiverInfo': {
                    'realName': '老李',
                    'phone': '13800001111',
                    'address': '云谷村三组'
                  },
                },
              ],
              'total': 5,
              'pageNum': 1,
              'pageSize': 50,
            },
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }
      return http.Response(
        jsonEncode({'code': 404, 'msg': 'not found'}),
        404,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    });
  }

  Future<void> runTest(
      WidgetTester tester, Future<void> Function() body) async {
    filteredImageErrors.clear();
    final oldHandler = FlutterError.onError!;
    FlutterError.onError = (FlutterErrorDetails details) {
      final ex = details.exception;
      if (ex is NetworkImageLoadException &&
          ex.statusCode == 400 &&
          _allowedImageUris.contains(ex.uri.toString())) {
        filteredImageErrors.add(ex.uri.toString());
        return;
      }
      oldHandler(details);
    };
    try {
      try {
        await body();
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump();
      }
    } finally {
      FlutterError.onError = oldHandler;
    }
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
      initialLocation: '/orders',
      routes: [
        GoRoute(
          path: '/orders',
          builder: (_, __) => const OrdersPage(),
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

  testWidgets('B16: renders 5 orders with correct Chinese status labels',
      (WidgetTester tester) async {
    await runTest(tester, () async {
      await pumpFarmLinkApp(tester);

      // ── 请求契约 ──
      expect(captured.length, 1,
          reason: 'exactly 1 request expected, got ${captured.length}');
      final req = captured.single;
      expect(req.method, 'GET');
      expect(req.authHeader, 'Bearer test-token');
      expect(req.contentType, 'application/json; charset=utf-8');
      final testHost = ApiClient.baseUrl;
      expect(testHost, 'http://farmlink.test');
      expect(req.fullUri,
          '$testHost$kApiPrefix/market/order/list?role=buyer&pageNum=1&pageSize=50');

      // ── 标题 ──
      expect(find.text('我的订单'), findsOneWidget);

      // ── 5 个订单卡片：单次线性滚动，逐张验证（ListView 回收，一次只验证当前可见卡片） ──
      final orders = <({
        String orderNo,
        String status,
        String product,
        String quantity,
        String amount
      })>[
        (
          orderNo: 'OR20260811001',
          status: '待支付',
          product: '高山散养土鸡蛋',
          quantity: '数量 5公斤',
          amount: '￥128.00'
        ),
        (
          orderNo: 'OR20260811002',
          status: '已支付',
          product: '有机西红柿',
          quantity: '数量 3公斤',
          amount: '￥58.50'
        ),
        (
          orderNo: 'OR20260811003',
          status: '已发货',
          product: '农家腊肉',
          quantity: '数量 2份',
          amount: '￥256.00'
        ),
        (
          orderNo: 'OR20260811004',
          status: '已完成',
          product: '手工红薯粉条',
          quantity: '数量 1袋',
          amount: '￥39.90'
        ),
        (
          orderNo: 'OR20260811005',
          status: '已取消',
          product: '新鲜竹笋',
          quantity: '数量 4公斤',
          amount: '￥88.00'
        ),
      ];

      for (final o in orders) {
        final orderNoFinder = find.text('订单号 ${o.orderNo}');
        await tester.ensureVisible(orderNoFinder);
        await tester.pumpAndSettle();
        expect(orderNoFinder, findsOneWidget);
        expect(find.text(o.status), findsOneWidget);
        expect(find.text(o.product), findsOneWidget);
        expect(find.text(o.quantity), findsOneWidget);
        expect(find.text(o.amount), findsOneWidget);
      }

      // ── 收货人信息（所有订单同一收件人；用 .first 精确定位一个可见卡片） ──
      final receiverFinder = find.textContaining('老李 · 13800001111 · 云谷村三组');
      await tester.ensureVisible(receiverFinder.first);
      await tester.pumpAndSettle();
      expect(receiverFinder, findsAtLeastNWidgets(1));
    });
  });
}
