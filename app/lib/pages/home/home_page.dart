import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const _quickEntries = [
    (icon: Icons.camera_alt,      label: '病虫害识别', color: AppColors.primary),
    (icon: Icons.cloudy_snowing,  label: '气象预警',   color: AppColors.sky),
    (icon: Icons.trending_up,     label: '行情查询',   color: AppColors.harvest),
    (icon: Icons.account_balance, label: '惠农政策',   color: Color(0xFFC0392B)),
    (icon: Icons.agriculture,     label: '农机预约',   color: AppColors.earth),
    (icon: Icons.smart_toy,       label: 'AI 问答',    color: Color(0xFF2E8B8B)),
    (icon: Icons.warning_amber,   label: '灾情上报',   color: AppColors.danger),
    (icon: Icons.more_horiz,      label: '全部服务',   color: AppColors.textSecondary),
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _header(context, user?.displayName ?? '老乡', user?.villageName),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Transform.translate(
                    offset: const Offset(0, -28),
                    child: _weatherCard(),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SectionTitle('常用功能'),
                        _quickGrid(context),
                        const SectionTitle('八大板块'),
                        _sectionList(context),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context, String name, String? village) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 44),
      decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('你好，$name',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(village ?? '田园通 · 让科技助力乡村',
                    style: const TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications_none, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _weatherCard() {
    return AppCard(
      child: Row(
        children: [
          const Icon(Icons.wb_sunny, color: AppColors.harvest, size: 44),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('今日多云转晴  18~26℃',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                SizedBox(height: 4),
                Text('适宜田间作业，注意午后防晒',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textHint),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2);
  }

  Widget _quickGrid(BuildContext context) {
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 6,
      childAspectRatio: 0.92,
      children: [
        for (final e in _quickEntries)
          InkWell(
            onTap: () => context.go('/service'),
            borderRadius: BorderRadius.circular(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: e.color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(e.icon, color: e.color, size: 24),
                ),
                const SizedBox(height: 6),
                Text(e.label,
                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _sectionList(BuildContext context) {
    return Column(
      children: [
        for (final s in kSections)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              padding: const EdgeInsets.all(14),
              onTap: () => context.go('/service'),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: (s['color'] as Color).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(s['icon'] as IconData,
                        color: s['color'] as Color, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(s['label'] as String,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                  ),
                  const Icon(Icons.chevron_right, color: AppColors.textHint),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
