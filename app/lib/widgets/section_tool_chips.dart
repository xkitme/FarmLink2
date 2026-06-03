import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/constants.dart';
import '../core/feature_catalog.dart';

/// 板块主页头部「工具 chip 索引」：横滑列出该 section 的全部功能，点击直达 route。
class SectionToolChips extends StatelessWidget {
  final String section;

  const SectionToolChips({super.key, required this.section});

  @override
  Widget build(BuildContext context) {
    final items = kFeatureCatalog.where((f) => f.section == section).toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final f = items[i];
          return InkWell(
            borderRadius: BorderRadius.circular(R.sm),
            onTap: () => context.go(f.route),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(R.sm),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Row(
                children: [
                  Icon(f.icon, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    f.name,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
