import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/constants.dart';

/// 品牌顶栏：白底 h64，左农机图标、居中「FarmLink 田园通」粗体绿、右铃铛
class FarmAppBar extends StatelessWidget implements PreferredSizeWidget {
  final List<Widget>? actions;
  final VoidCallback? onBell;
  const FarmAppBar({super.key, this.actions, this.onBell});

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      toolbarHeight: 64,
      automaticallyImplyLeading: false,
      titleSpacing: 0,
      leading: const Center(
        child: Icon(Icons.agriculture, color: AppColors.primary, size: 26),
      ),
      title: const Text('FarmLink 田园通',
          style: TextStyle(
              color: AppColors.primary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: 0)),
      actions: actions ??
          [
            IconButton(
              onPressed: onBell ?? () {},
              icon: const Icon(Icons.notifications_none,
                  color: AppColors.onSurfaceVariant),
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
  const ErrorRetry({super.key, required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 56, color: AppColors.outlineVariant),
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
void toast(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg),
    backgroundColor: error ? AppColors.error : AppColors.primaryContainer,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.sm)),
    duration: const Duration(seconds: 2),
  ));
}
