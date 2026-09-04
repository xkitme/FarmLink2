import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/api_client.dart';
import '../core/constants.dart';
import '../design_system/farm_brand.dart';
import '../design_system/farm_nav.dart';

// 116h-A：统一五态组件（Loading/Empty/Error/Unauthorized/Offline）在 design_system 定义，
// 经本文件再导出，让既有页面继续从 `widgets/common.dart` 取到全部状态组件。
export '../design_system/farm_state_views.dart';

/// 品牌顶栏：白底 h64，居中页面标题，右侧搜索/铃铛。
///
/// 116h-A 系统导航收口后的层级契约：
/// - **一级 tab 顶层页**（路径 ∈ [kTopLevelTabPaths] 且无返回栈）：左上角**不**放
///   品牌图（左上语义 = 返回箭头位，避免与二级页混淆），右上角统一显示
///   [FarmBrand] 品牌入口（点击回品牌首页 `/home`）。
/// - **二级及以上页面**（含从一级 push 进入的 tab 页、`go` 直达的二级页）：
///   左上角统一显示返回箭头（可 pop 则 pop，否则回 [backFallback]）。
///
/// [showBack] 显式传 `true`/`false` 时按显式覆盖；不传（默认）自动判定层级。
class FarmAppBar extends StatelessWidget implements PreferredSizeWidget {
  final List<Widget>? actions;
  final VoidCallback? onBell;
  final bool? showBack;

  /// 一级顶层形态时是否在右上角显示田园通品牌入口（默认显示）。
  final bool showBrandEntry;
  final bool showSearch;
  final String backFallback;
  final String title;
  const FarmAppBar({
    super.key,
    this.actions,
    this.onBell,
    this.showBack,
    this.showBrandEntry = true,
    this.showSearch = true,
    this.backFallback = '/home',
    this.title = '田园通',
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  /// 层级自动判定：当前路由是否「一级 tab 顶层页」。
  ///
  /// 判定依据 = 当前 path ∈ [kTopLevelTabPaths] 且导航栈不可再返回
  /// （底栏 `go` 直达时为一级；从首页 `push` 进入同一 tab 页时可返回，按二级处理）。
  bool _autoIsTopLevel(BuildContext context) {
    final router = GoRouter.maybeOf(context);
    if (router == null) return true; // 无路由上下文（如裸组件测试）：退回一级形态
    final state = GoRouterState.of(context);
    final path = state.uri.path;
    if (!isTopLevelTabPath(path)) return false;
    return !router.canPop();
  }

  @override
  Widget build(BuildContext context) {
    // showBack 显式传 true=二级（带返回箭头）/ false=一级；不传则按层级自动判定。
    final isTopLevel = showBack == null ? _autoIsTopLevel(context) : !showBack!;
    final router = GoRouter.maybeOf(context);
    return AppBar(
      toolbarHeight: 64,
      automaticallyImplyLeading: false,
      titleSpacing: 0,
      leading: isTopLevel
          ? null
          : IconButton(
              tooltip: '返回',
              icon: const Icon(Icons.arrow_back,
                  color: AppColors.onSurfaceVariant),
              onPressed: () {
                if (router == null) return;
                if (router.canPop()) {
                  router.pop();
                } else {
                  router.go(backFallback);
                }
              },
            ),
      title: Text(title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
              color: AppColors.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              letterSpacing: 0)),
      actions: [
        if (showSearch)
          IconButton(
            // 进入搜索页用 push：可 pop 返回，返回动画反向而非继续前进。
            onPressed: () => router?.push('/search'),
            icon: const Icon(Icons.search, color: AppColors.onSurfaceVariant),
            tooltip: '全局搜索',
          ),
        ...(actions ??
            [
              IconButton(
                // 进入消息页用 push：可 pop 返回，返回动画反向而非继续前进。
                onPressed: onBell ?? () => router?.push('/messages'),
                icon: const Icon(Icons.notifications_none,
                    color: AppColors.onSurfaceVariant),
                tooltip: '消息通知',
              ),
            ]),
        // 一级 tab 顶层页：右上角统一品牌入口（点击回品牌首页 /home）。
        if (isTopLevel && showBrandEntry)
          IconButton(
            tooltip: '田园通',
            onPressed: () => router?.go('/home'),
            icon: const FarmBrand(markSize: 24, showLabel: false),
          ),
      ],
    );
  }
}

/// 通用卡片：白底 16px 圆角 + 环境光阴影
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final bool ai; // AI 卡片：加麦金内描边
  final Color? color;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.ai = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        color: color ?? AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: ai ? Border.all(color: AppColors.gold, width: 1) : null,
        boxShadow: AppColors.ambientShadow,
      ),
      padding: padding,
      child: child,
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.md),
        child: card,
      ),
    );
  }
}

