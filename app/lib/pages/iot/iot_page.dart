import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class IotPage extends StatefulWidget {
  const IotPage({super.key});

  @override
  State<IotPage> createState() => _IotPageState();
}

class _IotPageState extends State<IotPage> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _devices = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.get('/iot/devices');
      if (!mounted) return;
      setState(() {
        _devices = _list(data);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = serviceErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<Map<String, dynamic>> _loadDetail(String id) async {
    return _map(await ApiClient.get('/iot/devices/$id'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(
        showBack: true,
        backFallback: '/data',
        actions: [
          IconButton(
            tooltip: '刷新',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
      body: _loading
          ? const Loading(text: '正在加载设备数据')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                    children: [
                      _summaryCard(),
                      const SectionTitle('设备监测'),
                      if (_devices.isEmpty)
                        const AppCard(child: Text('暂无设备数据'))
                      else
                        for (final device in _devices)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _deviceCard(device),
                          ),
                    ],
                  ),
                ),
    );
  }

  Widget _summaryCard() {
    final warningCount = _devices.where((device) {
      return _list(device['metrics']).any(
        (metric) => _status(metric['status']) != 'normal',
      );
    }).length;
    final avgBattery = _devices.isEmpty
        ? 0
        : (_devices.fold<int>(
                  0,
                  (total, item) => total + _int(item['battery']),
                ) /
                _devices.length)
            .round();
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(R.md),
            ),
            child: const Icon(Icons.sensors_rounded, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '智慧物联 · 设备监测',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_devices.length} 台设备接入 · 平均电量 $avgBattery%',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          StatusChip(
            warningCount > 0 ? '关注 $warningCount' : '运行正常',
            color: warningCount > 0 ? AppColors.warning : AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _deviceCard(Map<String, dynamic> device) {
    final metrics = _list(device['metrics']);
    final first = metrics.isEmpty ? <String, dynamic>{} : metrics.first;
    final status = metrics.any((item) => _status(item['status']) == 'critical')
        ? 'critical'
        : metrics.any((item) => _status(item['status']) == 'warning')
            ? 'warning'
            : 'normal';
    final color = _statusColor(status);
    return AppCard(
      onTap: () => _showDetail(device),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(_deviceIcon(device['type']), color: color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _text(device['name'], fallback: '物联设备'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _text(device['location'], fallback: '设备点位'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.outline),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _metricBlock(first),
              const SizedBox(width: 12),
              _batteryBlock(_int(device['battery'])),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              const StatusChip('在线', color: AppColors.primary),
              for (final metric in metrics.skip(1).take(2))
                StatusChip(
                  '${_text(metric['label'])} ${_value(metric)}',
                  color: _statusColor(_status(metric['status'])),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricBlock(Map<String, dynamic> metric) {
    if (metric.isEmpty) {
      return const Expanded(
        child: Text('暂无读数', style: TextStyle(color: AppColors.outline)),
      );
    }
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _text(metric['label'], fallback: '关键读数'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _value(metric),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _batteryBlock(int battery) {
    final color = battery < 25
        ? AppColors.error
        : battery < 45
            ? AppColors.warning
            : AppColors.primary;
    return SizedBox(
      width: 98,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.battery_5_bar_rounded, color: color, size: 18),
                const SizedBox(width: 4),
                const Text(
                  '电量',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                minHeight: 6,
                value: battery.clamp(0, 100) / 100,
                backgroundColor: AppColors.outlineVariant,
                color: color,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              '$battery%',
              style: TextStyle(color: color, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetail(Map<String, dynamic> device) {
    final id = _text(device['id']);
    Navigator.of(context, rootNavigator: true).push<void>(
      MaterialPageRoute(
        builder: (pageCtx) => Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: AppColors.primary),
              onPressed: () => Navigator.of(pageCtx).pop(),
            ),
            title: const Text('设备详情',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
          ),
          body: FutureBuilder<Map<String, dynamic>>(
            future: _loadDetail(id),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Loading(text: '正在加载设备详情');
              }
              if (snapshot.hasError) {
                return ErrorRetry(
                  message: serviceErrorMessage(snapshot.error!),
                  onRetry: () {
                    Navigator.of(pageCtx).pop();
                    _showDetail(device);
                  },
                );
              }
              return _DeviceDetailSheet(device: snapshot.data ?? device);
            },
          ),
        ),
      ),
    );
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

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _status(dynamic value) {
    final status = _text(value, fallback: 'normal').toLowerCase();
    if (status == 'critical' || status == 'warning') return status;
    return 'normal';
  }

  static String _value(Map<String, dynamic> metric) {
    return '${_text(metric['value'], fallback: '-')} ${_text(metric['unit'])}'
        .trim();
  }

  static Color _statusColor(String status) {
    if (status == 'critical') return AppColors.error;
    if (status == 'warning') return AppColors.warning;
    return AppColors.primary;
  }

  static IconData _deviceIcon(dynamic type) {
    final text = _text(type);
    if (text.contains('土壤')) return Icons.grass_rounded;
    if (text.contains('空气')) return Icons.thermostat_rounded;
    if (text.contains('虫情')) return Icons.light_mode_rounded;
    if (text.contains('水位')) return Icons.water_drop_outlined;
    if (text.contains('气象') || text.contains('光照')) {
      return Icons.wb_sunny_outlined;
    }
    return Icons.sensors_rounded;
  }
}

class _DeviceDetailSheet extends StatefulWidget {
  const _DeviceDetailSheet({required this.device});

  final Map<String, dynamic> device;

  @override
  State<_DeviceDetailSheet> createState() => _DeviceDetailSheetState();
}

class _DeviceDetailSheetState extends State<_DeviceDetailSheet> {
  int _metricIndex = 0;

  @override
  Widget build(BuildContext context) {
    final metrics = _list(widget.device['metrics']);
    final series = _list(widget.device['series']);
    final selected = metrics.isEmpty
        ? <String, dynamic>{}
        : metrics[_metricIndex.clamp(0, metrics.length - 1)];
    final points = _seriesPoints(series, _text(selected['key']));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: Icon(
                    _deviceIcon(widget.device['type']),
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _text(widget.device['name'], fallback: '物联设备'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.onSurface,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        _text(widget.device['location'], fallback: '设备点位'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const StatusChip('在线', color: AppColors.primary),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < metrics.length; i++)
                  ChoiceChip(
                    label: Text(_text(metrics[i]['label'])),
                    selected: i == _metricIndex,
                    onSelected: (_) => setState(() => _metricIndex = i),
                    selectedColor: AppColors.primary.withValues(alpha: 0.14),
                    labelStyle: TextStyle(
                      color: i == _metricIndex
                          ? AppColors.primary
                          : AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                    side: BorderSide(
                      color: i == _metricIndex
                          ? AppColors.primary
                          : AppColors.outlineVariant,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(R.sm),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${_text(selected['label'], fallback: '读数')}趋势',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.onSurface,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Text(
                        _value(selected),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 142,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _TrendPainter(points: points),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                    child: _detailStat(
                        '电量', '${_int(widget.device['battery'])}%')),
                const SizedBox(width: 10),
                Expanded(
                    child:
                        _detailStat('更新时间', _date(widget.device['updatedAt']))),
              ],
            ),
        ],
      ),
    );
  }

  Widget _detailStat(String label, String value) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 12)),
            const SizedBox(height: 4),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );

  static List<double> _seriesPoints(
      List<Map<String, dynamic>> series, String key) {
    return [
      for (final item in series)
        for (final metric in _list(item['metrics']))
          if (_text(metric['key']) == key) _double(metric['value']),
    ];
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

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _value(Map<String, dynamic> metric) {
    return '${_text(metric['value'], fallback: '-')} ${_text(metric['unit'])}'
        .trim();
  }

  static String _date(dynamic value) {
    final parsed = DateTime.tryParse(_text(value));
    if (parsed == null) return '-';
    return DateFormat('MM-dd HH:mm').format(parsed.toLocal());
  }

  static IconData _deviceIcon(dynamic type) => _IotPageState._deviceIcon(type);
}

class _TrendPainter extends CustomPainter {
  const _TrendPainter({required this.points});

  final List<double> points;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppColors.outlineVariant
      ..strokeWidth = 1;
    for (var i = 0; i < 4; i++) {
      final y = size.height * i / 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    if (points.length < 2) return;
    final minValue = points.reduce(math.min);
    final maxValue = points.reduce(math.max);
    final span = math.max(0.1, maxValue - minValue);
    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final x = size.width * i / (points.length - 1);
      final y = size.height - ((points[i] - minValue) / span * size.height);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final linePaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(path, linePaint);

    final dotPaint = Paint()..color = AppColors.primaryContainer;
    for (var i = 0; i < points.length; i++) {
      final x = size.width * i / (points.length - 1);
      final y = size.height - ((points[i] - minValue) / span * size.height);
      canvas.drawCircle(Offset(x, y), 3.2, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) {
    if (oldDelegate.points.length != points.length) return true;
    for (var i = 0; i < points.length; i++) {
      if (oldDelegate.points[i] != points[i]) return true;
    }
    return false;
  }
}
