# 分段 45f — 板块首页头部工具 chip 索引（能力可见性 B3）

> 工作单（Codex 实施）。所属 lane：[45-招牌场景与产品重构计划](45-招牌场景与产品重构计划.md) Lane B · B3。
> 进任一板块主页，头部第一行横滑列出该板块全部工具 chip，点击直达对应工具/服务页——让板块「丰满感」立刻可见。
> **复用 45d 的 `feature_catalog.dart`（按 section 取），不新增后端、不新增数据。**

## 一、目标

7 个板块主页（/agri /market /machinery /disaster /policy /life /data）顶部统一加一条「工具 chip 索引」横滑带：
- chip 来自 `kFeatureCatalog` 中 `section` == 当前板块的全部功能
- 每个 chip 显示功能 icon + 名称，点击 `context.go(f.route)` 直达
- 一行横滑（不换行不溢出），轻量、不喧宾夺主

## 二、改动清单

### 1. 新建共享组件 `app/lib/widgets/section_tool_chips.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/constants.dart';
import '../core/feature_catalog.dart';

/// 板块主页头部「工具 chip 索引」：横滑列出该 section 的全部功能，点击直达 route。
class SectionToolChips extends StatelessWidget {
  final String section; // feature_catalog 的 section key
  const SectionToolChips({super.key, required this.section});

  @override
  Widget build(BuildContext context) {
    final items = kFeatureCatalog.where((f) => f.section == section).toList();
    if (items.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final f = items[i];
          return InkWell(
            borderRadius: BorderRadius.circular(R.sm),
            onTap: () => context.go(f.route),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(R.sm),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Row(
                children: [
                  Icon(f.icon, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(f.name,
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.onSurface)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
```

> 视觉对齐设计系统：白底 + 细描边 `outlineVariant` + `R.sm`(8) 小圆角（**不要大圆角胶囊**，符合输入框/chip 利落方正偏好）+ 主绿 icon。**禁** generic 渐变 / 半透明白浮层 / 脉冲光。
> 上面的颜色常量（`AppColors.surface/outlineVariant/onSurface/primary`、`R.sm`）若与项目实际命名不符，**以项目 `constants.dart` 实际为准**，别硬套。

### 2. 7 个板块主页插入 chip 带

| 页面文件 | section key |
|---|---|
| `app/lib/pages/agri/agri_page.dart` | `agri` |
| `app/lib/pages/market/market_page.dart` | `market` |
| `app/lib/pages/machinery/machinery_page.dart` | `machinery` |
| `app/lib/pages/disaster/disaster_page.dart` | `disaster` |
| `app/lib/pages/policy/policy_page.dart` | `policy` |
| `app/lib/pages/life/life_page.dart` | `life` |
| `app/lib/pages/data/data_dashboard_page.dart` | `data` |

插入位置：**每个板块主页 body 顶部、AppBar 之下**，作为内容第一行（在现有搜索框/分类 chip/列表之上）。
- 若该页 body 是 `ListView`/`Column`，把 `const SectionToolChips(section: 'xxx')` + 一个 `SizedBox(height: 8/12)` 作为首个 child 插入。
- 若顶部已有别的 chip（如 market 的商品分类 `_chips`），工具 chip 带放在它**之上**（即更靠顶部），两者不冲突、各管各。
- 不破坏现有刷新/滚动/加载态结构；加载中（loading）时可不显示或正常显示均可，但不要让它把 loading/error 态挤乱。

### 3. 不动后端 / 不动 feature_catalog

纯前端展示，复用现有路由。chip 的 route 来自 catalog，已是存在路由。

## 三、验收（必须自己跑）

1. `cd app && C:\dev\flutter\bin\flutter.bat analyze lib` → No issues（至少无 error），输出贴最后总结。
2. 进 /market 顶部第一行横滑出现「实时行情 / 乡村集市 / 价格预测 / ...」等 market 工具 chip；点击跳对应 route。
3. 其余 6 个板块主页同样出现各自 section 的工具 chip 带，数量与 catalog 中该 section 条数一致。
4. chip 带一行横滑，窄屏不溢出、不换行；不破坏各页原有搜索框/分类 chip/列表。
5. 某 section 在 catalog 中为空 → 该页不显示 chip 带（`SizedBox.shrink`），不报错。

## 四、不在范围内

- 不新增功能 / 不改 `feature_catalog.dart` / 不新增后端。
- chip 直达用 catalog 现有 route（多数指向板块服务页工具墙），**不要求**每个 chip 打开「具体某个工具的弹窗」——直达服务页即可。
- 不做 chip 选中态/筛选联动（纯导航入口，不是过滤器）。
- 不动板块页其它业务逻辑。

## 五、关联

- Lane plan：[45-招牌场景与产品重构计划.md](45-招牌场景与产品重构计划.md) B3
- 复用：45d 的 `feature_catalog.dart`（section 分组）；姊妹 45e 工具墙、45d 全局搜索
- 设计：输入框/chip 利落方正小圆角偏好（见交接约定）

## 六、实施备注（Codex 完成后填写）

<!-- 改了哪些文件、各板块 chip 数、插入位置、analyze 结果 -->

- 新增共享组件：`app/lib/widgets/section_tool_chips.dart`，从 `kFeatureCatalog` 按 `section` 取功能项，一行横向滚动展示白底细描边小圆角 chip，点击 `context.go(f.route)` 直达。
- 插入页面：`agri_page.dart`、`market_page.dart`、`machinery_page.dart`、`disaster_page.dart`、`policy_page.dart`、`life_page.dart`、`data_dashboard_page.dart`。其中 `market` 放在搜索框和商品分类 chip 之上，`machinery` 放在搜索框和筛选 chip 之上，`policy` 放在 tab 栏之上，其余成功态列表中放在 hero/业务内容第一行之上。
- 各板块 chip 数：`agri` 12、`market` 12、`machinery` 8、`disaster` 8、`policy` 8、`life` 12、`data` 5，均来自现有 `kFeatureCatalog`，未修改 `feature_catalog.dart`。
- 验收：`cd app && C:\dev\flutter\bin\flutter.bat analyze lib` 通过，输出 `No issues found! (ran in 2.4s)`。
