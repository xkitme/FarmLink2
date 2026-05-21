import 'package:flutter/material.dart';
import '../core/constants.dart';

class CategoryChip extends StatelessWidget {
  final String category;
  final bool selected;
  final VoidCallback? onTap;

  const CategoryChip({
    super.key,
    required this.category,
    this.selected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final info = kCategories[category];
    final label = info?['label'] as String? ?? category;
    final color = info?['color'] as Color? ?? InkColors.gold;
    final emoji = info?['icon'] as String? ?? '📄';

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.15) : InkColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : InkColors.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: selected ? color : InkColors.textSecondary,
                fontSize: 13,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
