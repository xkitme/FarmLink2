import 'package:flutter/material.dart';
import '../core/constants.dart';

/// 加载中
class Loading extends StatelessWidget {
  final String? text;
  const Loading({super.key, this.text});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2.5),
            if (text != null) ...[
              const SizedBox(height: 12),
              Text(text!, style: const TextStyle(color: AppColors.textSecondary)),
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
            Icon(icon, size: 56, color: AppColors.textHint),
            const SizedBox(height: 12),
            Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
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
            const Icon(Icons.cloud_off, size: 56, color: AppColors.textHint),
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('重试'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
              ),
            ),
          ],
        ),
      );
}

/// 小节标题
class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 14, 4, 10),
        child: Row(
          children: [
            Container(
              width: 4, height: 16,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            Text(text, style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
            )),
            const Spacer(),
            if (trailing != null) trailing!,
          ],
        ),
      );
}

/// 通用卡片
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: padding,
      child: child,
    );
    if (onTap == null) return card;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: card,
    );
  }
}

/// 占位页（板块页面在分段 17+ 实现）
class PlaceholderPanel extends StatelessWidget {
  final String title;
  final IconData icon;
  const PlaceholderPanel({super.key, required this.title, required this.icon});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 64, color: AppColors.primary.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(
              fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
            const SizedBox(height: 6),
            const Text('功能页面将于后续分段实现', style: TextStyle(color: AppColors.textHint)),
          ],
        ),
      );
}

/// 轻提示
void toast(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg),
    backgroundColor: error ? AppColors.danger : AppColors.primaryDark,
    behavior: SnackBarBehavior.floating,
    duration: const Duration(seconds: 2),
  ));
}
