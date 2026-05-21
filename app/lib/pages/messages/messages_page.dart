import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class MessagesPage extends StatelessWidget {
  const MessagesPage({super.key});

  static const _items = [
    (icon: Icons.thunderstorm, title: '气象预警', desc: '红色暴雨预警已发布', color: AppColors.error, time: '10:24'),
    (icon: Icons.account_balance, title: '惠农政策', desc: '2024 年实际种粮补贴开始申报', color: AppColors.primaryContainer, time: '昨天'),
    (icon: Icons.eco, title: '农事提醒', desc: '柑橘进入保果期，注意疏果', color: AppColors.primary, time: '昨天'),
    (icon: Icons.campaign, title: '系统通知', desc: '田园通 v1.0 正式上线', color: AppColors.goldContainer, time: '2 天前'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          const SectionTitle('消息通知'),
          for (final m in _items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppCard(
                onTap: () => toast(context, '消息详情将于后续分段实现'),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: m.color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(R.md),
                      ),
                      child: Icon(m.icon, color: m.color, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(m.title,
                                  style: const TextStyle(
                                      fontSize: 14, fontWeight: FontWeight.w600)),
                              const Spacer(),
                              Text(m.time,
                                  style: const TextStyle(
                                      fontSize: 11, color: AppColors.outline)),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(m.desc,
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.onSurfaceVariant)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
