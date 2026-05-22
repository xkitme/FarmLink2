import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';

/// 首页 · 气象灾害看板 — 接入后端 /agri/weather（样式复刻设计稿 _2）
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const _cacheKey = 'agri:weather';

  bool _loading = true;
  bool _fromCache = false;
  String? _cacheTime;
  List<Map<String, dynamic>> _days = [];
  List<Map<String, dynamic>> _alerts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.get('/agri/weather') as Map<String, dynamic>;
      final days = (data['days'] as List? ?? [])
          .whereType<Map>()
          .map((e) => e.cast<String, dynamic>())
          .toList();
      final alerts = (data['alerts'] as List? ?? [])
          .whereType<Map>()
          .map((e) => e.cast<String, dynamic>())
          .toList();
      await OfflineCache.saveList(_cacheKey, [
        {'days': days, 'alerts': alerts}
      ]);
      if (!mounted) return;
      setState(() {
        _days = days;
        _alerts = alerts;
        _fromCache = false;
        _loading = false;
      });
    } catch (_) {
      final cached = await OfflineCache.readList(_cacheKey);
      final cacheTime = await OfflineCache.updatedAt(_cacheKey);
      if (!mounted) return;
      setState(() {
        if (cached.isNotEmpty) {
          _days = (cached.first['days'] as List? ?? [])
              .whereType<Map>()
              .map((e) => e.cast<String, dynamic>())
              .toList();
          _alerts = (cached.first['alerts'] as List? ?? [])
              .whereType<Map>()
              .map((e) => e.cast<String, dynamic>())
              .toList();
          _fromCache = true;
          _cacheTime = cacheTime;
        }
        _loading = false;
      });
    }
  }

  Map<String, dynamic> get _today => _days.isNotEmpty ? _days.first : const {};

  int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: _loading
          ? const Loading(text: '正在获取气象数据...')
          : Column(
              children: [
                if (_alerts.isNotEmpty)
                  AlertBanner(
                    '【${_alerts.first['alertLevel'] ?? '预警'}】${_alerts.first['title'] ?? _alerts.first['content'] ?? '请注意防范'}',
                  )
                else if (_fromCache)
                  AlertBanner('当前气象来自离线缓存${_cacheTime == null ? '' : ' · $_cacheTime'}',
                      critical: false),
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _load,
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
                ),
              ],
            ),
    );
  }

  // ── 气象 Bento ────────────────────────────
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

  IconData _conditionIcon(String c) {
    if (c.contains('雷')) return Icons.thunderstorm;
    if (c.contains('雨')) return Icons.grain;
    if (c.contains('雪')) return Icons.ac_unit;
    if (c.contains('云') || c.contains('阴')) return Icons.cloud;
    return Icons.wb_sunny;
  }

  Widget _heroTempCard() {
    final t = _today;
    final cond = '${t['condition'] ?? '晴'}';
    final low = _int(t['tempLow']);
    final high = _int(t['tempHigh']);
    final wind = _int(t['windLevel']);
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
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('当前气况 · 本地农区',
                              style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  letterSpacing: 1)),
                          const SizedBox(height: 6),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text('$low°C',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 36,
                                      fontWeight: FontWeight.w700)),
                              const SizedBox(width: 8),
                              Text('/ $high°C 最高',
                                  style: const TextStyle(
                                      color: Colors.white70, fontSize: 14)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Icon(_conditionIcon(cond),
                        color: AppColors.primaryDim, size: 40),
                  ],
                ),
                const Spacer(),
                Row(
                  children: [
                    _glassChip(Icons.air, '阵风 $wind 级'),
                    const SizedBox(width: 12),
                    _glassChip(_conditionIcon(cond), cond),
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

  // 土壤墒情（按湿度/天气推断）
  Widget _soilCard() {
    final humidity = _int(_today['humidity']);
    final cond = '${_today['condition'] ?? ''}';
    String status;
    String note;
    Color noteColor;
    if (cond.contains('雨') || humidity >= 85) {
      status = '偏湿';
      note = '积水风险偏高';
      noteColor = AppColors.error;
    } else if (humidity < 55 && humidity > 0) {
      status = '偏旱';
      note = '建议及时补水';
      noteColor = AppColors.warning;
    } else {
      status = '适宜';
      note = '墒情正常，可正常作业';
      noteColor = AppColors.primary;
    }
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.lg),
        border: Border.all(color: AppColors.gold),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
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
          const SizedBox(height: 8),
          Text(status,
              style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 4),
          Text(note, style: TextStyle(fontSize: 12, color: noteColor)),
        ],
      ),
    );
  }

  Widget _humidityCard() {
    final humidity = _int(_today['humidity']);
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
          Text('$humidity%',
              style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: (humidity / 100).clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: AppColors.surfaceHigh,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  // 未来天气趋势（后端 7 日预报）
  Widget _forecastCard() {
    final days = _days.take(7).toList();
    final highs = days.map((d) => _int(d['tempHigh'])).toList();
    final maxH = highs.isEmpty ? 1 : highs.reduce((a, b) => a > b ? a : b);
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
          const Text('未来天气趋势',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 16),
          SizedBox(
            height: 130,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final d in days)
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text('${_int(d['tempHigh'])}°',
                            style: const TextStyle(
                                fontSize: 10,
                                color: AppColors.onSurfaceVariant)),
                        const SizedBox(height: 2),
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 5),
                          height: (_int(d['tempHigh']) / maxH * 80)
                              .clamp(8.0, 80.0),
                          decoration: BoxDecoration(
                            color: '${d['condition'] ?? ''}'.contains('雨')
                                ? const Color(0xFF4A90D9)
                                : AppColors.primaryContainer,
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4)),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(_md('${d['date'] ?? ''}'),
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
            child: Text('每日最高气温 (°C)',
                style:
                    TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
          ),
        ],
      ),
    ).animate(delay: 240.ms).fadeIn(duration: 400.ms).slideY(begin: 0.12);
  }

  String _md(String iso) {
    if (iso.length >= 10) return iso.substring(5, 10);
    return iso;
  }

  // ── 核心服务入口 ──────────────────────────
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
      case 'machinery':
        context.go('/machinery');
      case 'policy':
        context.go('/policy');
      case 'agri':
        context.go('/agri');
      case 'ai':
        context.go('/ai');
      case 'life':
        context.go('/publish');
      case 'data':
        context.go('/data');
      case 'disaster':
        context.go('/disaster');
      default:
        toast(context, '功能页面正在接入');
    }
  }
}
