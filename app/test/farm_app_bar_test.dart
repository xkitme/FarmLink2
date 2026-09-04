import 'dart:async';

import 'package:farmlink/design_system/farm_brand.dart';
import 'package:farmlink/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// 116h-A 系统导航收口：FarmAppBar 层级契约测试。
///
/// 契约：
/// 1. 一级 tab 顶层页（path ∈ kTopLevelTabPaths 且无返回栈）：
///    - 左上角不显示返回箭头、不显示品牌图（leading 空）；
///    - 右上角显示田园通品牌入口（tooltip '田园通'），点击回 /home。
/// 2. 二级及以上页面（path ∉ 一级顶层 或 可返回）：
///    - 左上角统一显示返回箭头；右上角无品牌入口。
/// 3. 返回箭头：可 pop 则 pop（返回动画反向），否则 go(backFallback)。
/// 4. showBack 显式 true/false 覆盖自动判定。
///
/// 断言全部基于 widget 语义（页面文本 / tooltip / 组件类型），
/// 不依赖 routeInformationProvider——go_router 的 push 不刷新该 provider，
/// 只有 go 会刷新，用 UI 断言对两种导航方式都稳定。
class _Host extends StatelessWidget {
  final String title;
  final bool? showBack;
  const _Host(this.title, {this.showBack});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: FarmAppBar(title: title, showBack: showBack),
      body: const Center(child: Text('body')),
    );
  }
}

void main() {
  GoRouter? router;

  tearDown(() => router?.dispose());

  String currentPath() => router!.routeInformationProvider.value.uri.path;

  Future<void> pumpRouter(
    WidgetTester tester, {
    String initial = '/home',
    Map<String, Widget Function()>? pages,
  }) async {
    final map = pages ??
        {
          '/home': () => const _Host('首页'),
          '/market': () => const _Host('乡村集市'),
          '/orders': () => const _Host('我的订单'),
          '/messages': () => const _Host('消息'),
        };
    router = GoRouter(
      initialLocation: initial,
      routes: [
        for (final entry in map.entries)
          GoRoute(path: entry.key, builder: (_, __) => entry.value()),
      ],
    );
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();
  }

  testWidgets('一级 tab 顶层（/home 直达）：无返回箭头、右上品牌入口、无左上品牌图',
      (tester) async {
    await pumpRouter(tester);
    expect(currentPath(), '/home');
    expect(find.byTooltip('返回'), findsNothing,
        reason: '一级 tab 顶层不应显示返回箭头');
    expect(find.byType(FarmBrand), findsOneWidget,
        reason: '一级顶层右上角应显示田园通品牌入口');
    expect(find.text('首页'), findsOneWidget);
  });

  testWidgets('一级 tab 顶层（go 到 /market）：同样一级形态', (tester) async {
    await pumpRouter(tester);
    router!.go('/market');
    await tester.pumpAndSettle();
    expect(currentPath(), '/market');
    expect(find.text('乡村集市'), findsOneWidget);
    expect(find.byTooltip('返回'), findsNothing);
    expect(find.byType(FarmBrand), findsOneWidget);
  });

  testWidgets('push 进入的二级页：左上返回箭头、右上无品牌入口',
      (tester) async {
    await pumpRouter(tester);
    // push 导航 future 依赖帧推进，不可 await（会死锁），fire-and-forget 后 settle
    unawaited(router!.push('/orders'));
    await tester.pumpAndSettle();
    expect(find.text('我的订单'), findsOneWidget,
        reason: 'push 后应显示订单页');
    expect(find.byTooltip('返回'), findsOneWidget,
        reason: 'push 进入的二级页必须显示返回箭头');
    expect(find.byType(FarmBrand), findsNothing,
        reason: '二级页不应显示一级页品牌入口');
    // pop 返回（canPop=true → 真 pop，动画反向）
    router!.pop();
    await tester.pumpAndSettle();
    expect(find.text('首页'), findsOneWidget, reason: 'pop 应回到上一页 /home');
  });

  testWidgets('go 直达的二级页（无返回栈）：仍显示返回箭头，点击回 backFallback',
      (tester) async {
    await pumpRouter(tester);
    router!.go('/messages'); // go 直达：canPop=false
    await tester.pumpAndSettle();
    expect(find.text('消息'), findsOneWidget);
    expect(find.byTooltip('返回'), findsOneWidget,
        reason: '二级页（即使 go 直达）也必须显示返回箭头');
    expect(find.byType(FarmBrand), findsNothing);
    // 不可 pop → fallback go('/home')
    await tester.tap(find.byTooltip('返回'));
    await tester.pumpAndSettle();
    expect(find.text('首页'), findsOneWidget,
        reason: '无返回栈时应回 backFallback(/home)');
  });

  testWidgets('push 到一级 tab 路径（如从首页进集市）：按二级处理显示返回箭头',
      (tester) async {
    await pumpRouter(tester);
    unawaited(router!.push('/market'));
    await tester.pumpAndSettle();
    expect(find.text('乡村集市'), findsOneWidget,
        reason: 'push 后应显示集市页');
    expect(find.byTooltip('返回'), findsOneWidget,
        reason: 'push 进入的一级 tab 路径仍应显示返回箭头（可从首页返回）');
    expect(find.byType(FarmBrand), findsNothing,
        reason: 'push 进入视作二级语境，不显示一级品牌入口');
    router!.pop();
    await tester.pumpAndSettle();
    expect(find.text('首页'), findsOneWidget, reason: 'pop 应回到 /home');
  });

  testWidgets('品牌入口点击回品牌首页 /home', (tester) async {
    await pumpRouter(tester, initial: '/market');
    await tester.pumpAndSettle();
    expect(find.text('乡村集市'), findsOneWidget);
    expect(find.byType(FarmBrand), findsOneWidget);
    await tester.tap(find.byTooltip('田园通'));
    await tester.pumpAndSettle();
    expect(find.text('首页'), findsOneWidget,
        reason: '品牌入口应回到品牌首页 /home');
  });

  testWidgets('显式 showBack=true 强制返回箭头；showBack=false 强制一级形态',
      (tester) async {
    await pumpRouter(tester, initial: '/home', pages: {
      '/home': () => const _Host('首页', showBack: true),
      '/market': () => const _Host('乡村集市', showBack: false),
    });
    await tester.pumpAndSettle();
    expect(find.byTooltip('返回'), findsOneWidget,
        reason: 'showBack=true 显式覆盖应显示返回箭头');
    router!.go('/market');
    await tester.pumpAndSettle();
    expect(find.text('乡村集市'), findsOneWidget);
    expect(find.byTooltip('返回'), findsNothing,
        reason: 'showBack=false 显式覆盖应隐藏返回箭头');
    expect(find.byType(FarmBrand), findsOneWidget,
        reason: 'showBack=false 视为一级形态，右上应显示品牌入口');
  });

  testWidgets('一级形态在 411 / 适老宽度下不溢出（品牌入口 + 搜索 + 铃铛齐全）',
      (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(411, 731);
    addTearDown(tester.view.reset);
    await pumpRouter(tester, pages: {
      '/home': () => const _Host('首页'),
    });
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull,
        reason: '一级形态 411 宽不应有 RenderFlex overflow');
    expect(find.byType(FarmBrand), findsOneWidget);
    expect(find.byTooltip('全局搜索'), findsOneWidget);
    expect(find.byTooltip('消息通知'), findsOneWidget);
  });
}
