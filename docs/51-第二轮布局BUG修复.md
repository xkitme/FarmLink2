# 分段 51 — 第二轮布局 BUG 修复（GitHub #14 / #15）

> 工作单（Codex 实施）。docs/50 修复推 push 后，测试同学又提了 2 条：
> #14 首页通知按钮无效、#15 AI 农技页布局未对齐 design_ref。
> 完成后跑 `flutter analyze lib`，commit 中文，关闭对应 issue。

## 一、Issue 摘要

| # | 页面 | 原文 |
|---|---|---|
| 14 | 首页 | 右上角的通知按钮没效果 |
| 15 | AI 农技 | 布局问题，没有完全按照 `design_ref/ai页` 的设计 |

## 二、Lane G · 首页通知按钮无效（#14）

### 现状

`app/lib/widgets/common.dart` 的 `FarmAppBar`：

```dart
actions: actions ?? [
  IconButton(
    onPressed: onBell ?? () {},               // ← 空函数，所以点了没反应
    icon: const Icon(Icons.notifications_none, color: AppColors.onSurfaceVariant),
  ),
],
```

`onBell` 没传，默认 `() => {}`，铃铛是死的。

### 改动

#### G1 · FarmAppBar 默认 onBell 跳 /messages

`app/lib/widgets/common.dart`：

```dart
class FarmAppBar extends StatelessWidget implements PreferredSizeWidget {
  final List<Widget>? actions;
  final VoidCallback? onBell;
  const FarmAppBar({super.key, this.actions, this.onBell});

  @override
  Widget build(BuildContext context) {
    return AppBar(
      // ...
      actions: actions ?? [
        IconButton(
          onPressed: onBell ?? () => GoRouter.of(context).go('/messages'),
          icon: const Icon(Icons.notifications_none, color: AppColors.onSurfaceVariant),
          tooltip: '消息通知',
        ),
      ],
    );
  }
}
```

`import 'package:go_router/go_router.dart';` 加进 common.dart。

> **注意**：调用方传了自定义 `actions` 数组时（如数据看板 `actions: [搜索, 全屏]`），整个 actions 被覆盖，铃铛消失——这是当前设计意图。如果某个页面想保留铃铛 + 自定义按钮，自己在 actions 里包含铃铛。

### 验收 G

- 任意板块（首页 / AI / 农机 / 数据 / 等使用 FarmAppBar 的页面）右上角铃铛 → 点击跳 `/messages`
- 关 issue：`gh issue close 14 --repo xkitme/FarmLink --comment "已在 commit XXX 修复，FarmAppBar 默认 onBell 跳 /messages。"`

---

## 三、Lane H · AI 农技页对齐 design_ref（#15）

### 现状

`design_ref/ai页/` 含两张设计稿：

- `ai_1/screen.png`：**单会话内页**（带返回、历史、设置图标 + 上传图片 + 智能植保诊断报告卡（绿框 + VERIFIED + 推荐防治方案两个按钮）+ 底部输入栏（+ / 录音 / 发送））
- `ai_2/screen.png`：**会话列表外页**（搜索框 + 「AI 历史记录」+ 「清空全部」+ 时间分组（今天 / 昨天 / 上周）+ 卡片左侧绿/灰边区分今天/过去 + ✦ 星标 AI 主动生成报告（月度生产力总结 / 土壤 pH 分析）+ FAB「+」）

实际代码：`app/lib/pages/ai/ai_threads_page.dart` + `ai_chat_page.dart`（46b 实施）。

### 改动

#### H1 · 实施前先打开设计稿对照

打开两张图：

```
D:\dgitc_project\InkFlow\design_ref\ai页\ai_1\screen.png
D:\dgitc_project\InkFlow\design_ref\ai页\ai_2\screen.png
```

逐项对照下面清单，**实际有差异的才改**，已经一致的不动。

#### H2 · ai_threads_page（对应 ai_2）

