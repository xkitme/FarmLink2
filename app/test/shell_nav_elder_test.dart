import 'package:farmlink/pages/home/shell_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// 116h-A polish：底栏适老密度与结构测试。
///
/// 覆盖：五栏结构、适老字号/图标放大、文案单行（FittedBox 兜底）、
/// 360/411/430 宽度渲染不溢出、底栏高度跨 tab / 跨宽度稳定（不跳动）、
/// 点击回调下标。
Widget _shell({required bool elder, required int selected}) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    home: Scaffold(
      body: const SizedBox.expand(),
      bottomNavigationBar: FarmShellNavBar(
        selectedIndex: selected,
        elder: elder,
        onSelect: (_) {},
      ),
    ),
  );
}

void main() {
  Future<void> pumpNav(
    WidgetTester tester, {
    required bool elder,
    required int selected,
    double width = 411,
    double height = 731,
  }) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = Size(width, height);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_shell(elder: elder, selected: selected));
    await tester.pumpAndSettle();
  }

  testWidgets('五栏结构：渲染 5 个 tab 图标与文案（普通模式 411）', (tester) async {
    await pumpNav(tester, elder: false, selected: 0);
    expect(kShellTabs, hasLength(5));
    for (final tab in kShellTabs) {
      expect(find.text(tab.label), findsOneWidget,
          reason: '缺少 tab 文案 ${tab.label}');
      expect(find.byIcon(tab.icon), findsOneWidget,
          reason: '缺少 tab 图标 ${tab.icon}');
    }
  });

  testWidgets('适老模式：字号 15 / 图标放大 / 文案单行（FittedBox 兜底）',
      (tester) async {
    await pumpNav(tester, elder: true, selected: 0);
    final label = tester.widget<Text>(find.text('小田助手'));
    expect(label.style!.fontSize, 15, reason: '适老底栏字号应为 15');
    expect(label.maxLines, 1, reason: '适老底栏文案必须单行');
    expect(label.softWrap, isFalse, reason: '适老底栏文案禁止折行');
    expect(
      find.ancestor(
          of: find.text('小田助手'), matching: find.byType(FittedBox)),
      findsOneWidget,
      reason: '适老底栏文案必须由 FittedBox scaleDown 兜底',
    );
    final icon = tester.widget<Icon>(find.byIcon(Icons.storefront_rounded));
    expect(icon.size, 30, reason: '适老底栏图标应放大到 30');
    expect(tester.takeException(), isNull);
  });

  testWidgets('适老模式在 360 / 411 / 430 三种宽度下渲染均不溢出', (tester) async {
    for (final width in [360.0, 411.0, 430.0]) {
      await pumpNav(tester, elder: true, selected: 1, width: width);
      expect(tester.takeException(), isNull,
          reason: '适老底栏在 $width 宽度下不应溢出');
    }
  });

  testWidgets('底栏高度跨 tab / 跨宽度稳定（适老不跳动）', (tester) async {
    await pumpNav(tester, elder: true, selected: 0, width: 411);
    final hHome = tester.getSize(find.byType(FarmShellNavBar)).height;
    await pumpNav(tester, elder: true, selected: 4, width: 411);
    final hProfile = tester.getSize(find.byType(FarmShellNavBar)).height;
    await pumpNav(tester, elder: true, selected: 0, width: 430);
    final h430 = tester.getSize(find.byType(FarmShellNavBar)).height;
    expect(hHome, hProfile,
        reason: '切换 tab 后底栏高度不应跳动（$hHome vs $hProfile）');
    expect(hHome, h430,
        reason: '411 与 430 宽度下适老底栏高度应一致（$hHome vs $h430）');
  });

  testWidgets('普通模式底栏高度跨宽度稳定', (tester) async {
    await pumpNav(tester, elder: false, selected: 0, width: 411);
    final h411 = tester.getSize(find.byType(FarmShellNavBar)).height;
    await pumpNav(tester, elder: false, selected: 0, width: 430);
    final h430 = tester.getSize(find.byType(FarmShellNavBar)).height;
    expect(h411, h430);
  });

  testWidgets('点击 tab 回调携带正确下标', (tester) async {
    final tapped = <int>[];
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(411, 731);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: const SizedBox.expand(),
        bottomNavigationBar: FarmShellNavBar(
          selectedIndex: 0,
          elder: false,
          onSelect: tapped.add,
        ),
      ),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('集市'));
    expect(tapped, [1]);
    await tester.tap(find.text('我的'));
    expect(tapped, [1, 4]);
  });
}
