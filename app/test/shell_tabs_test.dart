import 'package:farmlink/pages/home/shell_page.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('116h-A 五项底部导航为 首页/集市/发布/小田助手/我的', () {
    expect(kShellTabs, hasLength(5));
    expect(
      kShellTabs.map((t) => t.path).toList(),
      ['/home', '/market', '/publish', '/ai', '/profile'],
    );
    expect(
      kShellTabs.map((t) => t.label).toList(),
      ['首页', '集市', '发布', '小田助手', '我的'],
    );
  });

  test('消息不再占用底部导航 tab（改由顶栏铃铛进入）', () {
    expect(kShellTabs.any((t) => t.path == '/messages'), isFalse);
    expect(kShellTabs.any((t) => t.label == '消息'), isFalse);
  });

  test('发布是唯一的突出 tab', () {
    final publish = kShellTabs.where((t) => t.path == '/publish');
    expect(publish, hasLength(1));
  });
}
