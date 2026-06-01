# 分段 55 — 农机页 BUG 修复（GitHub issue #6 第二轮收尾）

> 承接 [53-农机共享页重构.md](53-农机共享页重构.md)。issue #6（农机共享页面 BUG 汇总-第一期）共 7 条，
> 分段 53 已落地「真搜索 / 数据驱动筛选 / 列表卡 / 真实预约 / 发布入口 / 服务工具墙」主体。
> 本段只修 53 落地后**仍真实存在**的缺陷，**不扩范围**。
>
> 改动文件：
> - `app/lib/pages/machinery/machinery_page.dart`
> - `app/lib/pages/machinery/machinery_service_page.dart`
>
> 后端零改动，未新增接口。`flutter analyze lib` → `No issues found!`

## issue #6 七条对照

| # | 原始反馈 | 现状 | 本段处理 |
|---|---|---|---|
| 1 | 尺寸太大了 | 全局字号/手机框已在 Lane A 修（owner 已批注 commit 967cebd0 / 99142363） | 不在本段范围（全局，且非农机页两文件） |
| 2 | 搜索框/按钮是摆设 | 53 已换成受控 TextField + 品牌绿搜索按钮 | 已修，无残留 |
| 3 | 预约太简陋 + **日期点不动** | 53 换成选日期 + 金额预览的 sheet，但**日期选择器仍会点不开**（见 BUG A） | **本段修 BUG A**（根因见下）；并加固成功 toast（BUG C） |
| 4 | 地图是摆设 | 53 已收成 1/3 屏区块 + 「即将上线」角标 | 已修，无残留 |
| 5 | 没有发布农机入口 | 53 已加 AppBar「发布」入口 + 发布 sheet | 已修；本段加固成功 toast（BUG C） |
| 6 | 7 项工具找不到/不会用 | 53 已整合成 3 列工具墙，7 项各自弹 sheet | 已修；本段顺手对齐失败文案常量（BUG D） |
| 7 | 土地流转卡片被挡住 + 太大 | 所有 sheet 均 `useRootNavigator:true`（不再被底栏遮）；尺寸随全局字号收敛 | 「被挡住」已修；「太大」属全局，不在本段范围 |

## 本段修复明细

### BUG A · 预约日期选择器点了打不开（对应 #6 第 3 条「点都点不动」）— machinery_page.dart

- **根因**：`_BookingSheetState.initState` 用 `DateTime.now().add(1d)` 算出 `_startDate`（含当时的时分秒）；
  而 `_pickStart` 里 `firstDate` 又取了一个**新的** `DateTime.now().add(1d)`。点开 sheet 到点日期之间必然过了一小段时间，
  于是 `firstDate` 比 `_startDate` 晚几毫秒 → `initialDate(_startDate) < firstDate` 恒成立 →
  `showDatePicker` 的断言 `!initialDate.isBefore(firstDate)` 失败，选择器**抛异常、根本弹不出来**，
  表现就是用户说的「点都点不动」。`_pickEnd` 同理脆弱。
- **改法**：
  - 新增 `_dateOnly()` 把所有日期归一到**零点（仅日期）**，消除时分秒漂移。
  - `initState` 用 `_dateOnly(now)` 派生起止日期。
  - `_pickStart` / `_pickEnd` 先算 `earliest`，并把 `initialDate` 钳到 `>= earliest`（双保险），
    `lastDate` 统一 `earliest + 365d`；选回的日期再 `_dateOnly` 落库。
  - 保留「起=明天、止=后天、可同日（1 天租期）」语义不变。

### BUG B · 占位距离露出脏浮点（占位数据露馅）— machinery_page.dart

- **根因**：后端 list 无距离字段，`_Machine.fromApi` 用 `2.5 + index * 1.1` 生成占位距离并直接字符串化。
  浮点累加在 index=3 处得到 `5.800000000000001`，界面上露出 `5.800000000000001 km` 的脏数据。
- **改法**：`(2.5 + index * 1.1).toStringAsFixed(1)`，定格 1 位小数（`5.8 km`）。仍是占位，但不再露馅。

### BUG C · 预约/发布成功 toast 在 pop 后用失效 context 弹（对应 #6 第 3 条「弹个 toast 没了」的隐患）— machinery_page.dart

- **根因**：原 `Navigator.pop(context); toast(context, ...)` 先关 sheet 再用 **sheet 自身 context** 取
  `ScaffoldMessenger.of(context)`，此时 sheet 子树正被销毁，messenger 查找落点不稳定，toast 可能不弹
  （53 实施备注里已自标为「脆弱点保留」）。
- **改法**：**先** `ScaffoldMessenger.of(context)` 抓住根 messenger，**再** pop，最后用抓到的 messenger
  弹 SnackBar；样式沿用 `toast` 的 `primaryContainer` + 圆角 `R.sm` + floating，符合设计系统。
  预约、发布两处同改。错误/校验路径仍用 `toast(context, actionErrorMessage(...))`（未 pop，context 有效）。

### BUG D · 筛选 chip 在「带类型刷新」时被抹成只剩一项 — machinery_page.dart

- **根因**：`_loadMachines(initChips:true)` 既用于进页也用于下拉刷新。若用户已选中某类型（如「植保机」）再下拉刷新，
  `_activeTypeQuery='植保机'`，服务端只回植保机记录，`distinctTypes` 就只剩 `['植保机']`，
  chip 被重算成 `['全部','植保机']` —— 其余类型 chip 全部消失。
- **改法**：chip 只在**无类型过滤**（`typeQuery == null`，即「全部」）的响应上重算
  （`if (initChips && typeQuery == null)`）。带类型过滤时保持现有 chip 不动。

### 小修 · service 页失败文案改用常量 — machinery_service_page.dart

- `_load()` 失败分支原写死中文 `'服务暂时不可用，请稍后重试'`，改用 `widgets/common.dart` 暴露的
  `serviceUnavailableMessage` 常量，统一口径（产品口径硬约束：失败走该常量，不自造文案）。

## 未修项及原因

- **#6 第 1 / 第 7 条「尺寸太大」**：属全局字号 + web 手机框问题，owner 已在 Lane A（commit 967cebd0 / 99142363）
  处理且要求大字体场景复测后关闭。修复点不在农机页两文件内，**超出本段允许触碰范围**，故不动。
- **`showDatePicker` 显示英文**：全 App `MaterialApp` / `MaterialApp.router` **未配置**
  `localizationsDelegates` / `supportedLocales`（`lib/main.dart`），日期选择器走 `DefaultMaterialLocalizations`
  渲染为英文。这是 app 级配置，需改 `main.dart` + `pubspec`（加 `flutter_localizations`），
  **均在禁改清单内**，本段不处理，建议单开一段补中文 locale。
- **距离 / 评分仍为占位**：后端 list 未返回真实距离与评分字段（评分 fallback 4.8、距离按序号生成）。
  本段仅消除「脏浮点露馅」（BUG B），**不新增后端字段/接口**（53 既定边界），真实距离/评分待后端补字段后再接。
- **service 页 `_submit` 失败入队「待发送队列」文案**：属离线队列既有机制，文案中性、未触红线，逻辑正确，不动。

## 验收

- `flutter analyze lib` → `No issues found! (ran in 1.2s)`
- 未 commit、未 build/run（按工作单要求）。
