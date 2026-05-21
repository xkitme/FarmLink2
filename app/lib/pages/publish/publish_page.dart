import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class PublishPage extends StatelessWidget {
  const PublishPage({super.key});

  static const _kinds = [
    (icon: Icons.dynamic_feed,        title: '乡村动态', desc: '分享田间见闻与生活',  color: AppColors.primary),
    (icon: Icons.storefront,          title: '发布商品', desc: '农产品上架集市',      color: AppColors.goldContainer),
    (icon: Icons.agriculture,         title: '出租农机', desc: '闲置农机共享租赁',    color: AppColors.secondary),
    (icon: Icons.report_problem,      title: '灾情上报', desc: '上报受灾情况',        color: AppColors.error),
    (icon: Icons.handshake,           title: '邻里互助', desc: '发布求助或提供帮助',  color: AppColors.primaryContainer),
    (icon: Icons.work_outline,        title: '招工用工', desc: '发布本地用工信息',    color: AppColors.tertiary),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          const SectionTitle('我要发布'),
          for (final k in _kinds)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppCard(
                onTap: () => toast(context, '${k.title}将于后续分段实现'),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: k.color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(R.md),
                      ),
                      child: Icon(k.icon, color: k.color, size: 23),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(k.title,
                              style: const TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 2),
                          Text(k.desc,
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.onSurfaceVariant)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.outline),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
