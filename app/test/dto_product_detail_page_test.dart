import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/constants.dart';
import 'package:farmlink/core/dto/market_product.dart';
import 'package:farmlink/core/repository/product_repository.dart';
import 'package:farmlink/pages/market/product_detail_page.dart';
import 'package:farmlink/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// 116f-D 样板页迁移回归：product_detail_page 经 ProductRepository +
/// MarketProduct 读取后，渲染内容与迁移前逐项一致；注入 fake 仓储证明
/// 页面数据确实来自 repository（正向结果与 fallback 不同），而非兜底。
class _FakeProductRepository implements ProductRepository {
  _FakeProductRepository(this.result);

  MarketProduct? result;
  Object? error;
  int calls = 0;
  int? lastId;

  @override
  Future<MarketProduct?> fetchDetail(int productId) async {
    calls++;
    lastId = productId;
    final e = error;
    if (e != null) throw e;
    return result;
  }
}

MarketProduct _productFromRepo() => MarketProduct.fromJson(<String, dynamic>{
      'id': 7,
      'sellerId': 3,
      'title': '来自仓库的高山玉米',
      'category': '蔬菜',
      'description': '仓库返回的商品介绍',
      'price': 9.9,
      'unit': '公斤',
      'stock': 5,
      'images': <dynamic>[],
      'regionCode': '510131',
      'seller': <String, dynamic>{
        'id': 3,
        'nickname': '仓库卖家',
        'villageName': '仓库村',
        'phone': '13800138000',
      },
    });

void main() {
  GoRouter routerWith(
    int? productId,
    ProductRepository repository, {
    ProductPreview? preview,
  }) {
    return GoRouter(
      initialLocation: productId == null
          ? '/market/product/x'
          : '/market/product/$productId',
      routes: <RouteBase>[
        GoRoute(
          path: '/market/product/:id',
          builder: (_, state) => ProductDetailPage(
            productId: int.tryParse(state.pathParameters['id'] ?? ''),
            preview: preview,
            repository: repository,
          ),
        ),
      ],
    );
  }

  testWidgets('正向：字段全部来自 repository 响应（与 preview 兜底不同，证明命中仓储）',
      (WidgetTester tester) async {
    final fake = _FakeProductRepository(_productFromRepo());
    final router = routerWith(7, fake);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(fake.calls, 1);
    expect(fake.lastId, 7);

    // 标题（AppBar + 正文，共 2 处）
    expect(find.text('来自仓库的高山玉米'), findsNWidgets(2));
    final titleContrast = tester.widget<Container>(
        find.byKey(const Key('product_gallery_title_contrast')));
    final titleDecoration = titleContrast.decoration as BoxDecoration;
    expect(titleDecoration.color, AppColors.surface.withValues(alpha: 0.86));
    // 价格（正文 + 吸底栏，共 2 处）
    expect(find.text('￥9.90'), findsNWidgets(2));
    expect(find.text('/公斤'), findsNWidgets(2));
    expect(find.text('库存 5 公斤'), findsOneWidget);
    expect(find.text('蔬菜'), findsOneWidget);
    expect(find.text('仓库返回的商品介绍'), findsOneWidget);
    expect(find.text('仓库卖家'), findsOneWidget);
    expect(find.text('仓库村'), findsOneWidget);
    expect(find.text('仓库村 · 源头直发'), findsOneWidget);
    // 有库存 → 吸底按钮可用且文案为「加入合计」
    expect(find.text('加入合计'), findsOneWidget);
    expect(find.text('暂时缺货'), findsNothing);
    // 无图片 → 图廊占位，无网络/资产请求
    expect(find.byIcon(Icons.storefront), findsOneWidget);
  });

  testWidgets('stock=0：吸底按钮禁用并显示「暂时缺货」（与迁移前一致）', (WidgetTester tester) async {
    final fake = _FakeProductRepository(
      MarketProduct.fromJson(<String, dynamic>{
        'id': 8,
        'title': '缺货商品',
        'price': 1,
        'stock': 0,
        'category': '水果',
      }),
    );
    final router = routerWith(8, fake);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.text('暂时缺货'), findsNWidgets(2)); // 库存行 + 按钮
    final button = tester.widget<ElevatedButton>(
      find.ancestor(
        of: find.text('暂时缺货'),
        // ElevatedButton.icon 实为 _ElevatedButtonWithIcon 子类，需子类型匹配
        matching: find.byWidgetPredicate((w) => w is ElevatedButton),
      ),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('repository 抛错 → 整屏错误 + 重试恢复（旧错误路径保留）',
      (WidgetTester tester) async {
    final fake = _FakeProductRepository(_productFromRepo())
      ..error = ApiException(50001, '服务器异常');
    final router = routerWith(7, fake);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.byType(ErrorRetry), findsOneWidget);
    expect(find.text('服务器异常'), findsOneWidget);

    // 恢复后重试命中 repository 数据
    fake.error = null;
    await tester.tap(find.text('重试'));
    await tester.pumpAndSettle();

    expect(fake.calls, 2);
    expect(find.text('来自仓库的高山玉米'), findsNWidgets(2));
  });

  testWidgets('productId 为 null：直接显示服务不可用（旧逻辑保留，不发请求）',
      (WidgetTester tester) async {
    final fake = _FakeProductRepository(null);
    final router = routerWith(null, fake);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(fake.calls, 0);
    expect(find.text(serviceUnavailableMessage), findsOneWidget);
    expect(find.text('加入合计'), findsNothing);
  });

  testWidgets('repository 返回 null 且带 preview：标题/价格/单位回退 preview（回退链不变）',
      (WidgetTester tester) async {
    final fake = _FakeProductRepository(null);
    final router = routerWith(
      7,
      fake,
      preview: const ProductPreview(
        image: '',
        title: '预览标题',
        price: 3.5,
        unit: '斤',
      ),
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.text('预览标题'), findsNWidgets(2));
    expect(find.text('￥3.50'), findsNWidgets(2));
    expect(find.text('/斤'), findsNWidgets(2));
    // 数据未命中 → 按钮禁用（label 仍为「加入合计」，与迁移前一致）
    expect(find.text('加入合计'), findsOneWidget);
  });
}
