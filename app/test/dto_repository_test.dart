import 'dart:convert';

import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/constants.dart';
import 'package:farmlink/core/dto/market_product.dart';
import 'package:farmlink/core/repository/http_repository.dart';
import 'package:farmlink/core/repository/product_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 116f-D C6：Repository 接口可注入 fake；HttpRepository 经 ApiClient.v2
/// 请求 mount-relative `/market/products/:id`（外部 `/api/v2/market/products/:id`），
/// 复用统一信封解析，不复制 HTTP/认证逻辑。
class _FakeProductRepository implements ProductRepository {
  _FakeProductRepository(this.result);

  final MarketProduct? result;
  int calls = 0;
  int? lastId;

  @override
  Future<MarketProduct?> fetchDetail(int productId) async {
    calls++;
    lastId = productId;
    return result;
  }
}

void main() {
  test('ProductRepository 接口可注入 fake（无任何 HTTP 依赖）', () async {
    final fake = _FakeProductRepository(
      MarketProduct.fromJson(<String, dynamic>{'id': 1, 'title': '注入数据'}),
    );

    final product = await fake.fetchDetail(1);

    expect(fake.calls, 1);
    expect(fake.lastId, 1);
    expect(product!.title, '注入数据');
  });

  test('HttpRepository 经 ApiClient.v2 命中 /api/v2/market/products/:id 并解析为 DTO',
      () async {
    final captured = <http.Request>[];
    final mock = MockClient((request) async {
      captured.add(request);
      return http.Response(
        jsonEncode(<String, dynamic>{
          'code': 200,
          'msg': 'success',
          'data': <String, dynamic>{
            'id': 7,
            'title': '高山玉米',
            'price': 5.8,
            'unit': '公斤',
            'stock': 12,
            'category': '蔬菜',
            'images': <dynamic>['a.jpg'],
            'seller': <String, dynamic>{
              'id': 3,
              'nickname': '老李',
              'villageName': '松华村',
              'phone': '13800138000',
            },
          },
        }),
        200,
        headers: <String, String>{
          'content-type': 'application/json; charset=utf-8',
        },
      );
    });

    ApiClient.setClientForTesting(mock);
    ApiClient.baseUrl = 'http://farmlink.test';
    ApiClient.setToken('test-token');
    try {
      const repository = HttpRepository();
      final product = await repository.fetchDetail(7);

      expect(captured, hasLength(1));
      // 外部完整路径 = kV2Prefix + mount-relative path
      expect(captured.single.url.path, '$kV2Prefix/market/products/7');
      // 复用同一条认证链：Bearer 头随 v1 一致携带
      expect(captured.single.headers['authorization'], 'Bearer test-token');

      expect(product, isNotNull);
      expect(product!.id, 7);
      expect(product.title, '高山玉米');
      expect(product.price, 5.8);
      expect(product.unit, '公斤');
      expect(product.stock, 12);
      expect(product.seller!.nickname, '老李');
    } finally {
      ApiClient.setClientForTesting(null);
      ApiClient.setToken(null);
      ApiClient.baseUrl = kBaseUrl;
    }
  });

  test('data 为 null 时返回 null（与旧页面 _data=null 铺底语义一致，不抛错）',
      () async {
    final mock = MockClient(
      (request) async => http.Response(
        jsonEncode(<String, dynamic>{'code': 200, 'msg': 'success', 'data': null}),
        200,
        headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
      ),
    );
    ApiClient.setClientForTesting(mock);
    ApiClient.baseUrl = 'http://farmlink.test';
    ApiClient.setToken(null);
    try {
      const repository = HttpRepository();
      expect(await repository.fetchDetail(7), isNull);
    } finally {
      ApiClient.setClientForTesting(null);
      ApiClient.baseUrl = kBaseUrl;
    }
  });

  test('data 非对象（如数组）时返回 null 而非崩溃（比旧页面裸 TypeError 更稳）',
      () async {
    final mock = MockClient(
      (request) async => http.Response(
        jsonEncode(<String, dynamic>{
          'code': 200,
          'msg': 'success',
          'data': <dynamic>[1, 2],
        }),
        200,
        headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
      ),
    );
    ApiClient.setClientForTesting(mock);
    ApiClient.baseUrl = 'http://farmlink.test';
    ApiClient.setToken(null);
    try {
      const repository = HttpRepository();
      expect(await repository.fetchDetail(7), isNull);
    } finally {
      ApiClient.setClientForTesting(null);
      ApiClient.baseUrl = kBaseUrl;
    }
  });

  test('业务码非 200 抛 ApiException（复用统一信封解析，页面走既有错误路径）',
      () async {
    final mock = MockClient(
      (request) async => http.Response(
        jsonEncode(<String, dynamic>{'code': 40401, 'msg': '商品不存在'}),
        200,
        headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
      ),
    );
    ApiClient.setClientForTesting(mock);
    ApiClient.baseUrl = 'http://farmlink.test';
    ApiClient.setToken(null);
    try {
      const repository = HttpRepository();
      await expectLater(
        repository.fetchDetail(999),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 40401)
              .having((e) => e.message, 'message', '商品不存在'),
        ),
      );
    } finally {
      ApiClient.setClientForTesting(null);
      ApiClient.baseUrl = kBaseUrl;
    }
  });
}
