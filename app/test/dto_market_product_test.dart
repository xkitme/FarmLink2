import 'package:farmlink/core/dto/market_product.dart';
import 'package:flutter_test/flutter_test.dart';

/// 116f-D C6：MarketProduct typed DTO 解析正确，
/// 且异常字段容错与迁移前的 `product_detail_page.dart` 深解析行为逐项一致。
void main() {
  Map<String, dynamic> fullPayload() => <String, dynamic>{
        'id': 7,
        'sellerId': 3,
        'title': '高山玉米',
        'category': '蔬菜',
        'description': '  田间当日采收  ',
        'price': 5.8,
        'unit': '公斤',
        'stock': 12,
        'images': <dynamic>['a.jpg', '', 'b.jpg'],
        'traceCode': 'TR-001',
        'regionCode': '510131',
        'status': 1,
        'soldCount': 9,
        'seller': <String, dynamic>{
          'id': 3,
          'nickname': '老李',
          'villageName': '松华村',
          'phone': '13800138000',
        },
      };

  test('完整 payload：全部字段与 seller 投影解析正确', () {
    final p = MarketProduct.fromJson(fullPayload());

    expect(p.id, 7);
    expect(p.sellerId, 3);
    expect(p.title, '高山玉米');
    expect(p.category, '蔬菜');
    expect(p.description, '田间当日采收'); // 去首尾空白
    expect(p.price, 5.8);
    expect(p.unit, '公斤');
    expect(p.stock, 12);
    expect(p.images, <String>['a.jpg', 'b.jpg']); // 空串被过滤
    expect(p.traceCode, 'TR-001');
    expect(p.regionCode, '510131');
    expect(p.status, 1);
    expect(p.soldCount, 9);

    final seller = p.seller!;
    expect(seller.id, 3);
    expect(seller.nickname, '老李');
    expect(seller.villageName, '松华村');
    expect(seller.phone, '13800138000');
  });

  test('缺失/null 字段保持 null 或旧页面默认（页面按 preview 回退链取值）', () {
    final p = MarketProduct.fromJson(<String, dynamic>{'id': 7});

    expect(p.id, 7);
    expect(p.sellerId, isNull);
    expect(p.title, isNull); // 旧页面 null → preview.title ?? '乡村好物'
    expect(p.price, isNull); // 旧页面 null → preview.price ?? 0
    expect(p.unit, isNull); // 旧页面 null → preview.unit ?? '件'
    expect(p.stock, 0);
    expect(p.category, '农产品');
    expect(p.description, '');
    expect(p.images, isEmpty);
    expect(p.regionCode, isNull);
    expect(p.traceCode, isNull);
    expect(p.status, 1);
    expect(p.soldCount, 0);
    expect(p.seller, isNull);
  });

  test('显式空字符串字段原样保留（旧页面同样展示空串而非回退）', () {
    final p = MarketProduct.fromJson(<String, dynamic>{
      'title': '',
      'unit': '',
      'category': '',
      'price': 1,
      'stock': 1,
    });

    expect(p.title, '');
    expect(p.unit, '');
    expect(p.category, '');
  });

  test('images 字符串化 + 过滤空串；null 元素按旧页面字符串化为 "null"', () {
    final p = MarketProduct.fromJson(<String, dynamic>{
      'images': <dynamic>[null, 'x.jpg', 42, ''],
    });

    // 旧页面 `raw.map((e) => '$e')`：null → 'null'、42 → '42'，再过滤空串
    expect(p.images, <String>['null', 'x.jpg', '42']);
  });

  test('regionCode/traceCode/seller.phone 空白归一为 null', () {
    final p = MarketProduct.fromJson(<String, dynamic>{
      'regionCode': '  ',
      'traceCode': '',
      'seller': <String, dynamic>{'phone': '  '},
    });

    expect(p.regionCode, isNull);
    expect(p.traceCode, isNull);
    expect(p.seller!.phone, isNull);
  });

  test('非数字 price 与旧页面同样抛 TypeError（容错口径一致）', () {
    expect(
      () => MarketProduct.fromJson(<String, dynamic>{'price': 'abc'}),
      throwsA(isA<TypeError>()),
    );
  });

  test('seller 为非 Map 时与旧页面同样抛 TypeError（容错口径一致）', () {
    expect(
      () => MarketProduct.fromJson(<String, dynamic>{'seller': 'x'}),
      throwsA(isA<TypeError>()),
    );
  });
}
