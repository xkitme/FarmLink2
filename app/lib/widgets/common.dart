import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/api_client.dart';
import '../core/constants.dart';

/// 品牌顶栏：白底 h64，左农机图标（或返回箭头）、居中「田园通」粗体绿、右搜索/铃铛
///
/// 一级 tab 页：直接 `FarmAppBar()`，左侧是品牌叶 icon。
/// 详情页：`FarmAppBar(showBack: true, backFallback: '/home')`，左侧变返回箭头。
class FarmAppBar extends StatelessWidget implements PreferredSizeWidget {
  final List<Widget>? actions;
  final VoidCallback? onBell;
  final bool showBack;
  final bool showSearch;
  final String backFallback;
  final String title;
  const FarmAppBar({
    super.key,
    this.actions,
    this.onBell,
    this.showBack = false,
    this.showSearch = true,
    this.backFallback = '/home',
    this.title = '田园通',
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      toolbarHeight: 64,
      automaticallyImplyLeading: false,
      titleSpacing: 0,
      leading: showBack
          ? IconButton(
              tooltip: '返回',
              icon: const Icon(Icons.arrow_back,
                  color: AppColors.onSurfaceVariant),
              onPressed: () {
                final router = GoRouter.of(context);
                if (router.canPop()) {
                  router.pop();
                } else {
                  router.go(backFallback);
                }
              },
            )
          : const Center(
              // 顶栏左上固定为拖拉机图标(与登录页品牌标一致的 Icons.agriculture)，
              // 不随后端品牌图替换而变。
              child: Icon(Icons.agriculture, color: AppColors.primary, size: 30),
            ),
      title: Text(title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
              color: AppColors.primary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: 0)),
      actions: [
        if (showSearch)
          IconButton(
            onPressed: () => GoRouter.of(context).go('/search'),
            icon: const Icon(Icons.search, color: AppColors.onSurfaceVariant),
            tooltip: '全局搜索',
          ),
        ...(actions ??
            [
              IconButton(
                onPressed: onBell ?? () => GoRouter.of(context).go('/messages'),
                icon: const Icon(Icons.notifications_none,
                    color: AppColors.onSurfaceVariant),
                tooltip: '消息通知',
              ),
            ]),
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
        borderRadius: BorderRadius.circular(R.sm),
        border: Border.all(
          color: accent ?? AppColors.outlineVariant,
          width: 1.5,
        ),
      ),
      padding: const EdgeInsets.only(left: 14, right: 6),
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
                  borderRadius: BorderRadius.circular(R.sm - 2),
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
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
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