| 设计稿要点 | 实际代码核对 | 差异处理 |
|---|---|---|
| AppBar：FarmLink 田园通 + 右上铃铛 | 现状 `FarmAppBar` | OK（Lane G 修后铃铛能跳消息）|
| 顶部搜索框「搜索话题或关键词...」灰底圆角 | 看 `_searchBar` | 若没有按图样式，补 |
| 「AI 历史记录」H1 大字 + 右侧「清空全部」红字按钮 | 看实际 header | 对齐 |
| 时间分组「今天 / 昨天 / 上周」小灰字 | `_groupLabel` | 对齐字号 / 间距 |
| **卡片左边框颜色**：今天 = 绿色 3px 实线，过去 = 灰色 1px | 看 `_threadCard` 的 Border 实现 | **重点**：codex 之前用 `isToday` 切边框宽度/色，确认 OK |
| **✦ 星标 AI 主动生成报告**（月度生产力总结、土壤 pH 分析）混入列表 | 看 `/data/annual-report/list` 是否拉到列表 + ✦ 图标 | 如无，补 |
| 右下角 FAB 绿色「+」→ 新建对话 | `floatingActionButton` | 对齐位置 / 颜色 |
| 底部底栏「首页 / AI 农技 / 发布 / 消息 / 我的」 | ShellPage 底栏（自动） | OK |

#### H3 · ai_chat_page（对应 ai_1）

| 设计稿要点 | 差异处理 |
|---|---|
| AppBar：返回 + 「AI 农技助手」标题 + 右上 历史 + 设置 两个图标 | 检查是否有「历史」+「设置」两个图标；现状可能只有删除 |
| 用户图片消息：圆角缩略图 | 检查 `_userBubble` 含 image 时的渲染 |
| **智能植保诊断报告卡**：绿框 + 顶部 ✅「智能植保诊断报告」+ 右侧 VERIFIED 徽章；中部 病害名 + 大号可信度（94.8%）；下方「基于深度学习模型...」详细描述；底部「推荐防治方案」标题 + 两个按钮（💧 生成定制化施药建议 + 🔧 呼叫周边植保服务） | 看 `_detectReportCard` 实现是否完整对齐 |
| 底部输入栏：[+] 圆形浅底按钮 + 输入框（带录音 mic 图标）+ 绿色发送圆按钮 | 现状有 [+] 和 发送；**录音图标可能缺失** |
| 「+」点击：拍照识别 / 从相册选 / 语音输入（语音 disabled）| sheet 已实现，对齐文案 |

#### H4 · 不要做的

- 不要为对齐设计稿引入新依赖（图标用 Material/Cupertino 现有的）
- 不要改 46b 已经定的接口契约
- 不要改路由

### 验收 H

1. 用户在浏览器或模拟器打开 AI 板块，对比 `ai_2/screen.png` 视觉一致（搜索 / 分组 / 卡片左边框 / 星标报告 / FAB）
2. 点入任一会话，对比 `ai_1/screen.png`（诊断报告卡 / 推荐按钮 / 输入栏）
3. 关 issue：`gh issue close 15 --repo xkitme/FarmLink --comment "已在 commit XXX 修复 / 对齐 design_ref/ai页，详见 docs/51。"`

---

## 四、实施顺序

```
1) Lane G FarmAppBar onBell（5 分钟）→ commit + push → close #14
2) Lane H 对照设计稿核对 → 差异处补 → commit + push → close #15
```

## 五、不在范围内

- 不修 #6 / #7 / #8 / #10（这 4 个等测试复测 docs/50 Lane A 效果后再决定，已在对应 issue 留评论）
- 不动 AI 后端 / 46b 路由结构

## 六、关联

- 总览：[50-布局BUG修复.md](50-布局BUG修复.md)
- AI 基础：[46b-AI双层重构.md](46b-AI双层重构.md)
- 设计稿：`design_ref/ai页/ai_1/screen.png` + `ai_2/screen.png`

## 七、实施备注（Codex 完成后填写）

### Lane G · 2026-05-31 Codex 实施

- `app/lib/widgets/common.dart`：`FarmAppBar` 默认铃铛由空函数改为跳转 `/messages`，并补充“消息通知” tooltip；保留调用方自定义 `actions` 时整体覆盖默认铃铛的既有行为。
- 验证：`flutter analyze lib` 通过。

<!-- Lane H 完成后继续追加设计稿对照差异、issue 状态与 commit hash。 -->
