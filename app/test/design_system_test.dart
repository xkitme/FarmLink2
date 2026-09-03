import 'package:farmlink/core/constants.dart';
import 'package:farmlink/design_system/farm_brand.dart';
import 'package:farmlink/design_system/farm_state_views.dart';
import 'package:farmlink/design_system/farm_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

/// 品牌图加载必失败的 asset bundle，用于触发 FarmBrand errorBuilder。
class _ThrowingAssetBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) async {
    throw FlutterError('asset not found: $key');
  }
}

void main() {
  group('设计 token', () {
    test('FarmColors 语义色映射 AppColors', () {
      expect(FarmColors.primary, AppColors.primary);
      expect(FarmColors.background, AppColors.background);
      expect(FarmColors.surface, AppColors.surface);
      expect(FarmColors.error, AppColors.error);
      expect(FarmColors.onSurface, AppColors.onSurface);
      expect(FarmColors.onSurfaceVariant, AppColors.onSurfaceVariant);
    });

    test('FarmRadius 圆角 token 与 R 一致', () {
      expect(FarmRadius.sm, R.sm);
      expect(FarmRadius.md, R.md);
      expect(FarmRadius.lg, R.lg);
      expect(FarmRadius.pill, R.pill);
    });

    test('适老模式文本缩放下限高于常规上限', () {
      expect(
        FarmTypography.elderMinTextScale,
        greaterThan(FarmTypography.maxTextScale),
      );
    });
  });

  group('FarmViewState 五态', () {
    test('枚举包含五个互异状态', () {
      expect(FarmViewState.values, hasLength(5));
      expect(FarmViewState.values, containsAll(const [
        FarmViewState.loading,
        FarmViewState.empty,
        FarmViewState.error,
        FarmViewState.unauthorized,
        FarmViewState.offline,
      ]));
    });

    testWidgets('loading 渲染转圈', (tester) async {
      await tester.pumpWidget(_wrap(const FarmLoading(text: '加载中')));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('加载中'), findsOneWidget);
    });

    testWidgets('empty 渲染空态文案', (tester) async {
      await tester.pumpWidget(_wrap(const FarmEmpty('暂无记录')));
      expect(find.text('暂无记录'), findsOneWidget);
    });

    testWidgets('error 渲染文案与重试按钮', (tester) async {
      var retried = 0;
      await tester.pumpWidget(_wrap(FarmError('出错了', onRetry: () => retried++)));
      expect(find.text('出错了'), findsOneWidget);
      await tester.tap(find.text('重试'));
      expect(retried, 1);
    });

    testWidgets('unauthorized 渲染重新登录按钮', (tester) async {
      var login = 0;
      await tester.pumpWidget(
          _wrap(FarmUnauthorized('登录过期', onLogin: () => login++)));
      expect(find.text('登录过期'), findsOneWidget);
      await tester.tap(find.text('重新登录'));
      expect(login, 1);
    });

    testWidgets('offline 渲染离线图标与重试', (tester) async {
      var retried = 0;
      await tester.pumpWidget(_wrap(
          FarmOffline('服务暂时不可用，请稍后重试', onRetry: () => retried++)));
      expect(find.byIcon(Icons.cloud_off_rounded), findsOneWidget);
      expect(find.text('服务暂时不可用，请稍后重试'), findsOneWidget);
    });

    testWidgets('FarmStateView 按状态分发到对应视图', (tester) async {
      await tester.pumpWidget(_wrap(const FarmStateView(
        state: FarmViewState.offline,
        message: '离线了',
      )));
      expect(find.byIcon(Icons.cloud_off_rounded), findsOneWidget);
      expect(find.text('离线了'), findsOneWidget);
    });

    testWidgets('FarmStateView 五态全分发：loading/empty/error/unauthorized',
        (tester) async {
      await tester.pumpWidget(_wrap(const FarmStateView(
        state: FarmViewState.loading,
        message: '加载中',
      )));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('加载中'), findsOneWidget);

      await tester.pumpWidget(_wrap(const FarmStateView(
        state: FarmViewState.empty,
        message: '暂无数据',
      )));
      expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
      expect(find.text('暂无数据'), findsOneWidget);

      await tester.pumpWidget(_wrap(FarmStateView(
        state: FarmViewState.error,
        message: '加载失败',
        onRetry: () {},
      )));
      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
      expect(find.text('加载失败'), findsOneWidget);
      expect(find.text('重试'), findsOneWidget);

      await tester.pumpWidget(_wrap(FarmStateView(
        state: FarmViewState.unauthorized,
        message: '登录已过期',
        onLogin: () {},
      )));
      expect(find.byIcon(Icons.lock_outline_rounded), findsOneWidget);
      expect(find.text('登录已过期'), findsOneWidget);
      expect(find.text('重新登录'), findsOneWidget);
    });

    testWidgets('FarmEmpty compact 紧凑行内模式（卡片内空态）', (tester) async {
      await tester.pumpWidget(_wrap(const FarmEmpty('行情数据更新中',
          icon: Icons.trending_up_rounded, compact: true)));
      expect(find.text('行情数据更新中'), findsOneWidget);
      expect(find.byIcon(Icons.trending_up_rounded), findsOneWidget);
      // 紧凑模式：小图标（20），无整页居中的大图标（56）
      final icon = tester.widget<Icon>(find.byIcon(Icons.trending_up_rounded));
      expect(icon.size, 20);
      // 结构：Row 行内布局
      expect(
        find.ancestor(
            of: find.text('行情数据更新中'), matching: find.byType(Row)),
        findsWidgets,
      );
    });
  });

  group('FarmBrand 品牌标识', () {
    testWidgets('使用真实品牌图 farmlink-mark.png + 「田园通」文字', (tester) async {
      await tester.pumpWidget(_wrap(const FarmBrand()));
      final image = tester.widget<Image>(find.byType(Image));
      expect((image.image as AssetImage).assetName,
          'assets/images/farmlink-mark.png');
      expect(image.alignment, Alignment.centerLeft);
      expect(find.text('田园通'), findsOneWidget);
    });

    testWidgets('showLabel=false 隐藏文字，markSize 生效', (tester) async {
      await tester.pumpWidget(_wrap(const FarmBrand(markSize: 44, showLabel: false)));
      expect(find.text('田园通'), findsNothing);
      final image = tester.widget<Image>(find.byType(Image));
      expect(image.width, 44);
      expect(image.height, 44);
    });

    testWidgets('FarmBrandMarkFallback 兜底块尺寸与主色', (tester) async {
      await tester.pumpWidget(
          _wrap(const FarmBrandMarkFallback(markSize: 40)));
      final box = tester.widget<Container>(find.descendant(
        of: find.byType(FarmBrandMarkFallback),
        matching: find.byType(Container),
      ));
      final deco = box.decoration as BoxDecoration;
      expect(deco.color, FarmColors.primary);
      expect(tester.getSize(find.byType(FarmBrandMarkFallback)),
          const Size(40, 40));
    });

    testWidgets('品牌图加载失败时渲染绿色兜底块（errorBuilder 生效）',
        (tester) async {
      // MaterialApp 会注入自己的 DefaultAssetBundle(rootBundle) 覆盖外层，
      // 因此这里不包 MaterialApp，直接用 Directionality + 必失败 bundle 触发 errorBuilder。
      await tester.pumpWidget(Directionality(
        textDirection: TextDirection.ltr,
        child: DefaultAssetBundle(
          bundle: _ThrowingAssetBundle(),
          child: const FarmBrand(markSize: 36),
        ),
      ));
      await tester.pump();
      await tester.pump();
      expect(find.byType(FarmBrandMarkFallback), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
