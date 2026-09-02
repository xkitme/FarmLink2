import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';
import '../../core/notification_state.dart';
import '../../design_system/farm_brand.dart';
import '../../design_system/farm_tokens.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';

/// 首页 — 排版参考设计稿「首页排版」，样式沿用项目 Agro-Modernist 系统。
/// 块序：问候+天气 → 搜索 → 今日决策卡 → 六条主路径 → 板块大图 → 周边行情 → 惠农补贴。
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
  List<Map<String, dynamic>> _todoRecords = [];
  Map<String, dynamic>? _upcomingPolicyDeadline;
  Map<String, dynamic>? _platformStats;
  List<Map<String, dynamic>> _prices = [];
  Map<String, dynamic>? _subsidy;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final isAdmin = context.read<AuthState>().user?.role == 'ADMIN';
    final results = await Future.wait<dynamic>([
      _loadWeatherSnapshot(),
      _loadTodoRecords(),
      isAdmin
          ? _loadDashboardExtras()
          : Future.value({'policy': null, 'stats': null}),
      _loadPrices(),
      _loadSubsidy(),
      NotificationState.refresh().then((_) => null),
    ]);
    if (!mounted) return;
    final weather = results[0] as Map<String, dynamic>;
    setState(() {
      _days = _listOfMaps(weather['days']);
      _alerts = _listOfMaps(weather['alerts']);
      _fromCache = weather['fromCache'] == true;
      _cacheTime =
          weather['cacheTime'] == null ? null : '${weather['cacheTime']}';
      _todoRecords = _listOfMaps(results[1]);
      final dashboardExtras = results[2] as Map<String, dynamic>;
      _upcomingPolicyDeadline =
          dashboardExtras['policy'] as Map<String, dynamic>?;
      _platformStats = dashboardExtras['stats'] as Map<String, dynamic>?;
      _prices = (results[3] as List).whereType<Map<String, dynamic>>().toList();
      _subsidy = results[4] as Map<String, dynamic>?;
      _loading = false;
    });
  }

  Future<Map<String, dynamic>> _loadWeatherSnapshot() async {
    try {
      final data = await ApiClient.get('/agri/weather') as Map<String, dynamic>;
      final days = _listOfMaps(data['days']);
      final alerts = _listOfMaps(data['alerts']);
      await OfflineCache.saveList(_cacheKey, [
        {'days': days, 'alerts': alerts}
      ]);
      return {
        'days': days,
        'alerts': alerts,
        'fromCache': false,
        'cacheTime': null
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

  Future<List<Map<String, dynamic>>> _loadTodoRecords() async {
    try {
      final data = await ApiClient.get('/agri/record/list',
          query: {'pageNum': 1, 'pageSize': 50});
      final records = _recordsOf(data);
      final today = _dateOnly(DateTime.now());
      final lastDay = today.add(const Duration(days: 7));
      final todos = records.where((record) {
        final date = _recordDateOf(record);
        if (date == null || date.isBefore(today) || date.isAfter(lastDay)) {
          return false;
        }
        return _isTodoType(_text(record['recordType']));
      }).toList();
      todos.sort((a, b) => _recordDateOf(a)!.compareTo(_recordDateOf(b)!));
      return todos;
    } catch (_) {
      return const [];
    }
  }

  Future<Map<String, dynamic>> _loadDashboardExtras() async {
    try {
      final data = await ApiClient.get('/data/dashboard');
      if (data is! Map) return {'policy': null, 'stats': null};
      final policy = data['upcomingPolicyDeadline'];
      final stats = data['platformStats'];
      return {
        'policy': policy is Map ? _mapOf(policy) : null,
        'stats': stats is Map ? _mapOf(stats) : null,
      };
    } catch (_) {
      return {'policy': null, 'stats': null};
    }
  }

  Future<List<Map<String, dynamic>>> _loadPrices() async {
    try {
      final data = await ApiClient.get('/market/price');
      final list = (data as List? ?? []).whereType<Map>().map(_mapOf).toList();
      return list.take(4).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<Map<String, dynamic>?> _loadSubsidy() async {
    try {
      final data = await ApiClient.get('/policy/list',
          query: {'pageNum': 1, 'pageSize': 10});
      final records = _recordsOf(data);
      if (records.isEmpty) return null;
      final subsidy = _firstWhere(
          records,
          (r) =>
              _text(r['category']).contains('补贴') ||
              _text(r['title']).contains('补贴'));
      return subsidy ?? records.first;
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> get _today => _days.isNotEmpty ? _days.first : const {};
  int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
  double _double(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  String _num(dynamic v) {
    final n = _double(v);
    if (n == n.roundToDouble()) return n.toStringAsFixed(0);
    return n.toStringAsFixed(2);
  }

  bool get _hasPlatformStats {
    final stats = _platformStats;
    if (stats == null) return false;
    return _double(stats['farmerCount']) > 0 ||
        _double(stats['totalAreaMu']) > 0 ||
        _double(stats['cropTypeCount']) > 0 ||
        _double(stats['aiServiceCount']) > 0 ||
        _double(stats['orderCount']) > 0;
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = context.watch<AuthState>().user?.role == 'ADMIN';
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _loading
          ? const FarmLoading(text: '正在加载首页...')
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _homeHero(),
                  Transform.translate(
                    offset: const Offset(0, -18),
                    child: Container(
                      decoration: const BoxDecoration(
                        color: AppColors.background,
                        borderRadius:
                            BorderRadius.vertical(top: Radius.circular(22)),
                      ),
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 46),
                      child: Column(
                        children: [
                          if (_fromCache) ...[
                            AlertBanner(
                                '数据更新中${_cacheTime == null ? '' : ' · 上次同步 $_cacheTime'}',
                                critical: false),
                            const SizedBox(height: 12),
                          ],
                          _decisionCard()
                              .animate(delay: 60.ms)
                              .fadeIn(duration: 340.ms)
                              .slideY(begin: 0.06),
                          if (isAdmin && _hasPlatformStats) ...[
                            const SizedBox(height: 14),
                            _platformStatsStrip()
                                .animate(delay: 90.ms)
                                .fadeIn(duration: 320.ms)
                                .slideY(begin: 0.04),
                          ],
                          const SectionTitle('核心服务'),
                          _serviceGrid(context),
                          const SizedBox(height: 22),
                          _sectionBanners(),
                          const SizedBox(height: 20),
                          _priceCard(),
                          const SizedBox(height: 16),
                          _subsidyCard(),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _homeHero() {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.heroGradient),
      padding: EdgeInsets.fromLTRB(16, top + 8, 16, 34),
      child: Column(
        children: [
          Row(
            children: [
              const FarmBrand(markSize: 34, labelColor: Colors.white),
              const Spacer(),
              ValueListenableBuilder<int>(
                valueListenable: NotificationState.unread,
                builder: (context, unread, _) => IconButton(
                  onPressed: () => context.go('/messages'),
                  tooltip: '消息通知',
                  icon: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(Icons.notifications_none,
                          color: Colors.white, size: 22),
                      if (unread > 0)
                        Positioned(
                          right: -4,
                          top: -4,
                          child: Container(
                            constraints: const BoxConstraints(
                                minWidth: 16, minHeight: 16),
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              color: FarmColors.error,
                              borderRadius: BorderRadius.circular(99),
                              border:
                                  Border.all(color: Colors.white, width: 1.5),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              unread > 99 ? '99+' : '$unread',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                height: 1,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _homeSearch(),
          const SizedBox(height: 16),
          _greetingWeather()
              .animate()
              .fadeIn(duration: 300.ms)
              .slideY(begin: 0.05),
        ],
      ),
    );
  }

  // ── 1 · 问候 + 天气条 ─────────────────────────────────
  Widget _greetingWeather() {
    final t = _today;
    final cond = '${t['condition'] ?? '晴'}';
    final low = _int(t['tempLow']);
    final high = _int(t['tempHigh']);
    final humidity = _int(t['humidity']);
    final wind = _int(t['windLevel']);
    final soil = _soilStatusOf(humidity, cond);
    final hour = DateTime.now().hour;
    final greet = hour < 11
        ? '早安'
        : hour < 14
            ? '午安'
            : hour < 18
                ? '下午好'
                : '晚上好';
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
                  '$greet，今天也要照看好田地',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _days.isEmpty
                      ? '气象数据更新中'
                      : '$low°~$high°  $cond · 湿度$humidity% · 风$wind级 · 墒情$soil',
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

  // ── 2 · 搜索条（接入全局搜索 /search，#21）──────────────
  Widget _homeSearch() {
    return GestureDetector(
      onTap: () => context.push('/search'),
      child: Container(
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.pill),
          boxShadow: const [
            BoxShadow(
              color: Color(0x26000000),
              blurRadius: 16,
              offset: Offset(0, 5),
            ),
          ],
        ),
        padding: const EdgeInsets.only(left: 16, right: 8),
        child: Row(
          children: [
            const Icon(Icons.search, color: AppColors.secondary, size: 21),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                '搜索农事、农资、政策、行情…',
                style: TextStyle(fontSize: 14, color: AppColors.outline),
              ),
            ),
            Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 18),
              alignment: Alignment.center,
              child: const Icon(Icons.qr_code_scanner_rounded,
                  color: AppColors.secondary, size: 20),
            ),
          ],
        ),
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

  String _soilStatusOf(int humidity, String cond) {
    if (cond.contains('雨') || humidity >= 85) return '偏湿';
    if (humidity < 55 && humidity > 0) return '偏旱';
    return '适宜';
  }

  // ── 3 · 今日决策卡 ───────────────────────────────────
  Widget _decisionCard() {
    final decision = _computeDecision();
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [decision.tone, AppColors.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(R.lg),
          onTap: () => context.push(decision.route),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(R.md),
                      ),
                      child: Icon(decision.icon, color: Colors.white, size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('今日最重要的事',
                              style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(decision.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  height: 1.3,
                                  fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(decision.subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 13, height: 1.45)),
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(minHeight: 48),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(R.sm),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(decision.cta,
                          style: TextStyle(
                              color: decision.tone,
                              fontSize: 14,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(width: 4),
                      Icon(Icons.chevron_right_rounded,
                          color: decision.tone, size: 20),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  _Decision _computeDecision() {
    if (_alerts.isNotEmpty) {
      final alert = _alerts.first;
      final level = _text(alert['alertLevel'], fallback: '预警');
      return _Decision(
        icon: Icons.warning_amber_rounded,
        tone: _alertTone(level),
        title:
            '【$level】${_text(alert['title'], fallback: _text(alert['content'], fallback: '请注意防范'))}',
        subtitle: _text(alert['content'], fallback: '请及时查看防护指引，做好田间应对准备。'),
        cta: '查看防护',
        route: '/disaster',
      );
    }
    final recheck = _firstWhere(
        _todoRecords, (record) => _text(record['recordType']).contains('复查'));
    if (recheck != null) {
      final days = _daysUntil(_recordDateOf(recheck)!);
      return _Decision(
        icon: Icons.fact_check_outlined,
        tone: AppColors.primary,
        title: '待复查：${_todoContentOf(recheck)}',
        subtitle: days == 0 ? '复查今天到期，请及时处理。' : '距离复查还有 $days 天，建议提前安排田间检查。',
        cta: '去复查',
        route: '/agri',
      );
    }
    final todo = _firstWhere(
        _todoRecords, (record) => !_text(record['recordType']).contains('复查'));
    if (todo != null) {
      final days = _daysUntil(_recordDateOf(todo)!);
      return _Decision(
        icon: Icons.eco_outlined,
        tone: AppColors.primary,
        title: '农事待办：${_todoContentOf(todo)}',
        subtitle: days == 0 ? '今天安排的农事，请及时查看处理。' : '$days 天后进入计划日程，可提前做好准备。',
        cta: '查看农事',
        route: '/agri',
      );
    }
    final policy = _upcomingPolicyDeadline;
    final deadline = _parseDate(policy?['validTo']);
    if (policy != null && deadline != null) {
      final days = _daysUntil(deadline);
      return _Decision(
        icon: Icons.account_balance_outlined,
        tone: AppColors.primary,
        title: '政策截止：${_text(policy['title'], fallback: '惠农政策申报')}',
        subtitle: days == 0 ? '申报今天截止，请及时查看办理。' : '距离申报截止还有 $days 天，请及时确认办理材料。',
        cta: '去办理',
        route: '/policy/service',
      );
    }
    final condition = _text(_today['condition'], fallback: '晴');
    return _Decision(
      icon: Icons.wb_sunny_outlined,
      tone: AppColors.primary,
      title: '今日天气$condition，适宜农事',
      subtitle: '今天没有紧急事项，可查看农情数据安排接下来的工作。',
      cta: '看农情',
      route: '/data',
    );
  }

  // ── 3.5 · 平台服务规模徽章带 ───────────────────────────
  Widget _platformStatsStrip() {
    final stats = _platformStats ?? const <String, dynamic>{};
    final items = [
      (
        icon: Icons.groups_2_outlined,
        label: '服务农户',
        value: '${_int(stats['farmerCount'])}',
        unit: '户',
        color: AppColors.primary,
      ),
      (
        icon: Icons.landscape_outlined,
        label: '覆盖耕地',
        value: _num(stats['totalAreaMu']),
        unit: '亩',
        color: AppColors.goldContainer,
      ),
      (
        icon: Icons.grass_outlined,
        label: '服务作物',
        value: '${_int(stats['cropTypeCount'])}',
        unit: '类',
        color: AppColors.primary,
      ),
      (
        icon: Icons.biotech_outlined,
        label: 'AI 诊断',
        value: '${_int(stats['aiServiceCount'])}',
        unit: '条',
        color: AppColors.goldContainer,
      ),
      (
        icon: Icons.shopping_bag_outlined,
        label: '累计交易',
        value: '${_int(stats['orderCount'])}',
        unit: '单',
        color: AppColors.primary,
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 10.0;
        final visibleBadgeWidth = (constraints.maxWidth - gap * 2) / 3;
        final badgeWidth = visibleBadgeWidth.clamp(108.0, 128.0);
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                _platformStatBadge(
                  icon: items[i].icon,
                  label: items[i].label,
                  value: items[i].value,
                  unit: items[i].unit,
                  color: items[i].color,
                  width: badgeWidth,
                ),
                if (i != items.length - 1) const SizedBox(width: gap),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _platformStatBadge({
    required IconData icon,
    required String label,
    required String value,
    required String unit,
    required Color color,
    required double width,
  }) {
    return Container(
      key: ValueKey('platform_stat_badge_$label'),
      width: width,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const Spacer(),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: value,
                    style: TextStyle(
                      color: color,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  TextSpan(
                    text: unit,
                    style: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  // ── 4 · 核心服务宫格 ─────────────────────────────────
  Widget _serviceGrid(BuildContext context) {
    final role = context.read<AuthState>().user?.role;
    final sections = [
      const {
        'key': 'agri',
        'label': 'AI 植保',
        'icon': Icons.biotech_outlined,
        'color': Color(0xFF0D631B),
      },
      const {
        'key': 'market',
        'label': '农产品交易',
        'icon': Icons.storefront_outlined,
        'color': Color(0xFF926500),
      },
      const {
        'key': 'machinery',
        'label': '农机服务',
        'icon': Icons.agriculture_outlined,
        'color': Color(0xFF2E6E66),
      },
      const {
        'key': 'disaster',
        'label': '防灾救助',
        'icon': Icons.report_outlined,
        'color': Color(0xFFBA1A1A),
      },
      const {
        'key': 'policy',
        'label': '惠农政策',
        'icon': Icons.account_balance_outlined,
        'color': Color(0xFF2E7D32),
      },
      if (_roleCanVillage(role))
        const {
          'key': 'village',
          'label': '村级经营',
          'icon': Icons.foundation_rounded,
          'color': Color(0xFF2E6E66),
        }
      else
        const {
          'key': 'data',
          'label': '农情看板',
          'icon': Icons.insights_outlined,
          'color': Color(0xFF40493D),
        },
    ];
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: sections.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          mainAxisSpacing: 4,
          crossAxisSpacing: 4,
          childAspectRatio: 0.92,
        ),
        itemBuilder: (context, index) {
          final item = sections[index];
          final color = item['color'] as Color;
          return InkWell(
            onTap: () => _openSection(context, item['key'] as String),
            borderRadius: BorderRadius.circular(R.md),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(item['icon'] as IconData, color: color, size: 34),
                const SizedBox(height: 8),
                Text(
                  item['label'] as String,
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                    height: 1.2,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── 5 · 板块大图 Banner ──────────────────────────────
  Widget _sectionBanners() {
    return Column(
      children: [
        _bannerCard(
          image: 'assets/images/generated/smart-farming.jpg',
          icon: Icons.eco,
          title: '智慧种植',
          subtitle: '病虫害识别 · 农事建档 · 专家在线',
          route: '/agri',
        ),
        const SizedBox(height: 12),
        _bannerCard(
          image: 'assets/images/generated/farm-market.jpg',
          icon: Icons.storefront,
          title: '乡村集市',
          subtitle: '产地直发 · 溯源好物 · 一键下单',
          route: '/market',
        ),
        const SizedBox(height: 12),
        _bannerCard(
          image: 'assets/images/generated/machinery-sharing.jpg',
          icon: Icons.agriculture,
          title: '农机共享',
          subtitle: '就近租用 · 真实预约 · 机主直联',
          route: '/machinery',
        ),
      ],
    );
  }

  Widget _bannerCard({
    required String image,
    required IconData icon,
    required String title,
    required String subtitle,
    required String route,
  }) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: Container(
        height: 116,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(R.md),
          boxShadow: AppColors.ambientShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            SiteImage(
              image,
              fit: BoxFit.cover,
              errorFallback: Container(color: AppColors.primaryContainer),
            ),
            // 仅为文字可读的黑色压暗层（非装饰渐变）
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [Color(0xB3000000), Color(0x1A000000)],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(icon, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Text(title,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w800)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(subtitle,
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12.5, height: 1.3)),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: 100.ms).fadeIn(duration: 360.ms).slideY(begin: 0.08);
  }

  // ── 6 · 周边行情速览 ─────────────────────────────────
  Widget _priceCard() {
    return AppCard(
      onTap: () => context.push('/market'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Text('周边行情速览',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              Spacer(),
              Text('更多',
                  style: TextStyle(fontSize: 13, color: AppColors.outline)),
              Icon(Icons.chevron_right_rounded,
                  size: 18, color: AppColors.outline),
            ],
          ),
          const SizedBox(height: 6),
          if (_prices.isEmpty)
            const FarmEmpty('行情数据更新中',
                icon: Icons.trending_up_rounded, compact: true)
          else
            for (final p in _prices) _priceRow(p),
        ],
      ),
    );
  }

  Widget _priceRow(Map<String, dynamic> p) {
    final name = _text(p['productName'], fallback: '农产品');
    final unit = _text(p['unit'], fallback: '元/公斤');
    final price = (p['price'] as num?)?.toDouble() ?? 0;
    final market = _text(p['marketName']);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
                color: AppColors.primaryContainer, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              market.isEmpty ? name : '$name · $market',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, color: AppColors.onSurface),
            ),
          ),
          Text('￥${price.toStringAsFixed(2)}',
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary)),
          Text(' / $unit',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }

  // ── 7 · 惠农补贴卡（AI/Premium 金描边卡）────────────────
  Widget _subsidyCard() {
    final s = _subsidy;
    final title =
        s == null ? '惠农补贴 · 持续更新' : _text(s['title'], fallback: '惠农补贴申报');
    final summary = s == null
        ? '查看你可申领的补贴与惠农政策'
        : _text(s['summary'],
            fallback: _text(s['publishOrg'], fallback: '点击查看申报条件与办理材料'));
    return AppCard(
      ai: true,
      onTap: () => context.push('/policy/service'),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(R.md),
            ),
            child: const Icon(Icons.workspace_premium_outlined,
                color: AppColors.goldContainer, size: 26),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('符合你的补贴',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.goldContainer)),
                const SizedBox(height: 3),
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface)),
                const SizedBox(height: 2),
                Text(summary,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.onSurfaceVariant)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.goldContainer,
              borderRadius: BorderRadius.circular(R.sm),
            ),
            child: const Text('去申领',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
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
        // G8：首页「AI 智能助手」直接进对话页，而非空的会话列表
        context.push('/ai/chat/new');
      case 'life':
        context.push('/life');
      case 'data':
        context.push('/data');
      case 'iot':
        context.push('/iot');
      case 'disaster':
        context.push('/disaster');
      case 'village':
        context.push('/screen');
      default:
        toast(context, '该服务暂时不可用，请稍后重试');
    }
  }

  /// 角色可见性：村级经营仅对村委干部（VILLAGE）与管理员（ADMIN）开放。
  static bool _roleCanVillage(String? role) =>
      role == 'VILLAGE' || role == 'ADMIN';

  // ── 数据工具 ─────────────────────────────────────────
  static List<Map<String, dynamic>> _recordsOf(dynamic data) {
    if (data is Map) return _listOfMaps(data['records']);
    return const [];
  }

  static List<Map<String, dynamic>> _listOfMaps(dynamic value) {
    if (value is List) return value.whereType<Map>().map(_mapOf).toList();
    return const [];
  }

  static Map<String, dynamic> _mapOf(Map value) =>
      value.map((key, value) => MapEntry('$key', value));

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static T? _firstWhere<T>(Iterable<T> values, bool Function(T) test) {
    for (final value in values) {
      if (test(value)) return value;
    }
    return null;
  }

  static DateTime _dateOnly(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  static DateTime? _parseDate(dynamic value) {
    final parsed = DateTime.tryParse(_text(value));
    return parsed == null ? null : _dateOnly(parsed.toLocal());
  }

  static DateTime? _recordDateOf(Map<String, dynamic> record) =>
      _parseDate(record['recordDate']);

  static bool _isTodoType(String type) {
    const keywords = ['复查', '打药', '施肥', '灌溉', '采收', '收获', '播种', '巡田'];
    return keywords.any(type.contains);
  }

  static int _daysUntil(DateTime date) =>
      _dateOnly(date).difference(_dateOnly(DateTime.now())).inDays;

  static String _todoContentOf(Map<String, dynamic> record) =>
      _text(record['content'],
          fallback: _text(record['recordType'], fallback: '农事安排'));

  static Color _alertTone(String level) =>
      level.contains('红') ? AppColors.error : AppColors.warning;
}

class _Decision {
  final IconData icon;
  final Color tone;
  final String title;
  final String subtitle;
  final String cta;
  final String route;

  const _Decision({
    required this.icon,
    required this.tone,
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.route,
  });
}
