import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';

/// 数据管理 · 服务页
///
/// 覆盖数据板块除「农情看板」「遥感分析」「GIS 地块」之外的 3 个交互模块：
/// - 农事年度报告（list + 一键生成）
/// - 统计上报（summary 概览 + list + 新建表单）
/// - 数据同步（status 概览 + logs 详情）
class DataServicePage extends StatefulWidget {
  const DataServicePage({super.key});

  @override
  State<DataServicePage> createState() => _DataServicePageState();
}

class _DataServicePageState extends State<DataServicePage> {
  bool _loading = true;
  String? _error;

  List<Map<String, dynamic>> _annualReports = [];
  List<Map<String, dynamic>> _statRecords = [];
  Map<String, dynamic> _statSummary = {};
  Map<String, dynamic> _syncStatus = {};

  bool _generating = false;

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
        ApiClient.get('/data/annual-report/list',
            query: {'pageSize': '5', 'pageNum': '1'}),
        ApiClient.get('/data/statistics',
            query: {'pageSize': '6', 'pageNum': '1'}),
        ApiClient.get('/data/statistics/summary'),
        ApiClient.get('/data/sync/status'),
      ]);
      if (!mounted) return;
      final annual = _records(results[0]);
      final stat = _records(results[1]);
      setState(() {
        _annualReports = annual;
        _statRecords = stat;
        _statSummary = _map(results[2]);
        _syncStatus = _map(results[3]);
        _loading = false;
      });
      // 缓存（仅业务表，summary/status 由服务端实时返回）
      OfflineCache.saveList('data_annual_report', annual);
      OfflineCache.saveList('data_stat_report', stat);
    } catch (e) {
      if (!mounted) return;
      final annual = await OfflineCache.readList('data_annual_report');
      final stat = await OfflineCache.readList('data_stat_report');
      setState(() {
        _annualReports = annual;
        _statRecords = stat;
        _loading = false;
        _error = '$e';
      });
    }
  }

  // ────────────────────────────────────────────────
  // 年度报告
  // ────────────────────────────────────────────────

  Future<void> _generateAnnualReport() async {
    if (_generating) return;
    final year = await _yearPicker();
    if (year == null) return;
    setState(() => _generating = true);
    try {
      final result = await ApiClient.post('/data/annual-report/generate',
          body: {'year': year});
      if (!mounted) return;
      toast(context, '$year 年度报告已生成');
      await _load();
      if (result is Map) _showAnnualReport(result.cast<String, dynamic>());
    } catch (e) {
      if (mounted) toast(context, '生成失败：$e', error: true);
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<int?> _yearPicker() async {
    final now = DateTime.now().year;
    return showModalBottomSheet<int>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('选择年度',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (var i = 0; i < 4; i++)
                  ChoiceChip(
                    label: Text('${now - i} 年'),
                    selected: false,
                    onSelected: (_) => Navigator.pop(ctx, now - i),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showAnnualReport(Map<String, dynamic> report) {
    final summary = _text(report['summary'], fallback: '暂无摘要');
    final content = _text(report['reportContent'], fallback: '本年度暂无足够农事记录');
    final cost = _num(report['totalCost']);
    final year = _int(report['year']);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.event_note_rounded,
                      color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('$year 年度农事报告',
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                  ),
                  StatusChip('成本 ￥$cost', color: AppColors.primary),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLow,
                  borderRadius: BorderRadius.circular(R.sm),
                ),
                child: Text(summary,
                    style: const TextStyle(
                        color: AppColors.onSurface, height: 1.5)),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 260),
                child: SingleChildScrollView(
                  child: Text(content,
                      style: const TextStyle(
                          color: AppColors.onSurfaceVariant, height: 1.6)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ────────────────────────────────────────────────
  // 统计上报
  // ────────────────────────────────────────────────

  Future<void> _openStatForm() async {
    final typeCtrl = TextEditingController(text: '种植面积');
    final periodCtrl = TextEditingController(text: 'Q1');
    final areaCtrl = TextEditingController();
    final yieldCtrl = TextEditingController();
    final cropCtrl = TextEditingController();
    int year = DateTime.now().year;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 18,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: StatefulBuilder(builder: (ctx, setLocal) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('新建统计上报',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              _field('统计类型', typeCtrl, hint: '如：种植面积 / 产量 / 投入'),
              _field('年份', null,
                  child: Wrap(
                    spacing: 8,
                    children: [
                      for (var i = 0; i < 4; i++)
                        ChoiceChip(
                          label: Text('${DateTime.now().year - i}'),
                          selected: year == DateTime.now().year - i,
                          onSelected: (_) =>
                              setLocal(() => year = DateTime.now().year - i),
                        ),
                    ],
                  )),
              _field('周期', periodCtrl, hint: '如：Q1 / 上半年 / 全年'),
              _field('作物', cropCtrl, hint: '如：水稻'),
              Row(
                children: [
                  Expanded(child: _field('面积（亩）', areaCtrl, number: true)),
                  const SizedBox(width: 10),
                  Expanded(child: _field('产量（公斤）', yieldCtrl, number: true)),
                ],
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(ctx, true),
                  icon: const Icon(Icons.upload_rounded, size: 18),
                  label: const Text('提交上报'),
                ),
              ),
            ],
          );
        }),
      ),
    );

    if (ok != true) return;
    try {
      await ApiClient.post('/data/statistics/report', body: {
        'statType': typeCtrl.text.trim(),
        'year': year,
        'period': periodCtrl.text.trim(),
        'dataJson': {
          'cropType': cropCtrl.text.trim(),
          'areaMu': double.tryParse(areaCtrl.text.trim()) ?? 0,
          'yieldKg': double.tryParse(yieldCtrl.text.trim()) ?? 0,
        },
        'status': 'SUBMITTED',
      });
      if (!mounted) return;
      toast(context, '统计数据已上报');
      await _load();
    } catch (e) {
      if (mounted) toast(context, '上报失败：$e', error: true);
    }
  }

  // ────────────────────────────────────────────────
  // 同步日志
  // ────────────────────────────────────────────────

  Future<void> _openSyncLogs() async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.92,
        builder: (ctx, scrollCtrl) =>
            _SyncLogsSheet(scrollController: scrollCtrl),
      ),
    );
  }

  // ────────────────────────────────────────────────
  // build
  // ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        toolbarHeight: 60,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurface),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/data'),
        ),
        title: const Text('数据管理',
            style: TextStyle(
                color: AppColors.onSurface,
                fontSize: 18,
                fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
      body: _loading
          ? const Loading(text: '正在汇总数据管理服务')
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                children: [
                  if (_error != null) ...[
                    _offlineBanner(),
                    const SizedBox(height: 12),
                  ],
                  _heroCard(),
                  const SectionTitle('农事年度报告'),
                  _annualReportCard(),
                  const SectionTitle('统计上报'),
                  _statisticsCard(),
                  const SectionTitle('数据同步'),
                  _syncCard(),
                ],
              ),
            ),
    );
  }

  Widget _offlineBanner() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.warning.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.cloud_off, color: AppColors.warning, size: 18),
            const SizedBox(width: 8),
            const Expanded(
              child: Text('数据更新中，请稍候',
                  style: TextStyle(
                      color: AppColors.warning,
                      fontSize: 12,
                      fontWeight: FontWeight.w600)),
            ),
            TextButton(
              onPressed: _load,
              child: const Text('重试'),
            ),
          ],
        ),
      );

  Widget _heroCard() => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: AppColors.heroGradient,
          borderRadius: BorderRadius.circular(R.md),
          boxShadow: AppColors.ambientShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: const Icon(Icons.bar_chart_rounded,
                      color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('数据管理服务',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w700)),
                      SizedBox(height: 4),
                      Text('年度报告 · 统计上报 · 数据同步',
                          style: TextStyle(
                              color: AppColors.onPrimaryContainer,
                              fontSize: 12,
                              height: 1.35)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _heroStat('年度报告', '${_annualReports.length}'),
                const SizedBox(width: 10),
                _heroStat('统计上报', '${_int(_statSummary['total'])}'),
                const SizedBox(width: 10),
                _heroStat('同步日志', '${_int(_syncStatus['total'])}'),
              ],
            ),
          ],
        ),
      );

  Widget _heroStat(String label, String value) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(R.sm),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      color: AppColors.onPrimaryContainer, fontSize: 11)),
              const SizedBox(height: 2),
              Text(value,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      );

  Widget _annualReportCard() => AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.event_note_outlined,
                    color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text('一键生成',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                FilledButton.tonalIcon(
                  onPressed: _generating ? null : _generateAnnualReport,
                  icon: _generating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome, size: 18),
                  label: Text(_generating ? '生成中' : '生成'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text('根据农事记录与地块数据，自动生成年度报告并归档',
                style:
                    TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12)),
            const SizedBox(height: 14),
            if (_annualReports.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('暂无年度报告，点右上「生成」开始',
                    style: TextStyle(color: AppColors.onSurfaceVariant)),
              )
            else
              Column(
                children: [
                  for (final report in _annualReports.take(4))
                    _annualReportTile(report),
                ],
              ),
          ],
        ),
      );

  Widget _annualReportTile(Map<String, dynamic> report) => Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(R.sm),
          onTap: () => _showAnnualReport(report),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            margin: const EdgeInsets.only(top: 6),
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(R.sm),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(R.sm),
                  ),
                  alignment: Alignment.center,
                  child: Text('${_int(report['year'])}',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _text(report['summary'], fallback: '年度农事报告'),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.onSurface,
                            height: 1.4),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_date(report['createdAt'])} · 成本 ￥${_num(report['totalCost'])}',
                        style: const TextStyle(
                            color: AppColors.outline, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.outlineVariant),
              ],
            ),
          ),
        ),
      );

  Widget _statisticsCard() {
    final byType = _list(_statSummary['byType']);
    final byStatus = _list(_statSummary['byStatus']);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.upload_file_outlined,
                  color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('上报记录',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
              FilledButton.tonalIcon(
                onPressed: _openStatForm,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('上报'),
              ),
            ],
          ),
          if (byType.isNotEmpty || byStatus.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in byType.take(4))
                  _pill('${_text(item['type'])} ${_int(item['count'])}',
                      color: AppColors.primary),
                for (final item in byStatus.take(3))
                  _pill(
                      '${_statusLabel(_text(item['status']))} ${_int(item['count'])}',
                      color: AppColors.secondary),
              ],
            ),
          ],
          const SizedBox(height: 12),
          if (_statRecords.isEmpty)
            const Text('暂无上报记录',
                style: TextStyle(color: AppColors.onSurfaceVariant))
          else
            Column(
              children: [
                for (final item in _statRecords.take(4)) _statTile(item),
              ],
            ),
        ],
      ),
    );
  }

  Widget _statTile(Map<String, dynamic> item) {
    final data = _map(item['dataJson']);
    final status = _text(item['status'], fallback: 'SUBMITTED');
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_text(item['statType'], fallback: '统计')} · ${_int(item['year'])}${_text(item['period'], fallback: '')}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_text(data['cropType'], fallback: '综合')} · ${_num(data['areaMu'])} 亩 / ${_num(data['yieldKg'])} 公斤',
                  style: const TextStyle(
                      color: AppColors.onSurfaceVariant, fontSize: 12),
                ),
              ],
            ),
          ),
          StatusChip(_statusLabel(status), color: _statusColor(status)),
        ],
      ),
    );
  }

  Widget _syncCard() {
    final total = _int(_syncStatus['total']);
    final success = _int(_syncStatus['success']);
    final conflict = _int(_syncStatus['conflict']);
    final failed = _int(_syncStatus['failed']);
    final latest = _list(_syncStatus['latest']);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sync_alt_rounded,
                  color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('同步状态',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
              TextButton.icon(
                onPressed: _openSyncLogs,
                icon: const Icon(Icons.list_alt, size: 16),
                label: const Text('查看全部'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _miniStat('总计', '$total', AppColors.primary),
              _miniStat('成功', '$success', AppColors.primary),
              _miniStat('冲突', '$conflict',
                  conflict > 0 ? AppColors.warning : AppColors.outline),
              _miniStat('失败', '$failed',
                  failed > 0 ? AppColors.error : AppColors.outline),
            ],
          ),
          const SizedBox(height: 12),
          if (latest.isEmpty)
            const Text('暂无同步记录',
                style: TextStyle(color: AppColors.onSurfaceVariant))
          else
            Column(
              children: [
                for (final item in latest.take(3)) _syncLogTile(item),
              ],
            ),
        ],
      ),
    );
  }

  Widget _syncLogTile(Map<String, dynamic> item) {
    final status = _text(item['syncStatus'], fallback: 'SUCCESS');
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_tableLabel(_text(item['tableName'])),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
                Text(
                    '${_text(item['operation'], fallback: 'INSERT')} · ${_date(item['syncedAt'])}',
                    style: const TextStyle(
                        color: AppColors.outline, fontSize: 11)),
              ],
            ),
          ),
          StatusChip(_syncStatusLabel(status), color: _syncColor(status)),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    color: color, fontSize: 18, fontWeight: FontWeight.w700)),
            Text(label,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 12)),
          ],
        ),
      );

  Widget _pill(String text, {Color color = AppColors.primary}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(text,
            style: TextStyle(
                color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      );

  Widget _field(String label, TextEditingController? controller,
      {String? hint, bool number = false, Widget? child}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 4),
          if (child != null)
            child
          else
            TextField(
              controller: controller,
              keyboardType: number
                  ? const TextInputType.numberWithOptions(decimal: true)
                  : null,
              decoration: InputDecoration(
                hintText: hint,
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                filled: true,
                fillColor: AppColors.surfaceLow,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(R.sm),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ────────────────────────────────────────────────
  // helpers
  // ────────────────────────────────────────────────

  String _statusLabel(String status) {
    switch (status) {
      case 'DRAFT':
        return '草稿';
      case 'SUBMITTED':
        return '已上报';
      case 'CONFIRMED':
        return '已确认';
      default:
        return status;
    }
  }

  Color _statusColor(String status) {
    if (status == 'CONFIRMED') return AppColors.primary;
    if (status == 'DRAFT') return AppColors.outline;
    return AppColors.goldContainer;
  }

  String _tableLabel(String tableName) {
    switch (tableName) {
      case 'farm_record':
        return '农事记录';
      case 'disaster_report':
        return '灾情上报';
      case 'land_plot':
        return '地块管理';
      case 'env_report':
        return '环境举报';
      default:
        return tableName.isEmpty ? '业务数据' : tableName;
    }
  }

  String _syncStatusLabel(String status) {
    switch (status) {
      case 'SUCCESS':
        return '成功';
      case 'CONFLICT':
        return '冲突';
      case 'FAILED':
        return '失败';
      default:
        return status;
    }
  }

  Color _syncColor(String status) {
    if (status == 'CONFLICT') return AppColors.warning;
    if (status == 'FAILED') return AppColors.error;
    return AppColors.primary;
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map) {
      return value.map((k, v) => MapEntry('$k', v));
    }
    return {};
  }

  static List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map(_map).toList();
    }
    return [];
  }

  static List<Map<String, dynamic>> _records(dynamic value) {
    final map = _map(value);
    if (map['records'] is List) return _list(map['records']);
    if (value is List) return _list(value);
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

// ────────────────────────────────────────────────
// 同步日志详情 Sheet（分页）
// ────────────────────────────────────────────────

class _SyncLogsSheet extends StatefulWidget {
  final ScrollController scrollController;
  const _SyncLogsSheet({required this.scrollController});

  @override
  State<_SyncLogsSheet> createState() => _SyncLogsSheetState();
}

class _SyncLogsSheetState extends State<_SyncLogsSheet> {
  bool _loading = true;
  String _filter = 'ALL';
  List<Map<String, dynamic>> _records = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final query = <String, dynamic>{'pageSize': '50', 'pageNum': '1'};
      if (_filter != 'ALL') query['syncStatus'] = _filter;
      final res = await ApiClient.get('/data/sync/logs', query: query);
      if (!mounted) return;
      final map = res is Map ? res.cast<String, dynamic>() : {};
      final list = map['records'];
      setState(() {
        _records = list is List
            ? list
                .whereType<Map>()
                .map((m) => m.cast<String, dynamic>())
                .toList()
            : [];
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        toast(context, '加载失败：$e', error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.outlineVariant,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.history_rounded, color: AppColors.primary),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('同步日志',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
              IconButton(
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh,
                    color: AppColors.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final f in const ['ALL', 'SUCCESS', 'CONFLICT', 'FAILED'])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(_label(f)),
                      selected: _filter == f,
                      onSelected: (_) {
                        setState(() => _filter = f);
                        _load();
                      },
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _loading
                ? const Loading(text: '加载日志')
                : _records.isEmpty
                    ? const EmptyView('当前筛选下暂无同步记录',
                        icon: Icons.history_toggle_off)
                    : ListView.separated(
                        controller: widget.scrollController,
                        itemCount: _records.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 6),
                        itemBuilder: (_, i) => _tile(_records[i]),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _tile(Map<String, dynamic> item) {
    final status = '${item['syncStatus'] ?? 'SUCCESS'}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_tableLabel('${item['tableName'] ?? ''}'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700)),
                Text(
                    '${item['operation'] ?? 'INSERT'} · ${_fmt('${item['syncedAt'] ?? ''}')}',
                    style: const TextStyle(
                        color: AppColors.outline, fontSize: 11)),
                if (item['conflictDetail'] != null &&
                    '${item['conflictDetail']}'.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('${item['conflictDetail']}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.warning, fontSize: 11)),
                  ),
              ],
            ),
          ),
          StatusChip(_statusLabel(status), color: _statusColor(status)),
        ],
      ),
    );
  }

  String _label(String s) {
    switch (s) {
      case 'ALL':
        return '全部';
      case 'SUCCESS':
        return '成功';
      case 'CONFLICT':
        return '冲突';
      case 'FAILED':
        return '失败';
      default:
        return s;
    }
  }

  String _statusLabel(String s) => _label(s);

  Color _statusColor(String s) {
    if (s == 'CONFLICT') return AppColors.warning;
    if (s == 'FAILED') return AppColors.error;
    return AppColors.primary;
  }

  String _tableLabel(String s) {
    switch (s) {
      case 'farm_record':
        return '农事记录';
      case 'disaster_report':
        return '灾情上报';
      case 'land_plot':
        return '地块管理';
      case 'env_report':
        return '环境举报';
      default:
        return s.isEmpty ? '业务数据' : s;
    }
  }

  String _fmt(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('MM-dd HH:mm').format(dt.toLocal());
  }
}
