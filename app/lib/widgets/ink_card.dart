import 'package:flutter/material.dart';
import '../core/constants.dart';

class InkCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Gradient? gradient;
  final double radius;

  const InkCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.gradient,
    this.radius = 12,
  });

  @override
  Widget build(BuildContext context) {
    Widget card = Container(
      decoration: BoxDecoration(
        color: gradient == null ? InkColors.surface : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: InkColors.border),
      ),
      child: padding != null
          ? Padding(padding: padding!, child: child)
          : child,
    );

    if (onTap != null) {
      card = InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: card,
      );
    }
    return card;
  }
}

// 带金色左边框的内容行
class InkListTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? tag;
  final VoidCallback? onTap;
  final Widget? trailing;

  const InkListTile({
    super.key,
    required this.title,
    this.subtitle,
    this.tag,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 40,
            decoration: BoxDecoration(
              gradient: InkColors.goldGradient,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(
                  color: InkColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.5,
                )),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(subtitle!, style: const TextStyle(
                    color: InkColors.textSecondary,
                    fontSize: 12,
                  )),
                ],
              ],
            ),
          ),
          if (tag != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: InkColors.goldDim.withOpacity(0.3),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: InkColors.gold.withOpacity(0.5)),
              ),
              child: Text(tag!, style: const TextStyle(
                color: InkColors.gold,
                fontSize: 11,
                letterSpacing: 0.5,
              )),
            ),
          ],
          if (trailing != null) trailing!,
          if (trailing == null && onTap != null)
            const Icon(Icons.chevron_right, color: InkColors.textDisabled, size: 18),
        ],
      ),
    );
  }
}

// 金色分隔线
class GoldDivider extends StatelessWidget {
  const GoldDivider({super.key});

  @override
  Widget build(BuildContext context) => Container(
    height: 1,
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [Colors.transparent, InkColors.goldDim, Colors.transparent],
      ),
    ),
  );
}

// 标题栏小节标题
class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? action;

  const SectionTitle(this.text, {super.key, this.action});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(0, 8, 0, 12),
    child: Row(
      children: [
        Container(width: 3, height: 16, color: InkColors.gold),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(
          color: InkColors.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: 1,
        )),
        const Spacer(),
        if (action != null) action!,
      ],
    ),
  );
}

// 加载占位
class InkLoading extends StatelessWidget {
  final String? message;
  const InkLoading({super.key, this.message});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(
          width: 32,
          height: 32,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation(InkColors.gold),
          ),
        ),
        if (message != null) ...[
          const SizedBox(height: 12),
          Text(message!, style: const TextStyle(color: InkColors.textSecondary, fontSize: 13)),
        ],
      ],
    ),
  );
}

// 空状态
class InkEmpty extends StatelessWidget {
  final String message;
  const InkEmpty(this.message, {super.key});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('〇', style: TextStyle(color: InkColors.textDisabled, fontSize: 48)),
        const SizedBox(height: 12),
        Text(message, style: const TextStyle(color: InkColors.textSecondary, fontSize: 14)),
      ],
    ),
  );
}
