import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';
import '../common/form_scaffold_page.dart';
import '../common/info_detail_page.dart';

/// 农机共享服务 —— 维保提醒/故障诊断/作业轨迹/成本核算/
/// 土地流转/机手认证/农机保险（7 项均接服务端）
class MachineryServicePage extends StatefulWidget {
  const MachineryServicePage({super.key});

  @override
  State<MachineryServicePage> createState() => _MachineryServicePageState();
}

class _MachineryServicePageState extends State<MachineryServicePage> {
  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _reminders = [];
  List<Map<String, dynamic>> _transfers = [];
  List<Map<String, dynamic>> _myMachines = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Map<String, dynamic> _m(dynamic v) =>
      v is Map ? v.cast<String, dynamic>() : <String, dynamic>{};
  List<Map<String, dynamic>> _list(dynamic v) => (v is List ? v : const [])
      .whereType<Map>()
      .map((e) => e.cast<String, dynamic>())
      .toList();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await Future.wait<dynamic>([
        ApiClient.get('/machinery/maintain/remind'),
        ApiClient.get('/land/transfer/list'),
        ApiClient.get('/machinery/mine'),
      ]);
      if (!mounted) return;
      _reminders = _list(r[0]);
      _transfers = _list(_m(r[1])['records']);
      _myMachines = _list(r[2]);
      await OfflineCache.saveList('machinery:remind', _reminders);
      await OfflineCache.saveList('machinery:transfer', _transfers);
      setState(() {
        _fromCache = false;
        _loading = false;
      });
    } catch (e) {
      _reminders = await OfflineCache.readList('machinery:remind');
      _transfers = await OfflineCache.readList('machinery:transfer');
      if (!mounted) return;
      setState(() {
        _fromCache = _reminders.isNotEmpty || _transfers.isNotEmpty;
        _error = _fromCache ? null : serviceUnavailableMessage;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurfaceVariant),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/machinery'),
        ),
        title: const Text('农机服务',
            style: TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: _loading
          ? const Loading(text: '正在加载农机数据...')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                    children: [
                      if (_fromCache)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: AlertBanner('数据更新中，下拉刷新可重试', critical: false),
                        ),
                      const SectionTitle('农机服务'),
                      _serviceGrid(),
                      const SectionTitle('维保提醒'),
                      _reminderList(),
                      SectionTitle('土地流转',
                          trailing: TextButton.icon(
                            onPressed: _createTransfer,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('发布'),
                          )),
                      _transferList(),
                    ],
                  ),
                ),
    );
  }

  // 展示型扁平容器：白底 + 1px 描边 + R.sm 圆角 + 无阴影。
  Widget _flatBox(Widget child,
      {VoidCallback? onTap,
      EdgeInsetsGeometry padding = const EdgeInsets.all(16)}) {
    final box = Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.sm),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
      ),
      padding: padding,
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.sm),
        child: box,
      ),
    );
  }

  // ── 维保提醒 ──────────────────────────────
  Widget _reminderList() {
    if (_reminders.isEmpty) {
      return _flatBox(const Text('你名下暂无农机，发布农机后将自动提醒维保'));
    }
    return Column(
      children: [
        for (final r in _reminders)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _flatBox(
              Row(
                children: [
                  Builder(builder: (_) {
                    final color = _maintenanceLevelColor(r['level']);
                    return Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(R.md),
                      ),
                      child: Icon(Icons.handyman, color: color),
                    );
                  }),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${r['machineName'] ?? '农机'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text('${r['advice'] ?? ''}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                height: 1.4,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  StatusChip(_maintenanceLevelLabel(r['level']),
                      color: _maintenanceLevelColor(r['level'])),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Color _maintenanceLevelColor(dynamic level) {
    switch ('${level ?? ''}'.trim().toUpperCase()) {
      case 'OVERDUE':
      case 'DUE':
        return AppColors.error;
      case 'SOON':
      case 'UPCOMING':
      case 'WARNING':
        return AppColors.goldContainer;
      case 'OK':
      case 'NORMAL':
      case 'DONE':
        return AppColors.primary;
      default:
        return AppColors.secondary;
    }
  }

  String _maintenanceLevelLabel(dynamic level) {
    switch ('${level ?? ''}'.trim().toUpperCase()) {
      case 'OVERDUE':
        return '已逾期';
      case 'DUE':
        return '待保养';
      case 'SOON':
      case 'UPCOMING':
      case 'WARNING':
        return '临近保养';
      case 'OK':
      case 'NORMAL':
      case 'DONE':
        return '状态正常';
      default:
        return '待确认';
    }
  }

  // ── 土地流转 ──────────────────────────────
  Widget _transferList() {
    if (_transfers.isEmpty) return _flatBox(const Text('暂无土地流转信息'));
    return Column(
      children: [
        for (final t in _transfers)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _flatBox(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text('${t['title'] ?? '土地流转'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                      StatusChip('${t['transferType'] ?? '出租'}',
                          color: AppColors.secondary),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                      '${t['areaMu'] ?? 0} 亩 · ¥${t['price'] ?? 0} ${t['priceUnit'] ?? ''} · ${t['location'] ?? ''}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant)),
                  if ('${t['description'] ?? ''}'.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text('${t['description']}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.onSurface)),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _createTransfer() async {
    final title = TextEditingController();
    final area = TextEditingController();
    final price = TextEditingController();
    final location = TextEditingController();
    final desc = TextEditingController();
    final type = ValueNotifier('出租');
    final ok = await _formSheet(title: '发布土地流转', fields: [
      _chipsField(['出租', '转包', '入股', '代耕'], type),
      _field(title, '标题'),
      _field(area, '面积（亩）', number: true),
      _field(price, '价格（元/亩/年）', number: true),
      _field(location, '地块位置'),
      _field(desc, '补充说明', lines: 2),
    ]);
    if (ok != true) return;
    await _submit(
        '/land/transfer',
        {
          'title': title.text.trim(),
          'areaMu': double.tryParse(area.text) ?? 0,
          'transferType': type.value,
          'price': double.tryParse(price.text) ?? 0,
          'location': location.text.trim(),
          'description': desc.text.trim(),
        },
        'land_transfer',
        '土地流转信息已发布');
  }

  // ── 故障诊断 ──────────────────────────────
  Future<void> _faultSheet() async {
    final mtype = TextEditingController();
    final symptom = TextEditingController();
    final ok = await _formSheet(title: '农机故障诊断', fields: [
      _field(mtype, '农机类型（如 拖拉机）'),
      _field(symptom, '故障现象描述', lines: 3),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/machinery/fault/diagnose', body: {
        'machineType': mtype.text.trim(),
        'symptom': symptom.text.trim(),
      }));
      final causes = (r['possibleCauses'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '诊断结果',
            sections: [
              if (causes.isNotEmpty)
                InfoSection(
                  subtitle: '可能原因',
                  items: [for (final c in causes) '$c'],
                ),
              if ('${r['advice'] ?? ''}'.isNotEmpty)
                InfoSection(body: '${r['advice']}'),
              if ('${r['tip'] ?? ''}'.isNotEmpty)
                InfoSection(body: '${r['tip']}'),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('诊断', e), error: true);
    }
  }

  // ── 成本核算 ──────────────────────────────
  Future<void> _costSheet() async {
    final year = TextEditingController(text: '${DateTime.now().year}');
    final income = TextEditingController();
    final ok = await _formSheet(title: '成本核算', fields: [
      _field(year, '年份', number: true),
      _field(income, '本年度收入（元，选填）', number: true),
    ]);
    if (ok != true) return;
    try {
      final q = {'year': year.text.trim()};
      if (income.text.trim().isNotEmpty) q['income'] = income.text.trim();
      final r = _m(await ApiClient.get('/machinery/cost/summary', query: q));
      final byType = (r['costByType'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '${r['year']} 年成本核算',
            body: '农资投入合计：¥${r['totalCost'] ?? 0}（${r['recordCount'] ?? 0} 笔）',
            sections: [
              if (byType.isNotEmpty)
                InfoSection(
                  items: [
                    for (final c in byType)
                      '${(c as Map)['type']}：¥${c['cost']}',
                  ],
                ),
              if (r['profit'] != null)
                InfoSection(
                  body:
                      '收入 ¥${r['income']} · 净利润 ¥${r['profit']} · 利润率 ${r['profitRate']}%',
                ),
              if ('${r['advice'] ?? ''}'.isNotEmpty)
                InfoSection(body: '${r['advice']}'),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('核算', e), error: true);
    }
  }

  // ── 作业轨迹 ──────────────────────────────
  Future<void> _trackSheet() async {
    try {
      final tracks = _list(await ApiClient.get('/machinery/track/list'));
      if (!mounted) return;
      await Navigator.of(context, rootNavigator: true).push<void>(
        MaterialPageRoute(
          builder: (ctx) => Scaffold(
            backgroundColor: AppColors.background,
            appBar: AppBar(
              backgroundColor: AppColors.surface,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.primary),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
              title: const Text(
                '作业轨迹记录',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
            body: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              children: [
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _reportTrack();
                    },
                    icon: const Icon(Icons.add_location_alt, size: 18),
                    label: const Text('上报一条作业轨迹'),
                  ),
                ),
                const SizedBox(height: 12),
                if (tracks.isEmpty)
                  const Text('暂无作业轨迹',
                      style: TextStyle(color: AppColors.onSurfaceVariant))
                else
                  for (final t in tracks)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                          '· 作业 ${t['workArea'] ?? 0} 亩 · ${t['durationHours'] ?? 0} 小时 · ${'${t['workDate'] ?? ''}'.split('T').first}',
                          style: const TextStyle(fontSize: 14)),
                    ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('读取', e), error: true);
    }
  }

  Future<void> _reportTrack() async {
    if (_myMachines.isEmpty) {
      toast(context, '请先在农机页发布你的农机');
      return;
    }
    final machine = ValueNotifier('${_myMachines.first['id']}');
    final area = TextEditingController();
    final hours = TextEditingController();
    final ok = await _formSheet(title: '上报作业轨迹', fields: [
      _chipsField(
        [for (final m in _myMachines) '${m['id']}'],
        machine,
        labels: {
          for (final m in _myMachines) '${m['id']}': '${m['machineName']}'
        },
      ),
      _field(area, '作业面积（亩）', number: true),
      _field(hours, '作业时长（小时）', number: true),
    ]);
    if (ok != true) return;
    await _submit(
        '/machinery/track',
        {
          'machineryId': int.tryParse(machine.value),
          'workArea': double.tryParse(area.text) ?? 0,
          'durationHours': double.tryParse(hours.text) ?? 0,
          'workDate': DateTime.now().toIso8601String(),
        },
        'machinery_track',
        '作业轨迹已记录');
  }

  // ── 农机保险 ──────────────────────────────
  Future<void> _insuranceSheet() async {
    final type = ValueNotifier('农机综合险');
    final premium = TextEditingController();
    final coverage = TextEditingController();
    final ok = await _formSheet(title: '农机投保', fields: [
      _chipsField(['农机综合险', '第三者责任险', '机身损失险', '驾乘人员险'], type),
      _field(premium, '保费（元）', number: true),
      _field(coverage, '保额（元）', number: true),
    ]);
    if (ok != true) return;
    await _submit(
        '/machinery/insurance',
        {
          'insuranceType': type.value,
          'premium': double.tryParse(premium.text) ?? 0,
          'coverage': double.tryParse(coverage.text) ?? 0,
        },
        'machinery_insurance',
        '投保信息已提交');
  }

  // ── 机手认证 ──────────────────────────────
  Future<void> _certSheet() async {
    final name = TextEditingController();
    final certNo = TextEditingController();
    final machines = TextEditingController();
    final type = ValueNotifier('拖拉机操作证');
    final ok = await _formSheet(title: '机手技能认证申请', fields: [
      _chipsField(['拖拉机操作证', '联合收割机操作证', '植保无人机执照'], type),
      _field(name, '真实姓名'),
      _field(certNo, '证件编号（选填）'),
      _field(machines, '可操作机型'),
    ]);
    if (ok != true) return;
    await _submit(
        '/machinery/cert/apply',
        {
          'realName': name.text.trim(),
          'certType': type.value,
          'certNo': certNo.text.trim(),
          'machineTypes': machines.text.trim(),
        },
        'operator_cert',
        '认证申请已提交，等待审核');
  }

  // ── 农机服务工具墙（7 项，3 列 grid）────────────────────
  Widget _serviceGrid() {
    final items = <(IconData, String, VoidCallback)>[
      (Icons.handyman, '维保提醒', _scrollToReminders),
      (Icons.build_circle, '故障诊断', _faultSheet),
      (Icons.calculate, '成本核算', _costSheet),
      (Icons.route, '作业轨迹', _trackSheet),
      (Icons.swap_horiz, '土地流转', _createTransfer),
      (Icons.shield, '农机投保', _insuranceSheet),
      (Icons.verified_user, '机手认证', _certSheet),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.0,
      ),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final icon = items[i].$1;
        final label = items[i].$2;
        final onTap = items[i].$3;
        return AppCard(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppColors.onSurface,
                  height: 1.3,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// 「维保提醒」tile 点击 —— 跳详情页展示提醒列表
  void _scrollToReminders() {
    context.push('/detail/info',
        extra: InfoDetailData(
          title: '维保提醒',
          body: _reminders.isEmpty ? '你名下暂无农机，发布农机后将自动提醒维保' : null,
          sections: _reminders.isEmpty
              ? null
              : [
                  for (final r in _reminders)
                    InfoSection(
                      subtitle:
                          '${r['machineName'] ?? '农机'} · ${_maintenanceLevelLabel(r['level'])}',
                      body: '${r['advice'] ?? ''}',
                    ),
                ],
        ));
  }

  Future<void> _submit(String path, Map<String, dynamic> payload, String table,
      String okMsg) async {
    try {
      await ApiClient.post(path, body: payload);
      if (!mounted) return;
      toast(context, okMsg);
      _load();
    } catch (_) {
      await OfflineSyncQueue.enqueue(
          tableName: table, payload: payload, path: path);
      if (mounted) toast(context, '已加入待发送队列，将自动重传');
    }
  }

  Future<bool?> _formSheet(
      {required String title, required List<Widget> fields}) {
    return Navigator.of(context, rootNavigator: true).push<bool>(
      MaterialPageRoute(
        builder: (_) => FormScaffoldPage(title: title, fields: fields),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {bool number = false, int lines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        maxLines: lines,
        keyboardType: number ? TextInputType.number : TextInputType.text,
        decoration: InputDecoration(labelText: label, filled: true),
      ),
    );
  }

  Widget _chipsField(List<String> options, ValueNotifier<String> sel,
      {Map<String, String>? labels}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: StatefulBuilder(
        builder: (ctx, setS) => Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final o in options)
              ChoiceChip(
                label: Text(labels?[o] ?? o),
                selected: sel.value == o,
                onSelected: (_) => setS(() => sel.value = o),
              ),
          ],
        ),
      ),
    );
  }
}
