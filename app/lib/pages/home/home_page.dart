import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const _quick = [
    (icon: Icons.camera_alt_rounded,   label: '病害识别', color: AppColors.primary),
    (icon: Icons.thunderstorm_rounded, label: '气象预警', color: AppColors.error),
    (icon: Icons.trending_up_rounded,  label: '行情查询', color: AppColors.goldContainer),
    (icon: Icons.account_balance,      label: '惠农政策', color: AppColors.primaryContainer),
    (icon: Icons.agriculture_rounded,  label: '农机预约', color: AppColors.secondary),
    (icon: Icons.smart_toy_rounded,    label: 'AI 问答',  color: AppColors.primary),
    (icon: Icons.report_problem,       label: '灾情上报', color: AppColors.error),
    (icon: Icons.grid_view_rounded,    label: '全部',     color: AppColors.onSurfaceVariant),
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          const AlertBanner('【红色预警】预计未来 24 小时有特大暴雨，请低洼地带农户做好排水防涝准备。'),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _greeting(user?.displayName ?? '老乡'),
                const SizedBox(height: 16),
                _weatherCard().animate().fadeIn(duration: 400.ms).slideY(begin: 0.15),
                const SectionTitle('常用功能'),
                _quickGrid(context),
                const SectionTitle('八大板块'),
                _sectionGrid(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _greeting(String name) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.primaryContainer.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(R.md),
          ),
          child: const Icon(Icons.wb_sunny_rounded, color: AppColors.goldContainer),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('你好，$name',
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const Text('今天也是适合耕作的好天气',
                  style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _weatherCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('当前气况 · 实验田 A 区',
                  style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 0.5)),
              const Spacer(),
              const Icon(Icons.cloud_rounded, color: Colors.white, size: 28),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: const [
              Text('26°C',
                  style: TextStyle(
                      color: Colors.white, fontSize: 40, fontWeight: FontWeight.w700)),
              SizedBox(width: 8),
              Text('/ 32°C 最高',
                  style: TextStyle(color: Colors.white70, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _weatherChip(Icons.air, '阵风 8 级'),
              const SizedBox(width: 10),
              _weatherChip(Icons.water_drop, '降水率 95%'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _weatherChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(R.md),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 14),
          const SizedBox(width: 4),
          Text(text, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _quickGrid(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 14,
        childAspectRatio: 0.88,
        children: [
          for (final e in _quick)
            InkWell(
              onTap: () => context.go('/ai'),
              borderRadius: BorderRadius.circular(R.sm),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: e.color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(R.md),
                    ),
                    child: Icon(e.icon, color: e.color, size: 23),
                  ),
                  const SizedBox(height: 6),
                  Text(e.label,
                      style: const TextStyle(fontSize: 12, color: AppColors.onSurface)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _sectionGrid(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.7,
      children: [
        for (final s in kSections)
          AppCard(
            padding: const EdgeInsets.all(14),
            onTap: () => toast(context, '${s['label']} 功能页将于后续分段实现'),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: (s['color'] as Color).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: Icon(s['icon'] as IconData,
                      color: s['color'] as Color, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(s['label'] as String,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
