import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

/// 首页 · 气象灾害看板 — 1:1 复刻设计稿 _2
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: Column(
        children: [
          const AlertBanner(
              '【红色预警】预计未来 24 小时内将有特大暴雨，请低洼地带农户及时做好排水防涝准备，暂停田间作业。'),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              children: [
                _weatherBento(),
                const SizedBox(height: 24),
                _forecastCard(),
                const SectionTitle('核心服务'),
                _serviceGrid(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _serviceGrid(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: kSections.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: 1.62,
      ),
      itemBuilder: (context, index) {
        final item = kSections[index];
        final color = item['color'] as Color;
        return AppCard(
          onTap: () => _openSection(context, item['key'] as String),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(item['icon'] as IconData, color: color, size: 25),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item['label'] as String,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 15,
                    height: 1.25,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openSection(BuildContext context, String key) {
    switch (key) {
      case 'market':
        context.go('/market');
        return;
      case 'machinery':
        context.go('/machinery');
        return;
      case 'policy':
        context.go('/policy');
        return;
      case 'ai':
      case 'agri':
        context.go('/ai');
        return;
      case 'life':
        context.go('/publish');
        return;
      case 'disaster':
        toast(context, '当前页已展示气象灾害看板');
        return;
      case 'data':
        context.go('/data');
        return;
      default:
        toast(context, '功能页面正在接入');
    }
  }

  // 气象 Bento 网格
  Widget _weatherBento() {
    return Column(
      children: [
        _heroTempCard().animate().fadeIn(duration: 400.ms).slideY(begin: 0.12),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: _soilCard()),
            const SizedBox(width: 16),
            Expanded(child: _humidityCard()),
          ],
        ).animate(delay: 120.ms).fadeIn(duration: 400.ms).slideY(begin: 0.12),
      ],
    );
  }

  // 主温度卡（跨两列，暴雨云实景背景）
  Widget _heroTempCard() {
    return Container(
      height: 168,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/images/_2_1.jpg',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const ColoredBox(color: Color(0xFF3F4A40))),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xCC2A2E27), Color(0x992A2E27)],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('当前气况 · 实验田 A 区',
                              style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  letterSpacing: 1)),
                          SizedBox(height: 6),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text('26°C',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 36,
                                      fontWeight: FontWeight.w700)),
                              SizedBox(width: 8),
                              Text('/ 32°C 最高',
                                  style: TextStyle(
                                      color: Colors.white70, fontSize: 14)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.thunderstorm,
                        color: AppColors.primaryDim, size: 40),
                  ],
                ),
                const Spacer(),
                Row(
                  children: [
                    _glassChip(Icons.air, '阵风 8 级'),
                    const SizedBox(width: 12),
                    _glassChip(Icons.water_drop, '降水率 95%'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _glassChip(IconData icon, String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(R.md),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppColors.onSurface),
            const SizedBox(width: 4),
            Text(text,
                style:
                    const TextStyle(fontSize: 12, color: AppColors.onSurface)),
          ],
        ),
      );

  // 土壤墒情卡（麦金描边）
  Widget _soilCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.lg),
        border: Border.all(color: AppColors.gold),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.grass, size: 18, color: AppColors.tertiary),
              SizedBox(width: 6),
              Text('土壤墒情 (AI分析)',
                  style: TextStyle(
                      fontSize: 12,
                      letterSpacing: 0.4,
                      color: AppColors.tertiary)),
            ],
          ),
          SizedBox(height: 8),
          Text('过饱和',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          SizedBox(height: 4),
          Text('积水风险极高',
              style: TextStyle(fontSize: 12, color: AppColors.error)),
        ],
      ),
    );
  }

  // 相对湿度卡
  Widget _humidityCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.water_drop_outlined,
                  size: 18, color: AppColors.onSurfaceVariant),
              SizedBox(width: 6),
              Text('相对湿度',
                  style: TextStyle(
                      fontSize: 12,
                      letterSpacing: 0.4,
                      color: AppColors.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 8),
          const Text('88%',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: const LinearProgressIndicator(
              value: 0.88,
              minHeight: 8,
              backgroundColor: AppColors.surfaceHigh,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  // 24 小时趋势预判
  Widget _forecastCard() {
    const bars = [
      ('现在', 90.0, AppColors.error),
      ('14:00', 100.0, AppColors.error),
      ('16:00', 70.0, AppColors.errorContainer),
      ('18:00', 40.0, Color(0x802E7D32)),
      ('20:00', 20.0, Color(0x4D2E7D32)),
      ('22:00', 10.0, Color(0x332E7D32)),
    ];
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('24小时趋势预判',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface)),
              Row(
                children: [
                  Text('详情',
                      style: TextStyle(fontSize: 12, color: AppColors.primary)),
                  Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final b in bars)
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          height: b.$2,
                          decoration: BoxDecoration(
                            color: b.$3,
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4)),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(b.$1,
                            style: const TextStyle(
                                fontSize: 10,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text('降水量预测 (mm)',
                style:
                    TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
          ),
        ],
      ),
    ).animate(delay: 240.ms).fadeIn(duration: 400.ms).slideY(begin: 0.12);
  }
}
