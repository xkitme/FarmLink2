import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

/// 农业生产板块 —— 地块/农事记录 + 作物长势/杂草/种子识别 +
/// 施肥/灌溉/产量预测 + 农事日历/农药查询/碳汇计算（全部接服务端）
class AgriPage extends StatefulWidget {
  const AgriPage({super.key});

  @override
  State<AgriPage> createState() => _AgriPageState();
}

class _AgriPageState extends State<AgriPage> {
  final _picker = ImagePicker();
  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _plots = [];
  List<Map<String, dynamic>> _records = [];
  List<Map<String, dynamic>> _calendar = [];

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
        ApiClient.get('/agri/plot/list'),
        ApiClient.get('/agri/record/list', query: {'pageSize': 10}),
        ApiClient.get('/agri/calendar', query: {'month': DateTime.now().month}),
      ]);
      if (!mounted) return;
      _plots = _list(r[0]);
      _records = _list(_m(r[1])['records']);
      _calendar = _list(_m(r[2])['items']);
      await OfflineCache.saveList('agri:plots', _plots);
      await OfflineCache.saveList('agri:records', _records);
      setState(() {
        _fromCache = false;
        _loading = false;
      });
    } catch (e) {
      _plots = await OfflineCache.readList('agri:plots');
      _records = await OfflineCache.readList('agri:records');
      if (!mounted) return;
      setState(() {
        _fromCache = _plots.isNotEmpty || _records.isNotEmpty;
        _error = _fromCache ? null : '服务暂时不可用，请稍后重试';
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
              context.canPop() ? context.pop() : context.go('/home'),
        ),
        title: const Text('AI 农业生产',
            style: TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: _loading
          ? const Loading(text: '正在加载农事数据...')
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
                      _plotSection(),
                      _recordSection(),
                      const SectionTitle('AI 田间识别'),
                      _detectGrid(),
                      const SectionTitle('智能农事建议'),
                      _adviceGrid(),
                      const SectionTitle('农事服务'),
                      _serviceGrid(),
                    ],
                  ),
                ),
    );
  }

  // ── 我的地块 ──────────────────────────────
  Widget _plotSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle('我的地块',
            trailing: TextButton.icon(
              onPressed: _addPlot,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('添加'),
            )),
        if (_plots.isEmpty)
          const AppCard(child: Text('还没有地块，点击「添加」建立你的第一块地'))
        else
          ..._plots.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: AppCard(
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer
                              .withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(R.md),
                        ),
                        child: const Icon(Icons.crop_landscape,
                            color: AppColors.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${p['plotName'] ?? '地块'}',
                                style: const TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w600)),
                            Text(
                                '${p['cropType'] ?? '未种植'} · ${p['areaMu'] ?? 0} 亩 · ${p['soilType'] ?? '—'}',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.onSurfaceVariant)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              )),
      ],
    );
  }

  Future<void> _addPlot() async {
    final name = TextEditingController();
    final area = TextEditingController();
    final crop = TextEditingController();
    final soil = TextEditingController();
    final ok = await _formSheet(title: '添加地块', fields: [
      _field(name, '地块名称'),
      _field(area, '面积（亩）', number: true),
      _field(crop, '当前作物'),
      _field(soil, '土壤类型'),
    ]);
    if (ok != true) return;
    await _submit(
        '/agri/plot',
        {
          'plotName': name.text.trim(),
          'areaMu': double.tryParse(area.text) ?? 0,
          'cropType': crop.text.trim(),
          'soilType': soil.text.trim(),
        },
        'land_plot',
        '地块已添加');
  }

  // ── 农事记录 ──────────────────────────────
  Widget _recordSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle('农事记录',
            trailing: TextButton.icon(
              onPressed: _addRecord,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('记一笔'),
            )),
        if (_records.isEmpty)
          const AppCard(child: Text('暂无农事记录'))
        else
          ..._records.take(5).map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: AppCard(
                  child: Row(
                    children: [
                      StatusChip('${r['recordType'] ?? '农事'}'),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text('${r['content'] ?? r['cropType'] ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 14)),
                      ),
                      Text('¥${r['cost'] ?? 0}',
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.goldContainer)),
                    ],
                  ),
                ),
              )),
      ],
    );
  }

  Future<void> _addRecord() async {
    final type = ValueNotifier('播种');
    final crop = TextEditingController();
    final content = TextEditingController();
    final cost = TextEditingController();
    final ok = await _formSheet(title: '记一笔农事', fields: [
      _chipsField(['播种', '施肥', '打药', '灌溉', '收获'], type),
      _field(crop, '作物'),
      _field(content, '记录内容', lines: 2),
      _field(cost, '投入成本（元）', number: true),
    ]);
    if (ok != true) return;
    await _submit(
        '/agri/record',
        {
          'recordType': type.value,
          'cropType': crop.text.trim(),
          'content': content.text.trim(),
          'cost': double.tryParse(cost.text) ?? 0,
          'recordDate': DateTime.now().toIso8601String(),
        },
        'farm_record',
        '农事记录已保存');
  }

  // ── AI 田间识别 ───────────────────────────
  Widget _detectGrid() {
    final items = [
      (Icons.monitor_heart, '作物长势', '/agri/crop/monitor'),
      (Icons.grass, '杂草识别', '/agri/weed/detect'),
      (Icons.spa, '种子鉴别', '/agri/seed/detect'),
    ];
    return Row(
      children: [
        for (final it in items) ...[
          Expanded(
            child: AppCard(
              padding: const EdgeInsets.symmetric(vertical: 16),
              onTap: () => _detect(it.$2, it.$3),
              child: Column(
                children: [
                  Icon(it.$1, color: AppColors.primary, size: 26),
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

  Future<void> _detect(String name, String path) async {
    final src = await _pickSource();
    if (src == null) return;
    final img =
        await _picker.pickImage(source: src, imageQuality: 82, maxWidth: 1600);
    if (img == null) return;
    final bytes = await img.readAsBytes();
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
          child: CircularProgressIndicator(color: AppColors.primary)),
    );
    try {
      final r = _m(await ApiClient.upload(path, bytes, img.name));
      if (!mounted) return;
      Navigator.pop(context); // 关闭 loading
      _detectResultSheet(name, bytes, r);
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      toast(context, actionErrorMessage(name, e), error: true);
    }
  }

  void _detectResultSheet(String name, Uint8List img, Map<String, dynamic> r) {
    final lines = <String>[];
    if (r['healthScore'] != null) {
      lines.add('健康度：${r['healthScore']}  ·  ${r['status'] ?? ''}');
    }
    if (r['growthStage'] != null) lines.add('生长阶段：${r['growthStage']}');
    if (r['weedName'] != null) lines.add('识别结果：${r['weedName']}');
    if (r['germination'] != null) {
      lines.add('发芽率：${r['germination']}%  ·  纯度 ${r['purity']}%');
    }
    if (r['grade'] != null) lines.add('等级：${r['grade']}');
    if (r['confidence'] != null) {
      lines.add('可信度：${((r['confidence'] as num) * 100).round()}%');
    }
    _sheet(name,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(R.md),
              child: Image.memory(img,
                  height: 160, width: double.infinity, fit: BoxFit.cover),
            ),
            const SizedBox(height: 12),
            ...lines.map((l) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(l,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                )),
            const SizedBox(height: 6),
            Text('${r['advice'] ?? r['adviceText'] ?? '已生成识别结果'}',
                style: const TextStyle(
                    fontSize: 14, height: 1.6, color: AppColors.onSurface)),
          ],
        ));
  }

  Future<ImageSource?> _pickSource() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (c) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined,
                  color: AppColors.primary),
              title: const Text('拍照'),
              onTap: () => Navigator.pop(c, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppColors.secondary),
              title: const Text('从相册选择'),
              onTap: () => Navigator.pop(c, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  // ── 智能农事建议 ──────────────────────────
  Widget _adviceGrid() {
    final items = [
      (Icons.science, '施肥配方', _fertilizer),
      (Icons.water_drop, '灌溉计划', _irrigation),
      (Icons.trending_up, '产量预测', _yield),
    ];
    return Row(
      children: [
        for (final it in items) ...[
          Expanded(
            child: AppCard(
              padding: const EdgeInsets.symmetric(vertical: 16),
              onTap: it.$3,
              child: Column(
                children: [
                  Icon(it.$1, color: AppColors.goldContainer, size: 26),
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

  Future<void> _fertilizer() async {
    final crop = TextEditingController();
    final area = TextEditingController();
    final ok = await _formSheet(title: '智能施肥配方', fields: [
      _field(crop, '作物（如 柑橘）'),
      _field(area, '面积（亩）', number: true),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/agri/fertilizer/advise', body: {
        'cropType': crop.text.trim(),
        'areaMu': double.tryParse(area.text) ?? 1,
      }));
      final plan = (r['fertilizerPlan'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      _sheet('施肥配方建议',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final p in plan)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                      '${(p as Map)['name']}：每亩 ${p['amountPerMu']} kg，合计 ${p['totalAmount']} kg',
                      style: const TextStyle(fontSize: 14)),
                ),
              const SizedBox(height: 8),
              Text('${r['advice'] ?? ''}',
                  style: const TextStyle(
                      fontSize: 14, height: 1.6, color: AppColors.onSurface)),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('生成', e), error: true);
    }
  }

  Future<void> _irrigation() async {
    final crop = TextEditingController();
    final stage = ValueNotifier('分蘖期');
    final ok = await _formSheet(title: '灌溉计划助手', fields: [
      _field(crop, '作物'),
      _chipsField(['苗期', '分蘖期', '拔节期', '孕穗期', '开花期', '灌浆期'], stage),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/agri/irrigation/plan', body: {
        'cropType': crop.text.trim(),
        'growthStage': stage.value,
      }));
      final plan = _m(r['plan']);
      if (!mounted) return;
      _infoSheet('灌溉计划',
          '${plan['advice'] ?? ''}\n${r['note'] ?? ''}\n\n${r['tip'] ?? ''}');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('生成', e), error: true);
    }
  }

  Future<void> _yield() async {
    if (_plots.isEmpty) {
      toast(context, '请先添加地块再做产量预测');
      return;
    }
    final plot = ValueNotifier('${_plots.first['id']}');
    final ok = await _formSheet(title: '产量预测', fields: [
      _chipsField(
        [for (final p in _plots) '${p['id']}'],
        plot,
        labels: {for (final p in _plots) '${p['id']}': '${p['plotName']}'},
      ),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/agri/yield/predict',
          body: {'plotId': int.tryParse(plot.value)}));
      final range = (r['confidenceRange'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      _infoSheet('产量预测结果',
          '预测产量：${r['predictedYield'] ?? 0} 公斤\n亩产：${r['perMuYield'] ?? 0} 公斤/亩\n置信区间：${range.isNotEmpty ? '${range[0]} ~ ${range[1]} 公斤' : '—'}\n\n${r['advice'] ?? ''}');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('预测', e), error: true);
    }
  }

  // ── 农事服务 ──────────────────────────────
  Widget _serviceGrid() {
    final items = [
      (Icons.calendar_month, '农事日历', _calendarSheet),
      (Icons.medication, '农药查询', _pesticideSheet),
      (Icons.co2, '碳汇计算', _carbonSheet),
    ];
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

  void _calendarSheet() {
    _sheet('农事日历 · ${DateTime.now().month} 月',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_calendar.isEmpty)
              const Text('本月暂无农事提醒',
                  style: TextStyle(color: AppColors.onSurfaceVariant))
            else
              for (final c in _calendar)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      StatusChip('${c['solarTerm'] ?? c['cropType'] ?? '农事'}'),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${c['activity'] ?? ''}',
                                style: const TextStyle(
                                    fontSize: 14, fontWeight: FontWeight.w600)),
                            if ('${c['description'] ?? ''}'.isNotEmpty)
                              Text('${c['description']}',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.onSurfaceVariant)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
          ],
        ));
  }

  Future<void> _pesticideSheet() async {
    try {
      final list = _list(await ApiClient.get('/agri/pesticide/list'));
      if (!mounted) return;
      _sheet('农药安全查询',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final p in list)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text('${p['name']}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w700)),
                        const SizedBox(width: 8),
                        StatusChip('${p['type'] ?? '农药'}',
                            color: AppColors.goldContainer),
                      ]),
                      Text(
                          '防治对象：${p['targetPest'] ?? '—'} · 毒性 ${p['toxicity'] ?? '—'}',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.onSurfaceVariant)),
                      Text(
                          '安全用量：${p['safeDosage'] ?? '见标签'} · 间隔期 ${p['safeInterval'] ?? '—'}',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('读取', e), error: true);
    }
  }

  Future<void> _carbonSheet() async {
    final crop = TextEditingController();
    final area = TextEditingController();
    final ok = await _formSheet(title: '农业碳汇计算', fields: [
      _field(crop, '作物（如 水稻）'),
      _field(area, '面积（亩）', number: true),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/agri/carbon/calc', body: {
        'cropType': crop.text.trim(),
        'areaMu': double.tryParse(area.text) ?? 1,
      }));
      if (!mounted) return;
      _infoSheet('碳汇计算结果',
          '估算固碳量：${r['carbonAmount'] ?? 0} 吨 CO₂\n\n${r['tradeRef'] ?? ''}\n\n${r['tip'] ?? ''}');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('计算', e), error: true);
    }
  }

  // ── 通用提交 ──────────────────────────────
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

  // ── 通用弹层 ──────────────────────────────
  void _infoSheet(String title, String body) => _sheet(title,
      child: Text(body,
          style: const TextStyle(
              fontSize: 14, height: 1.7, color: AppColors.onSurface)));

  void _sheet(String title, {required Widget child}) {
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
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
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(sheetCtx).viewInsets.bottom + 20),
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
