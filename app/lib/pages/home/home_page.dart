import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/notification_state.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

/// 首页 · 气象灾害看板 — 接入服务端 /agri/weather（样式复刻设计稿 _2）
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
  Map<String, dynamic>? _latestNotification;
  Map<String, dynamic>? _latestPublish;
  int _unread = 0;
  int _waiting = 0;
  String? _queueHint;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final results = await Future.wait<dynamic>([
      _loadWeatherSnapshot(),
      _loadLatestNotification(),
      _loadLatestPublish(),
      OfflineSyncQueue.all().catchError((_) => <SyncQueueItem>[]),
      NotificationState.refresh().then((_) => NotificationState.unread.value),
    ]);
    if (!mounted) return;

    final weather = results[0] as Map<String, dynamic>;
    final notification = results[1] as Map<String, dynamic>?;
    final publish = results[2] as Map<String, dynamic>?;
    final queue = (results[3] as List).whereType<SyncQueueItem>().toList();
    final waiting =
        queue.where((item) => item.status != SyncStatus.synced).toList();

    setState(() {
      _days = _listOfMaps(weather['days']);
      _alerts = _listOfMaps(weather['alerts']);
      _fromCache = weather['fromCache'] == true;
      _cacheTime =
          weather['cacheTime'] == null ? null : '${weather['cacheTime']}';
      _latestNotification = notification;
      _latestPublish = publish;
      _unread = results[4] is int
          ? results[4] as int
          : NotificationState.unread.value;
      _waiting = waiting.length;
      _queueHint = waiting.isEmpty ? null : _queueTitleOf(waiting.first);
      _loading = false;
    });
  }

  Future<Map<String, dynamic>> _loadWeatherSnapshot() async {
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
      return {
        'days': days,
        'alerts': alerts,
        'fromCache': false,
        'cacheTime': null,
      };
    } catch (_) {
      final cached = await OfflineCache.readList(_cacheKey);
      final cacheTime = await OfflineCache.updatedAt(_cacheKey);
      if (cached.isEmpty) {
        return {
          'days': const <Map<String, dynamic>>[],
          'alerts': const <Map<String, dynamic>>[],
          'fromCache': false,
          'cacheTime': null,
        };
      }
      return {
        'days': _listOfMaps(cached.first['days']),
        'alerts': _listOfMaps(cached.first['alerts']),
        'fromCache': true,
        'cacheTime': cacheTime,
      };
    }
  }

  Future<Map<String, dynamic>?> _loadLatestNotification() async {
    try {
      final data = await ApiClient.get('/notification/list',
          query: {'pageNum': 1, 'pageSize': 1});
      final records = _recordsOf(data);
      return records.isEmpty ? null : records.first;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> _loadLatestPublish() async {
    try {
      final data = await ApiClient.get('/life/help/list',
          query: {'pageNum': 1, 'pageSize': 1});
      final records = _recordsOf(data);
      return records.isEmpty ? null : records.first;
    } catch (_) {
      return null;
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
                  AlertBanner(
                      '气象数据更新中${_cacheTime == null ? '' : ' · 上次同步 $_cacheTime'}',
                      critical: false),
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                      children: [
                        _weatherStripCard()
                            .animate()
                            .fadeIn(duration: 360.ms)
                            .slideY(begin: 0.08),
                        const SectionTitle('核心服务'),
                        _serviceGrid(context),
                        const SectionTitle('我的快讯'),
                        _quickPanel()
                            .animate(delay: 80.ms)
                            .fadeIn(duration: 360.ms)
                            .slideY(begin: 0.08),
                        const SectionTitle('未来天气趋势'),
                        _forecastCard(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  IconData _conditionIcon(String c) {
    if (c.contains('雷')) return Icons.thunderstorm;
    if (c.contains('雨')) return Icons.grain;
    if (c.contains('雪')) return Icons.ac_unit;
    if (c.contains('云') || c.contains('阴')) return Icons.cloud;
    return Icons.wb_sunny;
  }

  Widget _weatherStripCard() {
    final t = _today;
    final cond = '${t['condition'] ?? '晴'}';
    final low = _int(t['tempLow']);
    final high = _int(t['tempHigh']);
    final humidity = _int(t['humidity']);
    final wind = _int(t['windLevel']);
    final soil = _soilStatusOf(humidity, cond);
    return AppCard(
      onTap: () => context.push('/disaster'),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(R.md),
            ),
            child:
                Icon(_conditionIcon(cond), color: AppColors.primary, size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _days.isEmpty ? '气象数据更新中' : '$low°~$high°  $cond',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '湿度 $humidity% · 风 $wind 级 · 墒情$soil',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right_rounded, color: AppColors.outline),
        ],
      ),
    );
  }

  String _soilStatusOf(int humidity, String cond) {
    if (cond.contains('雨') || humidity >= 85) {
      return '偏湿';
    }
    if (humidity < 55 && humidity > 0) return '偏旱';
    return '适宜';
  }

  // 未来天气趋势（服务端 7 日预报）
  Widget _forecastCard() {
    final days = _days.take(7).toList();
    if (days.isEmpty) {
      return const AppCard(
        child: EmptyView('暂无天气趋势', icon: Icons.bar_chart_rounded),
      );
    }
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
        crossAxisCount: 4,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.95,
      ),
      itemBuilder: (context, index) {
        final item = kSections[index];
        final color = item['color'] as Color;
        return AppCard(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
          onTap: () => _openSection(context, item['key'] as String),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(item['icon'] as IconData, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                item['label'] as String,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 12,
                  height: 1.2,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _quickPanel() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _quickCard(
            icon: Icons.mail_rounded,
            color: _unread > 0 ? AppColors.error : AppColors.primary,
            title: '未读消息',
            badge: '$_unread',
            subtitle: _text(_latestNotification?['title'], fallback: '暂无新消息'),
            onTap: () => context.go('/messages'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _quickCard(
            icon: Icons.sync_alt_rounded,
            color: _waiting > 0 ? AppColors.warning : AppColors.primary,
            title: '待发送',
            badge: '$_waiting',
            subtitle: _waiting > 0 ? (_queueHint ?? '有数据等待发送') : '数据已同步',
            onTap: () => context.push('/data/service'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _quickCard(
            icon: Icons.add_circle_outline_rounded,
            color: AppColors.secondary,
            title: '最近发布',
            subtitle: _text(_latestPublish?['title'], fallback: '暂无发布'),
            onTap: () => context.go('/publish'),
          ),
        ),
      ],
    );
  }

  Widget _quickCard({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? badge,
  }) {
    return SizedBox(
      height: 96,
      child: AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 16),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (badge != null)
                  Text(
                    badge,
                    style: TextStyle(
                      color: color,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 12,
                  height: 1.35,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static List<Map<String, dynamic>> _recordsOf(dynamic data) {
    if (data is Map) return _listOfMaps(data['records']);
    return const [];
  }

  static List<Map<String, dynamic>> _listOfMaps(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map(_mapOf).toList();
    }
    return const [];
  }

  static Map<String, dynamic> _mapOf(Map value) =>
      value.map((key, value) => MapEntry('$key', value));

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _queueTitleOf(SyncQueueItem item) {
    final error = _text(item.lastError);
    if (error.isNotEmpty) return error;
    return '${_tableLabel(item.tableName)}等待发送';
  }

  static String _tableLabel(String tableName) {
    switch (tableName) {
      case 'farm_record':
        return '农事记录';
      case 'land_plot':
        return '地块数据';
      case 'disaster_report':
        return '灾情上报';
      case 'subsidy_application':
        return '补贴申请';
      case 'machinery_booking':
        return '农机预约';
      case 'help_request':
        return '互助信息';
      default:
        return '业务数据';
    }
  }

  void _openSection(BuildContext context, String key) {
    switch (key) {
      case 'market':
        context.push('/market');
      case 'machinery':
        context.push('/machinery');
      case 'policy':
        context.push('/policy');
      case 'agri':
        context.push('/agri');
      case 'ai':
        context.go('/ai');
      case 'life':
        context.push('/life');
      case 'data':
        context.push('/data');
      case 'disaster':
        context.push('/disaster');
      default:
        toast(context, '该服务暂时不可用，请稍后重试');
    }
  }
}
