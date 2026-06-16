import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';
import '../../widgets/section_tool_chips.dart';

class DataDashboardPage extends StatefulWidget {
  const DataDashboardPage({super.key});

  @override
  State<DataDashboardPage> createState() => _DataDashboardPageState();
}

class _DataDashboardPageState extends State<DataDashboardPage> {
  bool _loading = true;
  bool _syncing = false;
  String? _error;
  Map<String, dynamic> _dashboard = {};
  Map<String, dynamic> _syncStatus = {};
  Map<String, dynamic> _aiStatus = {};
  Map<String, dynamic> _remoteSensing = {};
  List<SyncQueueItem> _localQueue = [];

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
      final results = await Future.wait<dynamic>([
        ApiClient.get('/data/dashboard'),
        ApiClient.get('/data/sync/status'),
        ApiClient.get('/ai/status'),
        ApiClient.get('/data/remote-sensing'),
        OfflineSyncQueue.all(),
      ]);
      if (!mounted) return;
      setState(() {
        _dashboard = _map(results[0]);
        _syncStatus = _map(results[1]);
        _aiStatus = _map(results[2]);
        _remoteSensing = _map(results[3]);
        _localQueue = (results[4] as List<SyncQueueItem>);
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

  Future<void> _flushQueue() async {
    if (_syncing) return;
    setState(() => _syncing = true);
    try {
      final result = await OfflineSyncQueue.flush();
      if (!mounted) return;
      toast(
        context,
        result.total == 0
            ? '待发送队列暂无待处理数据'
            : '已处理 ${result.total} 条，成功 ${result.success} 条',
      );
      await _load();
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('同步', e), error: true);
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // 平台级聚合（全平台用户/商品/订单/成交额、AI 服务状态）仅管理员/村委可见，
    // 普通农户只看自己的农情（后端已按 userId 行级过滤）
    final role = context.watch<AuthState>().user?.role ?? 'FARMER';
    final isAdminOrVillage = role == 'ADMIN' || role == 'VILLAGE';
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(
        title: '数据看板',
        showBack: true,
        actions: [
          IconButton(
            tooltip: '驾驶舱视图',
            onPressed: () => context.go('/screen'),
            icon:
                const Icon(Icons.fullscreen, color: AppColors.onSurfaceVariant),
          ),
          IconButton(
            tooltip: '数据管理服务',
            onPressed: () => context.push('/data/service'),
            icon: const Icon(Icons.tune, color: AppColors.onSurfaceVariant),
          ),
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
      body: _loading
          ? const Loading(text: '正在汇总数据')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.primary,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                    children: [
                      const SectionToolChips(section: 'data'),
                      const SizedBox(height: 8),
                      _heroCard(),
                      const SizedBox(height: 16),
                      _iotEntryCard(),
                      const SizedBox(height: 16),
                      if (isAdminOrVillage) ...[
                        _metricGrid(),
                        const SizedBox(height: 16),
                      ],
                      _syncCard(),
                      if (isAdminOrVillage) ...[
                        const SizedBox(height: 16),
                        _aiCard(),
                      ],
                      const SectionTitle('种植结构'),
                      _cropAreaCard(),
                      const SectionTitle('农事与灾情'),
                      _recordAndDisasterCards(),
                      const SectionTitle('遥感诊断'),
                      _remoteCard(),
                      const SectionTitle('最近数据'),
                      _latestDataCard(),
                    ],
                  ),
                ),
    );
  }

  Widget _iotEntryCard() => AppCard(
        onTap: () => context.push('/iot'),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(R.md),
              ),
              child: const Icon(Icons.sensors_rounded,
                  color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '智慧物联',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    '设备监测、状态巡检与趋势读数',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppColors.outline),
          ],
        ),
      );

  Widget _heroCard() {
    final cards = _map(_dashboard['cards']);
    final service = _map(_dashboard['serviceStatus']);
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: const Icon(Icons.insights_rounded,
                    color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '农情数据看板',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '地块、农事、流通、灾情与 AI 服务统一汇总',
                      style: TextStyle(
                        color: AppColors.onPrimaryContainer,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                  child: _heroStat('地块面积', '${_num(cards['totalAreaMu'])} 亩')),
              const SizedBox(width: 10),
              Expanded(
                  child: _heroStat('农事记录', '${_int(cards['recordCount'])} 条')),
              const SizedBox(width: 10),
              Expanded(
                  child: _heroStat('AI 调用', '${_int(cards['aiCallCount'])} 次')),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.storage_rounded,
                  color: AppColors.onPrimaryContainer, size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  _text(service['message'], fallback: '数据已更新'),
                  style: const TextStyle(
                    color: AppColors.onPrimaryContainer,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroStat(String label, String value) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.onPrimaryContainer, fontSize: 11)),
            const SizedBox(height: 2),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700)),
          ],
        ),
      );

  Widget _metricGrid() {
    final cards = _map(_dashboard['cards']);
    final metrics = [
      (
        Icons.people_alt_outlined,
        '用户',
        '${_int(cards['userCount'])}',
        AppColors.primary
      ),
      (
        Icons.map_outlined,
        '地块',
        '${_int(cards['plotCount'])}',
        AppColors.secondary
      ),
      (
        Icons.storefront_outlined,
        '商品',
        '${_int(cards['productCount'])}',
        AppColors.goldContainer
      ),
      (
        Icons.shopping_bag_outlined,
        '订单',
        '${_int(cards['orderCount'])}',
        AppColors.primaryContainer
      ),
      (
        Icons.payments_outlined,
        '成交额',
        '￥${_num(cards['orderAmount'])}',
        AppColors.tertiary
      ),
      (
        Icons.warning_amber_rounded,
        '灾情',
        '${_int(cards['disasterCount'])}',
        AppColors.error
      ),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: metrics.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.72,
      ),
      itemBuilder: (context, index) {
        final item = metrics[index];
        return AppCard(
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: item.$4.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(item.$1, color: item.$4),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.$2,
                        style: const TextStyle(
                            color: AppColors.onSurfaceVariant, fontSize: 12)),
                    const SizedBox(height: 3),
                    Text(
                      item.$3,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _syncCard() {
    final total = _int(_syncStatus['total']);
    final success = _int(_syncStatus['success']);
    final conflict = _int(_syncStatus['conflict']);
    final failed = _int(_syncStatus['failed']);
    final waiting =
        _localQueue.where((item) => item.status != SyncStatus.synced).length;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sync_alt_rounded, color: AppColors.primary),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  '数据同步状态',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
              FilledButton.tonalIcon(
                onPressed: _syncing ? null : _flushQueue,
                icon: _syncing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh, size: 18),
                label: Text(_syncing ? '同步中' : '同步'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _smallStat('待发送', '$waiting'),
              _thinDivider(),
              _smallStat('同步日志', '$total'),
              _thinDivider(),
              _smallStat('成功', '$success'),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              StatusChip('冲突 $conflict', color: AppColors.warning),
              const SizedBox(width: 8),
              StatusChip('失败 $failed',
                  color: failed > 0 ? AppColors.error : AppColors.primary),
            ],
          ),
        ],
      ),
    );
  }

  Widget _aiCard() {
    final ollama = _map(_aiStatus['ollama']);
    final counters = _map(_aiStatus['counters']);
    final online = ollama['online'] == true;
    return AppCard(
      ai: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: const Icon(Icons.smart_toy_outlined,
                    color: AppColors.tertiary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'AI 服务',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Text(
                      online ? '智能模型在线' : '服务运行中',
                      style: const TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              StatusChip(online ? '在线' : '运行中',
                  color: online ? AppColors.primary : AppColors.goldContainer),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _pill('问答 ${_int(counters['qaCount'])}'),
              _pill('图像 ${_int(counters['detectCount'])}'),
              _pill('政策切片 ${_int(counters['policyChunks'])}'),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '主模型：${_text(ollama['primaryModel'], fallback: 'qwen2.5')}',
            style: const TextStyle(
              color: AppColors.onSurfaceVariant,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _cropAreaCard() {
    final items = _list(_dashboard['cropArea']);
    if (items.isEmpty) {
      return const AppCard(
        child: Text('暂无地块面积数据',
            style: TextStyle(color: AppColors.onSurfaceVariant)),
      );
    }
    final cropRows = [
      for (final item in items)
        (
          crop: _text(item['cropType'], fallback: '未填写'),
          area: math.max(0.0, _double(item['areaMu'])),
        ),
    ];
    final displayRows = cropRows.length > 6
        ? [
            ...cropRows.take(5),
            (
              crop: '其他',
              area: cropRows
                  .skip(5)
                  .fold<double>(0.0, (total, item) => total + item.area),
            ),
          ]
        : cropRows;
    final totalArea =
        cropRows.fold<double>(0.0, (total, item) => total + item.area);
    final slices = [
      for (final item in displayRows)
        (
          value: item.area,
          color: _cropColor(item.crop),
        ),
    ];

    Widget legendRow(({String crop, double area}) item) {
      final pct = totalArea == 0 ? 0 : (item.area / totalArea * 100).round();
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: _cropColor(item.crop),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                item.crop,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              '${_num(item.area)}亩 · $pct%',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
          ],
        ),
      );
    }

    return AppCard(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 360;
          final chartSize = math.min(compact ? 128.0 : 136.0,
              constraints.maxWidth.isFinite ? constraints.maxWidth : 136.0);
          final chart = SizedBox(
            width: chartSize,
            height: chartSize,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: Size.square(chartSize),
                  painter: _DonutPainter(slices: slices, strokeWidth: 18),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _num(totalArea),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.primaryContainer,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Text(
                      '亩',
                      style: TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                        height: 1.1,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
          final legend = Column(
            mainAxisSize: MainAxisSize.min,
            children: [for (final item in displayRows) legendRow(item)],
          );
          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(child: chart),
                const SizedBox(height: 16),
                legend,
              ],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              chart,
              const SizedBox(width: 18),
              Expanded(child: legend),
            ],
          );
        },
      ),
    );
  }

  Widget _recordAndDisasterCards() {
    final records = _list(_dashboard['farmRecordTypes']);
    final disasters = _list(_dashboard['disasterStats']);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('农事类型',
                    style:
                        TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 12),
                if (records.isEmpty)
                  const Text('暂无记录',
                      style: TextStyle(color: AppColors.onSurfaceVariant))
                else
                  for (final item in records.take(4))
                    _compactLine(
                        _text(item['type']), '${_int(item['count'])} 次'),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('灾情统计',
                    style:
                        TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 12),
                if (disasters.isEmpty)
                  const Text('暂无灾情',
                      style: TextStyle(color: AppColors.onSurfaceVariant))
                else
                  for (final item in disasters.take(4))
                    _compactLine(
                      _text(item['type']),
                      '￥${_num(item['loss'])}',
                      color: AppColors.error,
                    ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _remoteCard() {
    final records = _list(_remoteSensing['records']);
    final avg = _num(_remoteSensing['avgNdvi']);
    final abnormal = _int(_remoteSensing['abnormalCount']);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _smallStat('平均 NDVI', avg),
              _thinDivider(),
              _smallStat('地块', '${_int(_remoteSensing['totalPlots'])}'),
              _thinDivider(),
              _smallStat('异常', '$abnormal'),
            ],
          ),
          const SizedBox(height: 12),
          if (records.isEmpty)
            const Text('暂无遥感诊断数据',
                style: TextStyle(color: AppColors.onSurfaceVariant))
          else
            for (final item in records.take(3)) _remoteTile(item),
        ],
      ),
    );
  }

  Widget _latestDataCard() {
    final reports = _list(_dashboard['latestStatReports']);
    final logs = _list(_dashboard['latestSyncLogs']);
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _latestHeader('统计上报', Icons.assignment_turned_in_outlined),
          if (reports.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('暂无统计上报',
                    style: TextStyle(color: AppColors.onSurfaceVariant)),
              ),
            )
          else
            for (final item in reports.take(3)) _reportTile(item),
          const Divider(height: 1),
          _latestHeader('同步日志', Icons.history_rounded),
          if (logs.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('暂无同步日志',
                    style: TextStyle(color: AppColors.onSurfaceVariant)),
              ),
            )
          else
            for (final item in logs.take(4)) _syncLogTile(item),
        ],
      ),
    );
  }

  Widget _latestHeader(String title, IconData icon) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(title,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
      );

  Widget _reportTile(Map<String, dynamic> item) {
    final data = _map(item['dataJson']);
    final crop = _text(item['cropType'],
        fallback: _text(data['cropType'], fallback: '综合'));
    final area = item.containsKey('areaMu') ? item['areaMu'] : data['areaMu'];
    final yield =
        item.containsKey('yieldKg') ? item['yieldKg'] : data['yieldKg'];
    return ListTile(
      dense: true,
      visualDensity: VisualDensity.compact,
      title: Text(
        '${_text(item['statType'], fallback: '统计数据')} · $crop',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${_num(area)} 亩 / ${_num(yield)} 公斤 · ${_statusLabel(_text(item['status']))}',
      ),
      trailing: Text(_date(item['createdAt']),
          style: const TextStyle(color: AppColors.outline, fontSize: 11)),
    );
  }

  Widget _syncLogTile(Map<String, dynamic> item) {
    final status = _text(item['syncStatus'], fallback: 'SUCCESS');
    return ListTile(
      dense: true,
      visualDensity: VisualDensity.compact,
      title: Text(_tableLabel(_text(item['tableName'])),
          maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(_date(item['syncedAt'])),
      trailing: StatusChip(_syncLabel(status), color: _syncColor(status)),
    );
  }

  Widget _remoteTile(Map<String, dynamic> item) {
    final level = _text(item['healthLevel']);
    final color = level == '异常'
        ? AppColors.error
        : level == '偏弱'
            ? AppColors.warning
            : AppColors.primary;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Row(
        children: [
          Icon(Icons.satellite_alt_outlined, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _text(item['plotName'], fallback: '地块'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text('NDVI ${_num(item['ndvi'])} · ${_text(item['cropType'])}',
                    style: const TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 12)),
              ],
            ),
          ),
          StatusChip(level, color: color),
        ],
      ),
    );
  }

  Widget _compactLine(String label, String value,
      {Color color = AppColors.primary}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.onSurfaceVariant)),
          ),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: color, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _smallStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 12)),
          ],
        ),
      );

  Widget _thinDivider() =>
      Container(width: 1, height: 30, color: AppColors.outlineVariant);

  Widget _pill(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.onSurfaceVariant,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      );

  Color _cropColor(String crop) {
    if (crop.contains('水稻') || crop.contains('玉米')) return AppColors.primary;
    if (crop.contains('小麦') || crop.contains('油菜')) {
      return AppColors.goldContainer;
    }
    if (crop.contains('茶') || crop.contains('柑橘')) return AppColors.secondary;
    return AppColors.primaryContainer;
  }

  String _tableLabel(String tableName) {
    if (tableName == 'farm_record') return '农事记录';
    if (tableName == 'disaster_report') return '灾情上报';
    if (tableName == 'land_plot') return '地块管理';
    if (tableName == 'env_report') return '环境举报';
    return tableName.isEmpty ? '业务数据' : tableName;
  }

  String _syncLabel(String status) {
    if (status == 'SUCCESS') return '成功';
    if (status == 'CONFLICT') return '冲突';
    if (status == 'FAILED') return '失败';
    return status;
  }

  String _statusLabel(String status) {
    if (status == 'DRAFT') return '草稿';
    if (status == 'SUBMITTED') return '已上报';
    if (status == 'CONFIRMED') return '已确认';
    return status.isEmpty ? '已上报' : status;
  }

  Color _syncColor(String status) {
    if (status == 'CONFLICT') return AppColors.warning;
    if (status == 'FAILED') return AppColors.error;
    return AppColors.primary;
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
    if (n == n.roundToDouble()) return n.toStringAsFixed(0);
    return n.toStringAsFixed(2);
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

class _DonutPainter extends CustomPainter {
  const _DonutPainter({
    required this.slices,
    this.strokeWidth = 18,
  });

  final List<({double value, Color color})> slices;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final total = slices.fold<double>(
      0.0,
      (sum, slice) => sum + math.max(0.0, slice.value),
    );
    if (total <= 0) return;

    final activeCount = slices.where((slice) => slice.value > 0).length;
    final radius = (math.min(size.width, size.height) - strokeWidth) / 2;
    final rect = Rect.fromCircle(
      center: Offset(size.width / 2, size.height / 2),
      radius: radius,
    );
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    var startAngle = -math.pi / 2;
    for (final slice in slices) {
      final value = math.max(0.0, slice.value);
      if (value == 0) continue;

      final sweepAngle = value / total * math.pi * 2;
      final gap =
          activeCount > 1 ? math.min(math.pi / 90, sweepAngle / 3) : 0.0;
      paint.color = slice.color;
      canvas.drawArc(
        rect,
        startAngle + gap / 2,
        math.max(0.0, sweepAngle - gap),
        false,
        paint,
      );
      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) {
    if (oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.slices.length != slices.length) {
      return true;
    }
    for (var i = 0; i < slices.length; i++) {
      final oldSlice = oldDelegate.slices[i];
      final slice = slices[i];
      if (oldSlice.value != slice.value || oldSlice.color != slice.color) {
        return true;
      }
    }
    return false;
  }
}
