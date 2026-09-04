/// 导航层级契约（116h-A 系统导航收口）。
///
/// 一级 tab 顶层路径 = 底栏五栏（首页/集市/发布/小田助手/我的）的可直达路径。
/// `pages/home/shell_page.dart` 的 [FarmShellNavBar] 底栏只在这些路径显示；
/// `widgets/common.dart` 的 FarmAppBar 依据「当前路径 ∈ 本集合 且 无返回栈」
/// 自动判定「一级 tab 顶层页」形态（右上角品牌入口、左上不放品牌图），
/// 其余一律按「二级及以上页」形态（左上角返回箭头）。
///
/// 该集合与 `kShellTabs[*].path` 必须一致，由
/// `app/test/farm_nav_test.dart` 断言锁定，防止两处漂移。
const List<String> kTopLevelTabPaths = [
  '/home',
  '/market',
  '/publish',
  '/ai',
  '/profile',
];

/// 判断某规范化路径（无 query/无尾斜杠）是否是一级 tab 顶层路径。
bool isTopLevelTabPath(String path) => kTopLevelTabPaths.contains(path);
