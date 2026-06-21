# 分段 70 — 回退 45f 板块头部工具 chip 索引带

> 修复单。来源：用户实测反馈「(板块页顶部那排工具 chip)每个页面都是，点击一次之后，就点不动了」。
> 关联：回退 [45f-板块头部工具chip.md](45f-板块头部工具chip.md)（B3）。

## 一、目标

移除 7 个板块主页顶部的「工具 chip 索引」横滑带（45f 引入的 `SectionToolChips`），消除「点了没反应」的坏体验。

## 二、背景 / 根因

45f 让每个板块主页顶部横滑列出**本板块**的全部工具 chip，点击 `context.go(f.route)` 直达。
但 `feature_catalog.dart` 里同一 section 的功能 route 多为**板块级粗路由**，绝大多数就指向该板块主页自己：

- 气象灾害页：8 个 chip（极端天气预警/灾情上报/保险理赔/应急预案/冻害防护/火险预警/干旱指数/一键求助）**全部** `route: '/disaster'`。
- 其余板块同理，多数 chip 指向 `/agri`、`/market`… 即当前页。

于是在板块主页上点这些 chip = `context.go('当前路由')`，go_router（14.8.1，ShellRoute 内）视作导航到相同 location → 同 pageKey → 不重建不跳转 = **no-op**，表现就是「点了没反应 / 点不动」。整套 feature catalog 都是板块级路由、无「按工具触发具体动作」的机制，所以工具墙页（/all）也是同样逻辑，但它从别处进来、跳板块页是有效导航，没暴露此问题。

## 三、决策

用户在三个方案（①接成页内真动作 ②隐藏自指向的死 chip ③整条移除）中选 **③整条移除工具 chip 带**——该内容本就重复（功能入口已在各页正文里），chip 带属冗余。

## 四、改动清单

- 删除组件文件 `app/lib/widgets/section_tool_chips.dart`。
- 7 个板块主页移除 `const SectionToolChips(section: 'xxx')` + 配套 `const SizedBox(height: 8)`，并删除 `import '../../widgets/section_tool_chips.dart';`：
  - `app/lib/pages/agri/agri_page.dart`
  - `app/lib/pages/market/market_page.dart`
  - `app/lib/pages/machinery/machinery_page.dart`
  - `app/lib/pages/disaster/disaster_page.dart`
  - `app/lib/pages/policy/policy_page.dart`
  - `app/lib/pages/life/life_page.dart`
  - `app/lib/pages/data/data_dashboard_page.dart`
- 不动 `feature_catalog.dart`、不动后端、不动 /all 工具墙页（其导航有效，保留）。

## 五、契约

无接口变更，纯前端删除。各页原有搜索框/分类 chip/hero/列表结构不变，仅少了顶部一条 40px 高的 chip 带 + 8px 间距。

## 六、验收

- `cd app && C:\dev\flutter\bin\flutter.bat analyze lib` → `No issues found!`（已通过）。
- 7 个板块主页顶部不再出现工具 chip 横滑带；页面其余内容与交互不受影响。

## 七、不在范围

- 不重做 chip 的「页内动作直达」（方案①，未采纳）。
- 不动 /all 全部服务工具墙、不动 feature_catalog 路由。
