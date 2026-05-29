# 分段 50 — 布局 BUG 汇总修复（GitHub issue #4~#13）

> 工作单（Codex 实施）。5/29 测试同学提了 10 个页面 BUG（issue #4~#13）。
> **优先级高于 45 招牌场景**——布局炸了 demo 没法演。
> 核心是一个全局根因（A）连带 5+ 个 issue，先修 A 再逐页收尾。

## 一、Issue → 归类映射

| # | 页面 | 原文 | 归类 |
|---|---|---|---|
| 7 | 全局 | 尺寸太大，大部分卡片显示不正常 | **A 全局尺寸（根因）** |
| 6 | 农机共享 | 尺寸太大 | A |
| 10 | 乡村生活 | 卡片问题同其他 | A |
| 8 | 惠农政策 | 卡片高度异常，能滑到无内容高度 | A + C |
| 4 | 气象灾害 | 内容能无限滑动 | A + C |
| 12 | 发布 | 卡片太大 + 发布按钮被底栏挡住 | A + B |
| 5 | 流通销售 | 详情卡没完全弹出，按钮点不到 | B |
| 9 | 注册 | 手机号填进账号栏，手机号栏空 | D |
| 11 | 数据管理 | 非管理员能看管理员功能 | E |
| 13 | 设置 | 功能没补齐 | F |

## 二、Lane A · 全局尺寸（根因，最高优先，先做）

### 现状（已定位）

1. `app/lib/main.dart` **没有 textScaler clamp** —— 测试设备系统字体放大时，Flutter 跟随放大所有文字，卡片被撑高 → 「尺寸太大 / 卡片不正常 / 滑到空白」连锁
2. `app/lib/core/theme.dart` 正文字号偏大：`bodyMedium: 18→实际16`、`bodyLarge: 18`、`bodySmall: 14`（Material 默认 bodyMedium 14 / bodyLarge 16）。height 1.5~1.55 进一步撑高

### A1 · main.dart 加 textScaler clamp（必做）

`MaterialApp.router` 加 `builder`：

```dart
return ChangeNotifierProvider.value(
  value: _auth,
  child: MaterialApp.router(
    title: '田园通 FarmLink',
    debugShowCheckedModeBanner: false,
    theme: buildAppTheme(),
    routerConfig: _router,
    builder: (context, child) {
      final mq = MediaQuery.of(context);
      // 限制系统字体缩放在 0.9~1.1，避免大字体把卡片撑爆
      final clamped = mq.textScaler.clamp(minScaleFactor: 0.9, maxScaleFactor: 1.1);
      return MediaQuery(
        data: mq.copyWith(textScaler: clamped),
        child: child!,
      );
    },
  ),
);
```

> 加载态那个 MaterialApp（`if (!_ready)`）也同样加 builder，保持一致。

### A2 · theme.dart 正文字号回收（必做）

```dart
// 改后
bodyLarge:  TextStyle(color: AppColors.onSurface, fontSize: 16, height: 1.45),  // 18→16
bodyMedium: TextStyle(color: AppColors.onSurface, fontSize: 14, height: 1.4),   // 16→14
bodySmall:  TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12, height: 1.35), // 14→12
```

headline 系列保持不变（标题该大）。这一步让所有用 Theme 默认文字的地方收紧。

### 验收 A

- 把测试设备/模拟器系统字体调到「特大」→ App 卡片不再溢出 / 不再被撑到夸张高度
- 各板块卡片回到正常比例

---

## 三、Lane B · 详情卡 / FAB 遮挡（#5 #12）

### B1 · 流通销售商品详情卡按钮点不到（#5）

`app/lib/pages/market/market_page.dart` 的 `_showProductDetail`：

- 现状 `showModalBottomSheet` 内容高度不够或未 `isScrollControlled`，底部「加入合计」按钮被推出可视区
- 改：
  ```dart
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,   // 关键
    backgroundColor: AppColors.surface,
    shape: ...,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,    // 一进来就露出大部分
      minChildSize: 0.5,
      maxChildSize: 0.92,
      builder: (ctx, scrollCtrl) => SingleChildScrollView(
        controller: scrollCtrl,
        child: ...商品详情 + 按钮...,
      ),
    ),
  );
  ```
