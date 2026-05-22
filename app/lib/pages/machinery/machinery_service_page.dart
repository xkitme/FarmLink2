import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

/// 农机共享服务 —— 维保提醒/故障诊断/作业轨迹/成本核算/
/// 土地流转/机手认证/农机保险（7 项均接后端）
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
        _error = _fromCache ? null : '后端连接失败：$e';
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
          onPressed: () => context.go('/machinery'),
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
                          child:
                              AlertBanner('当前为离线缓存数据，请检查后端连接', critical: false),
                        ),
                      const SectionTitle('维保提醒'),
                      _reminderList(),
                      const SectionTitle('农机工具'),
                      _toolRow([
                        (Icons.build_circle, '故障诊断', _faultSheet),
                        (Icons.calculate, '成本核算', _costSheet),
                        (Icons.route, '作业轨迹', _trackSheet),
                      ]),
                      SectionTitle('土地流转',
                          trailing: TextButton.icon(
                            onPressed: _createTransfer,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('发布'),
                          )),
                      _transferList(),
                      const SectionTitle('保险与认证'),
                      _toolRow([
                        (Icons.shield, '农机投保', _insuranceSheet),
                        (Icons.verified_user, '机手认证', _certSheet),
                      ]),
                    ],
                  ),
                ),
    );
  }

  // ── 维保提醒 ──────────────────────────────
  Widget _reminderList() {
    if (_reminders.isEmpty) {
      return const AppCard(child: Text('你名下暂无农机，发布农机后将自动提醒维保'));
    }
    return Column(
      children: [
        for (final r in _reminders)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: (r['level'] == 'DUE'
                              ? AppColors.error
                              : AppColors.primary)
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(R.md),
                    ),
                    child: Icon(Icons.handyman,
                        color: r['level'] == 'DUE'
                            ? AppColors.error
                            : AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${r['machineName'] ?? '农机'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text('${r['advice'] ?? ''}',
                            style: const TextStyle(
                                fontSize: 12,
                                height: 1.4,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  if (r['level'] == 'DUE')
                    const StatusChip('待保养', color: AppColors.error),
                ],
              ),
            ),
          ),
      ],
    );
  }

  // ── 土地流转 ──────────────────────────────
  Widget _transferList() {
    if (_transfers.isEmpty) return const AppCard(child: Text('暂无土地流转信息'));
    return Column(
      children: [
        for (final t in _transfers)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Column(
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
      _sheet('诊断结果',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('可能原因：',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              for (final c in causes)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('· $c', style: const TextStyle(fontSize: 14)),
                ),
              const SizedBox(height: 10),
              Text('${r['advice'] ?? ''}',
                  style: const TextStyle(
                      fontSize: 14, height: 1.6, color: AppColors.onSurface)),
              const SizedBox(height: 8),
              Text('${r['tip'] ?? ''}',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.onSurfaceVariant)),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, '诊断失败：$e', error: true);
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
      _sheet('${r['year']} 年成本核算',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('农资投入合计：¥${r['totalCost'] ?? 0}（${r['recordCount'] ?? 0} 笔）',
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              for (final c in byType)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('· ${(c as Map)['type']}：¥${c['cost']}',
                      style: const TextStyle(fontSize: 14)),
                ),
              if (r['profit'] != null) ...[
                const SizedBox(height: 10),
                Text(
                    '收入 ¥${r['income']} · 净利润 ¥${r['profit']} · 利润率 ${r['profitRate']}%',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
              ],
              if ('${r['advice'] ?? ''}'.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('${r['advice']}',
                    style: const TextStyle(
                        fontSize: 13,
                        height: 1.6,
                        color: AppColors.onSurfaceVariant)),
              ],
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, '核算失败：$e', error: true);
    }
  }

  // ── 作业轨迹 ──────────────────────────────
  Future<void> _trackSheet() async {
    try {
      final tracks = _list(await ApiClient.get('/machinery/track/list'));
      if (!mounted) return;
      _sheet('作业轨迹记录',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
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
          ));
    } catch (e) {
      if (mounted) toast(context, '读取失败：$e', error: true);
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

  // ── 通用 ──────────────────────────────────
  Widget _toolRow(List<(IconData, String, VoidCallback)> items) {
    return Row(
      children: [
        for (final it in items) ...[
          Expanded(
            child: AppCard(
              padding: const EdgeInsets.symmetric(vertical: 16),
              onTap: it.$3,
              child: Column(
                children: [
                  Icon(it.$1, color: AppColors.secondary, size: 26),
                  const SizedBox(height: 6),
                  Text(it.$2, style: const TextStyle(fontSize: 13)),
                ],
              ),
            ),
          ),
          if (it != items.last) const SizedBox(width: 12),
        ],
      ],
    );
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
      if (mounted) toast(context, '当前离线，已存入同步队列，联网后自动提交');
    }
  }

  void _sheet(String title, {required Widget child}) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        maxChildSize: 0.9,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            Text(title,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface)),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }

  Future<bool?> _formSheet(
      {required String title, required List<Widget> fields}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(sheetCtx).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const SizedBox(height: 14),
              ...fields,
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(sheetCtx, true),
                  child: const Text('提交'),
                ),
              ),
            ],
          ),
        ),
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
