import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';

class VillageScreenPage extends StatefulWidget {
  const VillageScreenPage({super.key});

  @override
  State<VillageScreenPage> createState() => _VillageScreenPageState();
}

class _VillageScreenPageState extends State<VillageScreenPage> {
  Timer? _pollTimer;
  Timer? _clockTimer;
  Map<String, dynamic> _dashboard = {};
  DateTime _now = DateTime.now();
  DateTime? _lastUpdated;
  bool _loading = true;

  static const _bg = Color(0xFF0B1F12);
  static const _panel = Color(0xFF12301C);
  static const _panelHigh = Color(0xFF183A23);
  static const _leaf = Color(0xFF88D982);
  static const _gold = Color(0xFFFFBA38);
  static const _muted = Color(0xFFB8CDB2);
  static const _line = Color(0x335AD36F);

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/data/dashboard');
      if (!mounted) return;
      setState(() {
        _dashboard = _map(data);
        _lastUpdated = DateTime.now();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: _leaf))
            : Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _topBar(context),
                    const SizedBox(height: 16),
                    Expanded(child: _grid()),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _topBar(BuildContext context) {
    final user = context.read<AuthState>().user;
    final villageName = _text(user?.villageName, fallback: '示范村');
    final clock = DateFormat('yyyy-MM-dd HH:mm:ss').format(_now);
    return Container(
      height: 78,
      padding: const EdgeInsets.symmetric(horizontal: 22),
      decoration: BoxDecoration(
        color: _panel,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _line),
        boxShadow: const [
          BoxShadow(
            color: Color(0x66000000),
            blurRadius: 22,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: _leaf.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.agriculture, color: _leaf, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$villageName · 数字乡村驾驶舱',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _lastUpdated == null
                      ? '等待数据更新'
                      : '数据已更新 ${DateFormat('HH:mm:ss').format(_lastUpdated!)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _muted, fontSize: 12),
                ),
              ],
            ),
          ),
          Flexible(
            flex: 0,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerRight,
              child: Row(
                children: [
                  Text(
                    clock,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _gold,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () => context.go('/data'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _muted,
                      side: const BorderSide(color: _line),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    icon: const Icon(Icons.close, size: 18),
                    label: const Text('退出'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _grid() {
    final cards = _map(_dashboard['cards']);
    final stats = [
      _ScreenStat(
        icon: Icons.landscape_outlined,
        label: '地块面积',
        value: '${_num(cards['totalAreaMu'])} 亩',
        hint: '${_int(cards['plotCount'])} 块地',
      ),
      _ScreenStat(
        icon: Icons.fact_check_outlined,
        label: '农事记录',
        value: '${_int(cards['recordCount'])} 条',
        hint: '全年农事档案',
      ),
      _ScreenStat(
        icon: Icons.smart_toy_outlined,
        label: 'AI 服务调用',
        value: '${_int(cards['aiCallCount'])} 次',
        hint: '问答与识别',
      ),
      _ScreenStat(
        icon: Icons.warning_amber_rounded,
        label: '灾情预警',
        value: '${_int(cards['disasterCount'])} 起',
        hint: '累计损失 ￥${_num(cards['disasterLoss'])}',
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 900;
        final statColumns = isWide ? 4 : 2;
        final panelColumns = constraints.maxWidth > 680 ? 2 : 1;
        final statRows = (stats.length / statColumns).ceil();
        final statHeight = statRows * 118.0 + (statRows - 1) * 12.0;
        return Column(
          children: [
            SizedBox(
              height: statHeight,
              child: GridView.count(
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: statColumns,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: isWide ? 2.15 : 2.0,
                children: [
                  for (final stat in stats) _bigStatCard(stat),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Expanded(
              child: GridView.count(
                crossAxisCount: panelColumns,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: isWide ? 1.78 : 1.42,
                children: [
                  _panelCard(
                    title: '种植结构',
                    icon: Icons.bar_chart_rounded,
                    child: _cropPanel(),
                  ),
                  _panelCard(
                    title: '灾情滚动列表',
                    icon: Icons.crisis_alert_rounded,
                    child: _disasterPanel(),
                  ),
                  _panelCard(
                    title: '集市成交',
                    icon: Icons.storefront_outlined,
                    child: _marketPanel(cards),
                  ),
                  _panelCard(
                    title: 'AI 服务在线状态',
                    icon: Icons.online_prediction_rounded,
                    child: _aiStatusPanel(cards),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _bigStatCard(_ScreenStat stat) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _panel,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _line),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _gold.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(stat.icon, color: _gold, size: 24),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stat.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: _gold,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 5),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 260),
                  child: Text(
                    stat.value,
                    key: ValueKey(stat.value),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _leaf,
                      fontSize: 27,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  stat.hint,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _muted, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _panelCard({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _panel,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: _gold, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _cropPanel() {
    final items = _list(_dashboard['cropArea']);
    if (items.isEmpty) return _emptyText('暂无种植结构数据');
    final maxArea = items
        .map((item) => _double(item['areaMu']))
        .fold<double>(0, (max, value) => value > max ? value : max);
    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        for (final item in items.take(6))
          _barRow(
            label: _text(item['cropType'], fallback: '未填写'),
            value: '${_num(item['areaMu'])} 亩',
            ratio: maxArea == 0 ? 0 : _double(item['areaMu']) / maxArea,
            color: _cropColor(_text(item['cropType'])),
          ),
      ],
    );
  }

  Widget _disasterPanel() {
    final disasters = _list(_dashboard['disasterStats']);
    if (disasters.isEmpty) return _emptyText('暂无灾情预警');
    return ListView.separated(
      physics: const BouncingScrollPhysics(),
      itemCount: disasters.take(8).length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = disasters[index];
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: _panelHigh,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _line),
          ),
          child: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: _gold, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${_text(item['type'], fallback: '灾情')} · ${_int(item['count'])} 起',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                '￥${_num(item['loss'])}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: _leaf,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _marketPanel(Map<String, dynamic> cards) {
    final productCount = _int(cards['productCount']);
    final orderCount = _int(cards['orderCount']);
    final orderAmount = _double(cards['orderAmount']);
    final userCount = _int(cards['userCount']);
    final maxValue = [
      productCount.toDouble(),
      orderCount.toDouble(),
      userCount.toDouble(),
      1.0,
    ].fold<double>(1, (max, value) => value > max ? value : max);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '￥${_num(orderAmount)}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: _gold,
            fontSize: 34,
            fontWeight: FontWeight.w900,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          '集市累计成交额',
          style: TextStyle(color: _muted, fontSize: 12),
        ),
        const SizedBox(height: 14),
        _thinBar('商品', productCount, maxValue, _leaf),
        _thinBar('订单', orderCount, maxValue, _gold),
        _thinBar('用户', userCount, maxValue, const Color(0xFF4FB8FF)),
      ],
    );
  }

  Widget _aiStatusPanel(Map<String, dynamic> cards) {
    final service = _map(_dashboard['serviceStatus']);
    final logs = _list(_dashboard['latestSyncLogs']);
    final mode = _text(service['mode'], fallback: '运行中');
    final message = _text(service['message'], fallback: '数据已更新');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                color: _leaf,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: _leaf, blurRadius: 10),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '模型$mode · 问答 ${_int(cards['aiCallCount'])} 次',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          '${_text(service['dataSource'], fallback: '平台业务数据')} · $message',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: _muted, fontSize: 12),
        ),
        const SizedBox(height: 14),
        Expanded(
          child: logs.isEmpty
              ? _emptyText('暂无同步日志')
              : ListView.separated(
                  physics: const BouncingScrollPhysics(),
                  itemCount: logs.take(5).length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = logs[index];
                    final status =
                        _text(item['syncStatus'], fallback: 'SUCCESS');
                    return Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: _syncColor(status),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _tableLabel(_text(item['tableName'])),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _date(item['syncedAt']),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: _muted, fontSize: 12),
                        ),
                      ],
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _barRow({
    required String label,
    required String value,
    required double ratio,
    required Color color,
  }) {
    final safeRatio = ratio.clamp(0.04, 1.0).toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: _muted, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: safeRatio,
              minHeight: 11,
              backgroundColor: const Color(0xFF0D2615),
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _thinBar(String label, int value, double maxValue, Color color) {
    final ratio = maxValue == 0 ? 0.0 : value / maxValue;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: _muted, fontSize: 12),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: ratio.clamp(0.04, 1.0).toDouble(),
                minHeight: 10,
                backgroundColor: const Color(0xFF0D2615),
                color: color,
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 52,
            child: Text(
              '$value',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyText(String text) {
    return Center(
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(color: _muted, fontSize: 14),
      ),
    );
  }

  Color _cropColor(String crop) {
    if (crop.contains('水稻') || crop.contains('玉米')) return _leaf;
    if (crop.contains('小麦') || crop.contains('油菜')) return _gold;
    if (crop.contains('茶') || crop.contains('柑橘')) {
      return const Color(0xFF4FB8FF);
    }
    return const Color(0xFFA4E060);
  }

  String _tableLabel(String tableName) {
    if (tableName == 'farm_record') return '农事记录';
    if (tableName == 'disaster_report') return '灾情上报';
    if (tableName == 'land_plot') return '地块管理';
    if (tableName == 'env_report') return '环境举报';
    return tableName.isEmpty ? '业务数据' : tableName;
  }

  Color _syncColor(String status) {
    if (status == 'CONFLICT') return _gold;
    if (status == 'FAILED') return const Color(0xFFFF6B6B);
    return _leaf;
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map) {
      return value.map((key, value) => MapEntry('$key', value));
    }
    return {};
  }

  static List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map(_map).toList();
    }
    return [];
  }

  static int _int(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  static double _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse('$value') ?? 0;
  }

  static String _num(dynamic value) {
    final n = _double(value);
    if (n == n.roundToDouble()) return _formatNumber(n);
    return _formatNumber(n, decimals: 2);
  }

  static String _formatNumber(num value, {int decimals = 0}) {
    final fraction = List.filled(decimals, '0').join();
    final pattern = decimals == 0 ? '#,##0' : '#,##0.$fraction';
    return NumberFormat(pattern).format(value);
  }

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _date(dynamic value) {
    final raw = _text(value);
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw.isEmpty ? '-' : raw;
    return DateFormat('MM-dd HH:mm').format(parsed.toLocal());
  }
}

class _ScreenStat {
  final IconData icon;
  final String label;
  final String value;
  final String hint;

  const _ScreenStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.hint,
  });
}
