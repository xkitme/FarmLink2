import 'package:farmlink/design_system/farm_nav.dart';
import 'package:farmlink/pages/home/shell_page.dart';
import 'package:flutter_test/flutter_test.dart';

/// farm_nav 单源与壳层底栏一致性：kTopLevelTabPaths 必须与 kShellTabs.paths
/// 完全一致（FarmAppBar 一级/二级自动判定依赖该集合，漂移会导致
/// 一级页误显返回箭头 / 二级页误显品牌图）。
void main() {
  test('kTopLevelTabPaths 与 kShellTabs.paths 一致（5 个一级 tab）', () {
    expect(kTopLevelTabPaths, hasLength(5));
    expect(
      kTopLevelTabPaths,
      kShellTabs.map((t) => t.path).toList(),
      reason: '一级顶层路径集合必须与底栏 kShellTabs.paths 完全一致',
    );
  });

  test('isTopLevelTabPath 精确匹配一级顶层路径', () {
    for (final path in kTopLevelTabPaths) {
      expect(isTopLevelTabPath(path), isTrue, reason: '$path 应判为一级顶层');
    }
    for (final path in ['/home/x', '/messages', '/search', '/market/orders']) {
      expect(isTopLevelTabPath(path), isFalse, reason: '$path 不应判为一级顶层');
    }
  });
}
