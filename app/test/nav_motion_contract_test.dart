import 'dart:async';
import 'dart:math' as math;

import 'package:farmlink/core/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// 116h-A 系统导航收口：页面切换动画方向契约。
///
/// 契约：进入下级（push）新页自右滑入（dx: +1 → 0）；返回（pop）动画自动反向，
/// 被退页面从原位滑出右侧（dx: 0 → +1）——前进/返回严格对称。
/// 若该方向被改反，用户会感到「返回像前进」（见 docs/108 push/pop 混用教训）。
///
/// 采样方式：页面被两层 SlideTransition 包裹（外层 secondary 视差、内层 enter
/// 主位移），取全部匹配 SlideTransition 的 dx 最大值——新页运动由 enter 主导，
/// 恒零或负视差不会干扰「正位移 = 页面位于/滑向右侧」的判定。
Widget _bPage(BuildContext _) => const Scaffold(body: Center(child: Text('B')));

void main() {
  Widget app({required Widget home}) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: home,
    );
  }
  double maxDxOf(WidgetTester tester, String marker) {
    final slideFinder = find.ancestor(
      of: find.text(marker),
      matching: find.byType(SlideTransition),
    );
    expect(slideFinder, findsWidgets, reason: '$marker 页应被 SlideTransition 包裹');
    final slides = tester.widgetList<SlideTransition>(slideFinder).toList();
    var maxDx = 0.0;
    for (final s in slides) {
      maxDx = math.max(maxDx, s.position.value.dx);
    }
    return maxDx;
  }

  testWidgets('push 进入下级：新页从右滑入（dx 由正变 0）', (tester) async {
    await tester.pumpWidget(app(
      home: const Scaffold(body: Center(child: Text('A'))),
    ));
    final nav = tester.state<NavigatorState>(find.byType(Navigator));
    unawaited(nav.push(
      MaterialPageRoute<void>(builder: _bPage),
    ));
    // 中途采样：新页应仍在右侧（dx > 0），旧页不得向右前进
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 150));
    final mid = maxDxOf(tester, 'B');
    expect(mid, greaterThan(0.05),
        reason: 'push 动画中段，新页应位于右侧（dx>0.05），实际 $mid');
    expect(maxDxOf(tester, 'A'), lessThanOrEqualTo(0.001),
        reason: '旧页向左视差或归位，不得向右前进');
    await tester.pumpAndSettle();
    expect(maxDxOf(tester, 'B'), closeTo(0, 0.001),
        reason: 'push 完成后新页应归位 dx=0');
  });

  testWidgets('pop 返回上级：被退页面向右滑出（反向动画）', (tester) async {
    await tester.pumpWidget(app(
      home: const Scaffold(body: Center(child: Text('A'))),
    ));
    final nav = tester.state<NavigatorState>(find.byType(Navigator));
    unawaited(nav.push(
      MaterialPageRoute<void>(builder: _bPage),
    ));
    await tester.pumpAndSettle();
    expect(maxDxOf(tester, 'B'), closeTo(0, 0.001));

    nav.pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 150));
    final mid = maxDxOf(tester, 'B');
    expect(mid, greaterThan(0.05),
        reason: 'pop 动画中段，被退页面应向右滑出（dx>0.05），实际 $mid —— '
            '返回方向必须与前进相反（对称反向）');
    await tester.pumpAndSettle();
    expect(find.text('B'), findsNothing, reason: 'pop 完成后 B 页应退场');
    expect(find.text('A'), findsOneWidget);
  });

  testWidgets('pageTransitionsTheme 覆盖全部目标平台（统一右进左出）',
      (tester) async {
    final theme = buildAppTheme();
    final builders = theme.pageTransitionsTheme.builders;
    for (final platform in [
      TargetPlatform.android,
      TargetPlatform.iOS,
      TargetPlatform.linux,
      TargetPlatform.macOS,
      TargetPlatform.windows,
      TargetPlatform.fuchsia,
    ]) {
      expect(builders[platform], isA<FarmSlidePageTransitionsBuilder>(),
          reason: '$platform 应使用统一 FarmSlidePageTransitionsBuilder');
    }
  });
}