- 或更简单：固定高度 `Container(constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.8))` + 内容 `Column`（按钮放最底，内容区 `Expanded(SingleChildScrollView)`），保证按钮始终在底部可见

### B2 · 发布页 FAB 被底栏挡 + 卡片太大（#12）

`app/lib/pages/publish/publish_page.dart`：

- **FAB 被底栏挡**：发布页在 ShellRoute 内（底栏占 ~70px）。Scaffold 的 `floatingActionButton` 默认贴屏幕底，会被 ShellPage 的 bottomNavigationBar 盖住。
  - 修：ListView 底部 padding 加大（`EdgeInsets.only(bottom: 88)`）让 FAB 不挡内容；FAB 本身位置上移：用 `floatingActionButtonLocation` 或给 FAB 包 `Padding(EdgeInsets.only(bottom: 12))`。
  - 或者：发布入口不用 FAB，改成 AppBar 右上「+」按钮（彻底避开底栏冲突）。**推荐改 AppBar 按钮**。
- **卡片太大**：A1/A2 修完先复测；若仍大，收 postCard 的 padding / 字号。

### 验收 B

- 集市点商品 → 详情卡一进来就露出「加入合计」按钮，能点
- 发布页「+」入口不被底栏遮挡，能正常发布

---

## 四、Lane C · 滚动高度异常（#4 #8）

### 现状

气象灾害（#4）、惠农政策（#8）能滑到无内容的空白高度。disaster_page 的 ListView 结构本身正常（RefreshIndicator → ListView padding bottom 28）。

### C1 · 先复测 A 修复后的效果

A（textScaler + 字号）修完后，内容高度回归正常，「滑到空白」大概率消失。**先做完 A 再看 C 是否还存在。**

### C2 · 若仍有空白滚动，排查固定高度

逐项检查这两页是否有：
- 写死的超大 `SizedBox(height: xxx)` / `Container(height: 很大)`
- 嵌套 `GridView`/`ListView` 用了 `shrinkWrap: true` 但父级又给了无界高度
- `Spacer()` 出现在可滚动 Column 里（会撑无限高）

policy 页（#8 卡片高度异常）重点看 hero 卡 / tab 内容区高度是否固定过大。

### 验收 C

- 气象灾害 / 惠农政策页滑到底就是最后一个卡片，无大段空白

---

## 五、Lane D · 注册手机号错位（#9，明确 bug）

### 现状（已定位）

`app/lib/core/auth_state.dart:65`：

```js
final data = await ApiClient.post('\auth\register', body: {   // ← 反斜杠路径！
  'username': username, 'password': password, 'nickname': nickname
});
```

两个 bug：
1. **路径 `'\auth\register'` 用了反斜杠**（`\r` 是回车符），应为 `'/auth/register'`。**先核实**：如果实际能注册成功，可能是别处路径；但这行明显错，改成 `/auth/register`
2. 注册**只传 username/password/nickname，不传 phone** → 后端 user.phone 空。前端表单字段「手机号/账号」绑 `_username`，用户填的手机号进了 username

### D1 · 修路径

```dart
final data = await ApiClient.post('/auth/register', body: {...});
```

### D2 · 注册补手机号

`register_page.dart` + `auth_state.register` + 后端 register 三处对齐。两种方案：

**方案 A（推荐，最小改动）**：注册时若 username 是手机号格式（11 位数字），同时写入 phone：

```dart
// auth_state.register 内
final isPhone = RegExp(r'^1\d{10}$').hasMatch(username);
final data = await ApiClient.post('/auth/register', body: {
  'username': username,
  'password': password,
  'nickname': nickname,
  if (isPhone) 'phone': username,   // 手机号格式则同步写 phone
});
```

