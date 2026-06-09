# 75 · 独立内容/表单型 sheet → 独立整页（第四批）

> 第三批迁完 `_formSheet` 系列。本批迁**各页独立的内容/表单型 `showModalBottomSheet`**（自定义 StatefulWidget / builder，不走 `_formSheet`）。

## 通用手法
把 `showModalBottomSheet<T>(context:..., builder: (ctx) => X, ...)` 改为 push 整页：
```dart
Navigator.of(context, rootNavigator: true).push<T>(
  MaterialPageRoute(
    builder: (ctx) => Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.of(ctx).pop(), // 返回 = 取消，与原 sheet 关闭语义一致
        ),
        title: const Text('标题', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.primary)),
      ),
      body: X, // 原 sheet 内容，外层若是 Padding/Column 保持；确保可滚动(键盘避让靠 Scaffold 默认)
    ),
  ),
);
```
- 原 `Navigator.pop(ctx, value)` 返回值机制不变，调用方 `await` 取值逻辑不动。
- 内容是 StatefulWidget（如 `_StatFormSheet`/`_PublishMachineSheet`/`_BookingSheet`）的，直接 push 包 Scaffold；其内部 `Navigator.pop(context, result)` 照常工作。
- 纯展示型 sheet（iot 设备详情、同步日志查看）可改 Scaffold 整页；若内容恰好是「标题+文本/分区」也可复用 `InfoDetailPage`（`/detail/info`），按更自然的来。
- 去掉 sheet 专有的 `isScrollControlled`/`shape`/`viewInsets` padding 等弹层参数。

## 文件分配
- **轨 A**：`machinery_page.dart`（`_openPublishSheet` 发布农机、`_showBookingSheet` 预约）、`iot_page.dart`（`_showDetail` 设备详情）
- **轨 B（Codex）**：`data_service_page.dart`（`_openStatForm` 统计上报、`_openSyncLogs` 同步日志）、`publish_page.dart`（`_openComposer` 里的发布 sheet）、`policy_service_page.dart` + `machinery_service_page.dart` 的残留 `_sheet(title, child)` helper（若仍有调用者就同样迁整页；若已无调用者则删除该 helper 消除 unused）

## ⛔ 保留为弹层（**不要动**）
- 相机/相册选择 `_pickSource` / `_chooseSource`
- 确认框 `_confirmArchive` / `_confirmClear`
- 轻量选择器 `_yearPicker`（年份）/ `_pickQuantity`（数量）
- 语音浮层 `_recognizeVoice`

## ⛔ 禁区
- `disaster_page` / `market_page` / `ai_chat_page`（**用户半成品**）
- `common.dart` / `core/router.dart` / `core/theme.dart` / `form_scaffold_page.dart`
- 对方轨文件

## 验证
1. `cd app; C:\dev\flutter\bin\flutter.bat analyze lib` —— 不得引入新 error/warning。
2. **不要** build；**不要** git add/commit/push。

## 完成后输出（中文）
逐文件：哪个 sheet 迁成整页、用 Scaffold 还是复用 InfoDetailPage、残留 `_sheet` 是迁还是删、返回值是否验证一致、analyze 原文。
