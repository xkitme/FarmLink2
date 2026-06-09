import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';
import '../common/info_detail_page.dart';
import '../common/form_scaffold_page.dart';
import '../../widgets/section_tool_chips.dart';

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
                      const SectionToolChips(section: 'agri'),
                      const SizedBox(height: 8),
                      if (_fromCache)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: AlertBanner('数据更新中，下拉刷新可重试', critical: false),
                        ),
                      _plotSection(),
                      _recordSection(),
                      _photoFlowEntry(),
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
          _flatBox(const Text('还没有地块，点击「添加」建立你的第一块地'))
        else
          ..._plots.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _flatBox(
                  Row(
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
          _flatBox(const Text('还没有农事记录，点击「记一笔」开始记录'))
        else
          ..._records.take(5).map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _recordCard(r),
              )),
      ],
    );
  }

  Widget _recordCard(Map<String, dynamic> record) {
    final date = DateTime.tryParse('${record['recordDate'] ?? ''}')?.toLocal();
    final today = DateUtils.dateOnly(DateTime.now());
    final recordDay = date == null ? null : DateUtils.dateOnly(date);
    final isFuture = recordDay != null && recordDay.isAfter(today);
    final isToday = recordDay == today;
    final dateLabel = date == null
        ? ''
        : isToday
            ? '今日'
            : '${date.month.toString().padLeft(2, '0')}.${date.day.toString().padLeft(2, '0')}';
    return _flatBox(
      Row(
        children: [
          StatusChip(
            '${record['recordType'] ?? '农事'}',
            color: isFuture ? AppColors.goldContainer : AppColors.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${record['content'] ?? record['cropType'] ?? ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 14,
                  ),
                ),
                if (dateLabel.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    dateLabel,
                    style: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (isFuture) ...[
            const SizedBox(width: 8),
            const StatusChip('待办', color: AppColors.goldContainer),
          ] else
            Text(
              '¥${record['cost'] ?? 0}',
              style: const TextStyle(
                color: AppColors.goldContainer,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }

  Widget _photoFlowEntry() {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 8),
      child: _flatBox(
        onTap: () => context.push('/agri/diagnose'),
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(R.md),
              ),
              child: const Icon(
                Icons.biotech_outlined,
                color: AppColors.primary,
                size: 27,
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '智能植保 · 一拍即诊',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    '拍叶片识病，生成用药建议并排程复查',
                    style: TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: AppColors.primary,
              size: 16,
            ),
          ],
        ),
      ),
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
      final status = _healthStatusLabel(r['status']);
      lines.add('健康度：${r['healthScore']}'
          '${status.isEmpty ? '' : '  ·  $status'}');
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
    if (!mounted) return;
    context.push('/detail/info',
        extra: InfoDetailData(
          title: name,
          imageBytes: img,
          sections: [
            InfoSection(items: lines),
            InfoSection(body: '${r['advice'] ?? r['adviceText'] ?? '已生成识别结果'}'),
          ],
        ));
  }

  String _healthStatusLabel(dynamic status) {
    final text = '${status ?? ''}'.trim();
    switch (text.toUpperCase()) {
      case '':
        return '';
      case 'HEALTHY':
      case 'NORMAL':
      case 'GOOD':
        return '健康';
      case 'WARNING':
      case 'RISK':
      case 'ATTENTION':
        return '需关注';
      case 'SICK':
      case 'DISEASE':
      case 'ABNORMAL':
      case 'BAD':
        return '异常';
      default:
        return RegExp(r'[\u4e00-\u9fa5]').hasMatch(text) ? text : '待确认';
    }
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '施肥配方建议',
            sections: [
              InfoSection(items: [
                for (final p in plan)
                  '${(p as Map)['name']}：每亩 ${p['amountPerMu']} kg，合计 ${p['totalAmount']} kg',
              ]),
              InfoSection(body: '${r['advice'] ?? ''}'),
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '灌溉计划',
            body:
                '${plan['advice'] ?? ''}\n${r['note'] ?? ''}\n\n${r['tip'] ?? ''}',
          ));
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '产量预测结果',
            body: '预测产量：${r['predictedYield'] ?? 0} 公斤\n'
                '亩产：${r['perMuYield'] ?? 0} 公斤/亩\n'
                '置信区间：${range.isNotEmpty ? '${range[0]} ~ ${range[1]} 公斤' : '—'}\n\n'
                '${r['advice'] ?? ''}',
          ));
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
    if (!mounted) return;
    context.push('/detail/info',
        extra: InfoDetailData(
          title: '农事日历 · ${DateTime.now().month} 月',
          sections: [
            if (_calendar.isEmpty)
              const InfoSection(body: '本月还没有农事提醒')
            else
              InfoSection(items: [
                for (final c in _calendar)
                  '【${c['solarTerm'] ?? c['cropType'] ?? '农事'}】${c['activity'] ?? ''}'
                      '${'${c['description'] ?? ''}'.isNotEmpty ? ' — ${c['description']}' : ''}',
              ]),
          ],
        ));
  }

  Future<void> _pesticideSheet() async {
    try {
      final list = _list(await ApiClient.get('/agri/pesticide/list'));
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '农药安全查询',
            sections: [
              InfoSection(items: [
                for (final p in list)
                  '${p['name']}【${p['type'] ?? '农药'}】'
                      ' — 防治：${p['targetPest'] ?? '—'}，毒性：${p['toxicity'] ?? '—'}，'
                      '用量：${p['safeDosage'] ?? '见标签'}，间隔：${p['safeInterval'] ?? '—'}',
              ]),
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '碳汇计算结果',
            body: '估算固碳量：${r['carbonAmount'] ?? 0} 吨 CO₂\n\n'
                '${r['tradeRef'] ?? ''}\n\n'
                '${r['tip'] ?? ''}',
          ));
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
  Future<bool?> _formSheet(
      {required String title, required List<Widget> fields}) {
    return Navigator.of(context, rootNavigator: true).push<bool>(
      MaterialPageRoute(
        builder: (_) => FormScaffoldPage(title: title, fields: fields),
      ),
    );
  }

  // 扁平容器：白底 + 1px outlineVariant 描边 + R.sm 圆角 + 无阴影，
  // 替代展示型 AppCard，去掉浮卡感。
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