/// 全局搜索框（Agro-Modernist 标准）：方角 `R.sm` + 1.5px 描边 + 无阴影 + 方角品牌绿「搜索」钮。
///
/// 聚焦时描边与搜索图标转主绿。沉淀自农机页搜索框，作为全局唯一搜索框标准——
/// 各页顶部搜索一律用本组件，**禁**圆角胶囊 / 阴影 / 渐变。
class AppSearchField extends StatefulWidget {
  final TextEditingController controller;
  final String hintText;

  /// 回车或点「搜索」钮触发，回传当前文本。传入时右侧才显示绿「搜索」钮。
  final ValueChanged<String>? onSubmitted;

  /// 实时过滤场景（边打边滤）用。传入时通常不传 `onSubmitted`，即不显示搜索钮。
  final ValueChanged<String>? onChanged;

  /// 清空已有文本后触发，可用于提交式搜索恢复完整列表。
  final VoidCallback? onClear;

  /// 传入时在右侧显示语音输入按钮，不影响默认搜索框行为。
  final VoidCallback? onVoice;
  const AppSearchField({
    super.key,
    required this.controller,
    this.hintText = '搜索',
    this.onSubmitted,
    this.onChanged,
    this.onClear,
    this.onVoice,
  });

  @override
  State<AppSearchField> createState() => _AppSearchFieldState();
}

class _AppSearchFieldState extends State<AppSearchField> {
  final _focus = FocusNode();
  bool _focused = false;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = widget.controller.text.isNotEmpty;
    widget.controller.addListener(_onTextChanged);
    _focus.addListener(() {
      if (_focus.hasFocus != _focused) {
        setState(() => _focused = _focus.hasFocus);
      }
    });
  }

  @override
  void didUpdateWidget(covariant AppSearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onTextChanged);
      widget.controller.addListener(_onTextChanged);
      _hasText = widget.controller.text.isNotEmpty;
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    _focus.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    final hasText = widget.controller.text.isNotEmpty;
    if (hasText != _hasText) setState(() => _hasText = hasText);
  }

  void _clear() {
    widget.controller.clear();
    widget.onChanged?.call('');
    widget.onClear?.call();
  }

  void _submit() => widget.onSubmitted?.call(widget.controller.text);

  @override
  Widget build(BuildContext context) {
    final accent = _focused ? AppColors.primary : null;
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.pill),
        border: Border.all(
          color: accent ?? Colors.transparent,
          width: 1.2,
        ),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.only(left: 16, right: 6),
      child: Row(
        children: [
          Icon(Icons.search,
              color: accent ?? AppColors.onSurfaceVariant, size: 21),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: widget.controller,
              focusNode: _focus,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _submit(),
              onChanged: widget.onChanged,
              // 自定义容器内的输入框：清掉主题里的填充与下划线
              decoration: InputDecoration(
                hintText: widget.hintText,
                hintStyle:
                    const TextStyle(fontSize: 14, color: AppColors.outline),
                filled: false,
                isCollapsed: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
              style: const TextStyle(fontSize: 15, color: AppColors.onSurface),
            ),
          ),
          if (_hasText)
            IconButton(
              tooltip: '清除',
              onPressed: _clear,
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.close,
                  size: 18, color: AppColors.onSurfaceVariant),
            ),
          if (widget.onVoice != null)
            IconButton(
              tooltip: '语音输入',
              onPressed: widget.onVoice,
              visualDensity: VisualDensity.compact,
              icon: Icon(Icons.mic_none,
                  size: 20, color: accent ?? AppColors.onSurfaceVariant),
            ),
          // 方角品牌绿「搜索」按钮：仅提交式（传 onSubmitted）才显示
          if (widget.onSubmitted != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _submit,
              child: Container(
                height: 38,
                padding: const EdgeInsets.symmetric(horizontal: 18),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(R.pill),
                ),
                child: const Text(
                  '搜索',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ] else
            const SizedBox(width: 6),
        ],
      ),
    );
  }
}

