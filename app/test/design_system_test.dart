import 'package:farmlink/core/constants.dart';
import 'package:farmlink/design_system/farm_state_views.dart';
import 'package:farmlink/design_system/farm_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

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
  });
}