后端 register 接收并存 phone（确认 `backend/src/modules/platform/auth.controller.js` 的 register 接收 phone 字段；不接收则加）。

**方案 B**：注册表单拆出独立「手机号」字段（绑新 controller）+ 「账号」字段。改动大，**本期用方案 A**。

### 验收 D

1. 注册路径正确，能成功注册
2. 用手机号 `13800001234` 注册 → 后端 user.username 和 user.phone 都是 `13800001234`
3. 用非手机号账号注册 → phone 为空（合理）

---

## 六、Lane E · 数据管理权限泄漏（#11）

### 现状

非管理员账户能看到管理员才该看的功能（数据管理页）。

### E1 · 排查

`app/lib/pages/data/data_dashboard_page.dart` + `data_service_page.dart`：
- 是否有「管理员专属」区块（如全平台统计、跨村数据、AI 运维入口）未按 `role` 隐藏
- 后端 `/data/dashboard` 对非 ADMIN/VILLAGE 已按 userId 行级过滤（数据层安全），但**前端可能展示了管理员才有意义的入口/按钮**

### E2 · 修

- 用 `context.read<AuthState>().user?.role` 判断，管理员专属区块包 `if (isAdminOrVillage) ...`
- 普通 FARMER 看到的数据管理页应只有自己的农情，无平台级/跨村入口

> 注意：「数据管理」板块本身农户可见（看自己的农情看板没问题），要隐藏的是**管理员级聚合 / 运维入口**。明确哪些是管理员专属，逐个加 role 守卫。

### 验收 E

- farmer 账号进数据管理 → 只看到自己的农情，无管理员功能入口
- admin/village 账号进 → 完整功能

---

## 七、Lane F · 设置功能没补齐（#13）

### 现状

设置页「功能没补齐，测试不了」。46a 设置中心可能 codex 未完整实现，或 46d 占位页（个人资料 `_7` / 存储管理 `_3`）点进去是「开发中」。

### F1 · 核对 46a 完成度

确认 `/profile/settings` 下 9 个子页都能进、不报错：
- 完整页：主页 / 关于 / 修改密码 / 推送 / 气象预警 / 隐私 / 帮助反馈
- 占位页：个人资料 / 存储管理 —— 若还是「开发中」占位，本期至少让**个人资料**可用（看 46d 工作单，把姓名/手机号展示 + 编辑做出来）

### F2 · 若 46a 根本没实现

如果 codex 还没做 46a（设置入口点了没反应/路由缺失），**先补 46a**（见 `docs/46a-我的页与设置页修复.md`），再谈补齐。

### 验收 F

- 设置页每个入口都能进，无「点了没反应」「404」「纯占位」让测试无法进行的项

---

## 八、实施顺序与节奏

```
第一优先  Lane A（全局尺寸）—— 修完 commit，让测试同学先复测一轮，很多 issue 会直接消失
第二      Lane D（注册，明确 bug，5 分钟）+ Lane B（sheet/FAB）
第三      Lane C（A 修完后复测，残留再修）+ Lane E（权限）
第四      Lane F（设置补齐，可能要先补 46a）
```

每个 Lane 完成 commit 一次（中文 message，如 `fix: 50-A 全局字体缩放与卡片尺寸`），全部完成统一 push。
完成后逐个 GitHub issue 评论 + close（`gh issue close <号> --comment "..."`）。

## 九、不在范围内

- 不重做设计系统（只收字号 + clamp，不换设计语言）
- 不动后端数据层鉴权（已有行级过滤）—— E 只改前端展示守卫
- 45 招牌场景（45b/c/d/e/k）暂缓，等布局 BUG 修完再继续

## 十、关联

- Issues：GitHub #4~#13
- 设置相关：[46a-我的页与设置页修复.md](46a-我的页与设置页修复.md)
- 协作约定：[协作约定.md](协作约定.md)

## 十一、实施备注（Codex 完成后填写）

<!-- 各 Lane 改了哪些文件、复测结果、关闭了哪些 issue -->