/// 小节标题
class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 20, 2, 12),
        child: Row(
          children: [
            Text(text,
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface)),
            const Spacer(),
            if (trailing != null) trailing!,
          ],
        ),
      );
}

/// 状态胶囊 chip
class StatusChip extends StatelessWidget {
  final String text;
  final Color color;
  const StatusChip(this.text, {super.key, this.color = AppColors.primary});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Text(text,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      );
}

/// 顶部预警横幅（红/橙）
class AlertBanner extends StatelessWidget {
  final String text;
  final bool critical;
  const AlertBanner(this.text, {super.key, this.critical = true});
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        color: critical ? AppColors.error : AppColors.warning,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
}

/// 加载中
class Loading extends StatelessWidget {
  final String? text;
  const Loading({super.key, this.text});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(
                color: AppColors.primary, strokeWidth: 2.5),
            if (text != null) ...[
              const SizedBox(height: 12),
              Text(text!,
                  style: const TextStyle(color: AppColors.onSurfaceVariant)),
            ],
          ],
        ),
      );
}

/// 空状态
class EmptyView extends StatelessWidget {
  final String text;
  final IconData icon;
  const EmptyView(this.text, {super.key, this.icon = Icons.inbox_outlined});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppColors.outlineVariant),
            const SizedBox(height: 12),
            Text(text,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 14)),
          ],
        ),
      );
}

/// 错误 + 重试
class ErrorRetry extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  /// 可选图标。默认使用中性错误图标，避免把业务失败暗示为连接问题。
  /// 确认是连通性场景时，调用方可覆盖为 `Icons.cloud_off`。
  final IconData icon;
  const ErrorRetry({
    super.key,
    required this.message,
    required this.onRetry,
    this.icon = Icons.error_outline_rounded,
  });
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppColors.outlineVariant),
            const SizedBox(height: 12),
            Text(message,
                style: const TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('重试'),
            ),
          ],
        ),
      );
}

const String serviceUnavailableMessage = '服务暂时不可用，请稍后重试';

String serviceErrorMessage(Object error,
    {String fallback = serviceUnavailableMessage}) {
  if (error is ApiException && error.message.trim().isNotEmpty) {
    return error.message;
  }
  return fallback;
}

String actionErrorMessage(String action, Object error) {
  final message = serviceErrorMessage(error);
  if (message == serviceUnavailableMessage) {
    return '$action暂时不可用，请稍后重试';
  }
  return '$action失败：$message';
}

/// 通用服务状态面板
class PlaceholderPanel extends StatelessWidget {
  final String title;
  final IconData icon;
  const PlaceholderPanel({super.key, required this.title, required this.icon});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(R.lg),
              ),
              child: Icon(icon, size: 44, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text(title,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface)),
            const SizedBox(height: 6),
            const Text('服务暂时不可用，请稍后重试',
                style: TextStyle(color: AppColors.outline, fontSize: 13)),
          ],
        ),
      );
}

/// 轻提示
void toast(BuildContext context, String msg,
    {bool error = false, double? bottomMargin}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg),
    backgroundColor: error ? AppColors.error : AppColors.primaryContainer,
    behavior: SnackBarBehavior.floating,
    margin: bottomMargin == null
        ? null
        : EdgeInsets.fromLTRB(16, 0, 16, bottomMargin),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.sm)),
    duration: const Duration(seconds: 2),
  ));
}
