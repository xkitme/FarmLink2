import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

/// 气象灾害板块 —— 预警 / 灾情上报 / 保险理赔 / 应急预案 /
/// 冻害防护 / 火险预警 / 干旱指数 / 一键求助（8 项均接服务端）
class DisasterPage extends StatefulWidget {
  const DisasterPage({super.key});

  @override
  State<DisasterPage> createState() => _DisasterPageState();
}

class _DisasterPageState extends State<DisasterPage> {
  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _alerts = [];
  List<Map<String, dynamic>> _guides = [];
  Map<String, dynamic> _fire = {};
  Map<String, dynamic> _drought = {};
  Map<String, dynamic> _frost = {};

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
  int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await Future.wait<dynamic>([
        ApiClient.get('/disaster/alert/list'),
        ApiClient.get('/disaster/emergency/guide'),
        ApiClient.get('/disaster/fire/risk'),
        ApiClient.get('/disaster/drought/index'),
        ApiClient.get('/disaster/frost/advice'),
      ]);
      if (!mounted) return;
      _alerts = _list(r[0]);
      _guides = _list(r[1]);
      _fire = _m(r[2]);
      _drought = _m(r[3]);
      _frost = _m(r[4]);
      await OfflineCache.saveList('disaster:alerts', _alerts);
      await OfflineCache.saveList('disaster:guides', _guides);
      setState(() {
        _fromCache = false;
        _loading = false;
      });
    } catch (e) {
      _alerts = await OfflineCache.readList('disaster:alerts');
      _guides = await OfflineCache.readList('disaster:guides');
      if (!mounted) return;
      setState(() {
        _fromCache = _alerts.isNotEmpty || _guides.isNotEmpty;
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
          onPressed: () => context.go('/home'),
        ),
        title: const Text('气象灾害',
            style: TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: _loading
          ? const Loading(text: '正在获取灾害预警...')
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
                      _alertSection(),
                      const SectionTitle('风险指数'),
                      // 在竖向 ListView 里，Row 的高度约束是无限的；直接用
                      // CrossAxisAlignment.stretch 会把卡片拉伸到无限高而抛异常。
                      // 用 IntrinsicHeight 把 Row 收成两卡的等高有限高度。
                      IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(child: _fireCard()),
                            const SizedBox(width: 12),
                            Expanded(child: _droughtCard()),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      _frostCard(),
                      const SectionTitle('应急预案'),
                      ..._guides.map(_guideTile),
                      if (_guides.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: EmptyView('暂无应急预案'),
                        ),
                      const SectionTitle('上报与求助'),
                      _actionGrid(),
                    ],
                  ),
                ),
    );
  }

  // ── 当前预警 ──────────────────────────────
  Widget _alertSection() {
    if (_alerts.isEmpty) {
      return const AppCard(
        child: Row(
          children: [
            Icon(Icons.verified, color: AppColors.primary),
            SizedBox(width: 10),
            Expanded(
              child: Text('当前暂无生效的气象灾害预警',
                  style: TextStyle(
                      fontSize: 15, color: AppColors.onSurfaceVariant)),
            ),
          ],
        ),
      );
    }
    return Column(
      children: [
        for (final a in _alerts)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(R.md),
                boxShadow: AppColors.ambientShadow,
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: Colors.white, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '【${a['alertLevel'] ?? '预警'}】${a['title'] ?? a['alertType'] ?? '气象预警'}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text('${a['content'] ?? ''}',
                            style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                                height: 1.5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  // ── 火险 / 干旱 指数 ───────────────────────
  Widget _fireCard() {
    final level = _int(_fire['level']);
    final label = '${_fire['label'] ?? '—'}';
    final color = level >= 4
        ? AppColors.error
        : level == 3
            ? AppColors.warning
            : AppColors.primary;
    return _indexCard(
      icon: Icons.local_fire_department,
      iconColor: color,
      title: '火险等级',
      big: level > 0 ? '$level 级' : '—',
      sub: label,
      detail: '${_fire['advice'] ?? ''}\n${_fire['hotline'] ?? ''}',
      sheetTitle: '火险预警',
    );
  }

  Widget _droughtCard() {
    final index = _int(_drought['index']);
    final level = '${_drought['level'] ?? '—'}';
    final color = index >= 60
        ? AppColors.error
        : index >= 40
            ? AppColors.warning
            : AppColors.primary;
    return _indexCard(
      icon: Icons.water_drop_outlined,
      iconColor: color,
      title: '干旱指数',
      big: '$index',
      sub: level,
      detail: '${_drought['advice'] ?? ''}\n${_drought['note'] ?? ''}',
      sheetTitle: '干旱监测指数',
    );
  }

  Widget _indexCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String big,
    required String sub,
    required String detail,
    required String sheetTitle,
  }) {
    return AppCard(
      onTap: () => _infoSheet(sheetTitle, detail),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: iconColor),
              const SizedBox(width: 6),
              Text(title,
                  style: const TextStyle(
                      fontSize: 12,
                      letterSpacing: 0.4,
                      color: AppColors.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 8),
          Text(big,
              style: TextStyle(
                  fontSize: 24, fontWeight: FontWeight.w700, color: iconColor)),
          const SizedBox(height: 2),
          Text(sub,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }

  // ── 冻害防护 ──────────────────────────────
  Widget _frostCard() {
    final measures = (_frost['measures'] as List? ?? []).cast<dynamic>();
    final hasAlert = _frost['hasAlert'] == true;
    return AppCard(
      ai: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.ac_unit, color: AppColors.tertiary, size: 20),
              const SizedBox(width: 8),
              const Text('冻害防护建议',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const Spacer(),
              StatusChip(hasAlert ? '有低温预警' : '暂无预警',
                  color: hasAlert ? AppColors.error : AppColors.primary),
            ],
          ),
          const SizedBox(height: 10),
          for (var i = 0; i < measures.length && i < 5; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('· ',
                      style: TextStyle(
                          color: AppColors.tertiary,
                          fontWeight: FontWeight.w700)),
                  Expanded(
                    child: Text('${measures[i]}',
                        style: const TextStyle(
                            fontSize: 13,
                            height: 1.5,
                            color: AppColors.onSurface)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── 应急预案 ──────────────────────────────
  Widget _guideTile(Map<String, dynamic> g) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        onTap: () => _openGuide(g),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(R.md),
              ),
              child: const Icon(Icons.menu_book,
                  color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${g['title'] ?? '应急预案'}',
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                  Text('${g['disasterType'] ?? ''}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.outline),
          ],
        ),
      ),
    );
  }

  Future<void> _openGuide(Map<String, dynamic> g) async {
    Map<String, dynamic> detail = g;
    if (g['id'] != null) {
      try {
        detail = _m(await ApiClient.get('/disaster/emergency/${g['id']}'));
      } catch (_) {}
    }
    if (!mounted) return;
    final steps = (detail['steps'] as List? ?? []).cast<dynamic>();
    _sheet(
      '${detail['title'] ?? '应急预案'}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ('${detail['content'] ?? ''}'.isNotEmpty)
            Text('${detail['content']}',
                style: const TextStyle(
                    fontSize: 14, height: 1.6, color: AppColors.onSurface)),
          const SizedBox(height: 12),
          for (var i = 0; i < steps.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                        color: AppColors.primary, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Text('${i + 1}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('${steps[i]}',
                        style: const TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            color: AppColors.onSurface)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── 上报 / 理赔 / 求助 入口 ────────────────
  Widget _actionGrid() {
    final items = [
      (Icons.report_problem, '灾情上报', AppColors.error, _reportSheet),
      (Icons.policy, '保险理赔', AppColors.goldContainer, _claimSheet),
      (Icons.sos, '一键求助', AppColors.error, _sosSheet),
      (Icons.history, '我的记录', AppColors.secondary, _myRecords),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.4,
      children: [
        for (final it in items)
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            onTap: it.$4,
            child: Row(
              children: [
                Icon(it.$1, color: it.$3, size: 24),
                const SizedBox(width: 10),
                Text(it.$2,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _reportSheet() async {
    final type = ValueNotifier('暴雨');
    final area = TextEditingController();
    final loss = TextEditingController();
    final desc = TextEditingController();
    final ok = await _formSheet(
      title: '灾情快速上报',
      builder: (setS) => [
        _chips(['暴雨', '冰雹', '干旱', '冻害', '虫灾'], type, setS),
        _field(area, '受灾面积（亩）', number: true),
        _field(loss, '预估损失（元）', number: true),
        _field(desc, '灾情描述', lines: 3),
      ],
    );
    if (ok != true) return;
    final payload = {
      'disasterType': type.value,
      'affectedArea': double.tryParse(area.text) ?? 0,
      'estimatedLoss': double.tryParse(loss.text) ?? 0,
      'description': desc.text.trim(),
    };
    await _submit('/disaster/report', payload, 'disaster_report', '灾情已上报');
  }

  Future<void> _claimSheet() async {
    final type = ValueNotifier('种植险');
    final amount = TextEditingController();
    final ok = await _formSheet(
      title: '保险理赔申请',
      builder: (setS) => [
        _chips(['种植险', '农机险', '养殖险', '大棚险'], type, setS),
        _field(amount, '预估损失金额（元）', number: true),
      ],
    );
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/disaster/claim/assess', body: {
        'claimType': type.value,
        'estimatedAmount': double.tryParse(amount.text) ?? 0,
      }));
      if (!mounted) return;
      _infoSheet('理赔评估结果',
          '受灾等级：${r['aiAssessLevel'] ?? '—'}\n建议理赔：约 ${r['suggestedPayout'] ?? 0} 元\n\n${r['assessDetail'] ?? ''}\n\n${r['insurerContact'] ?? ''}');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('理赔评估', e), error: true);
    }
  }

  Future<void> _sosSheet() async {
    final type = ValueNotifier('灾情');
    final desc = TextEditingController();
    final phone = TextEditingController();
    final ok = await _formSheet(
      title: '一键求助',
      builder: (setS) => [
        _chips(['灾情', '医疗', '火灾', '其他'], type, setS),
        _field(desc, '请简述险情', lines: 2),
        _field(phone, '联系电话', number: true),
      ],
    );
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/disaster/sos', body: {
        'sosType': type.value,
        'description': desc.text.trim(),
        'contactPhone': phone.text.trim(),
      }));
      if (!mounted) return;
      final contacts = (r['contacts'] as List? ?? []).cast<dynamic>();
      _infoSheet('求助已发出',
          '请同时电话联系紧急联系人：\n\n${contacts.map((c) => '${(c as Map)['name']}：${c['phone']}').join('\n')}');
    } catch (_) {
      await OfflineSyncQueue.enqueue(
        tableName: 'sos_record',
        payload: {'sosType': type.value, 'description': desc.text.trim()},
        path: '/disaster/sos',
      );
      if (mounted) toast(context, '求助已加入待发送队列，将自动发出');
    }
  }

  Future<void> _myRecords() async {
    try {
      final reports = _list(await ApiClient.get('/disaster/report/list'));
      final claims = _list(await ApiClient.get('/disaster/claim/list'));
      if (!mounted) return;
      _sheet('我的灾情与理赔',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('灾情上报',
                  style: TextStyle(
                      fontWeight: FontWeight.w700, color: AppColors.primary)),
              const SizedBox(height: 6),
              if (reports.isEmpty)
                const Text('暂无记录',
                    style: TextStyle(color: AppColors.onSurfaceVariant))
              else
                ...reports.map((r) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                          '· ${r['disasterType']} · 受灾${r['affectedArea']}亩 · ${_reportStatusLabel('${r['status'] ?? ''}')}',
                          style: const TextStyle(fontSize: 13)),
                    )),
              const SizedBox(height: 14),
              const Text('保险理赔',
                  style: TextStyle(
                      fontWeight: FontWeight.w700, color: AppColors.primary)),
              const SizedBox(height: 6),
              if (claims.isEmpty)
                const Text('暂无记录',
                    style: TextStyle(color: AppColors.onSurfaceVariant))
              else
                ...claims.map((c) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                          '· ${c['claimType']} · 等级${c['aiAssessLevel']} · ${_claimStatusLabel('${c['status'] ?? ''}')}',
                          style: const TextStyle(fontSize: 13)),
                    )),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('读取记录', e), error: true);
    }
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

  // ── 通用弹层 ──────────────────────────────
  void _infoSheet(String title, String body) => _sheet(title,
      child: Text(body,
          style: const TextStyle(
              fontSize: 14, height: 1.7, color: AppColors.onSurface)));

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

  Future<bool?> _formSheet({
    required String title,
    required List<Widget> Function(void Function(void Function())) builder,
  }) {
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
        child: StatefulBuilder(
          builder: (ctx, setS) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const SizedBox(height: 14),
              ...builder(setS),
              const SizedBox(height: 18),
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

  Widget _chips(List<String> options, ValueNotifier<String> sel,
      void Function(void Function()) setS) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Wrap(
        spacing: 8,
        children: [
          for (final o in options)
            ChoiceChip(
              label: Text(o),
              selected: sel.value == o,
              onSelected: (_) => setS(() => sel.value = o),
            ),
        ],
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

  String _reportStatusLabel(String status) {
    switch (status) {
      case 'REPORTED':
        return '已上报';
      case 'REVIEWING':
        return '处理中';
      case 'PROCESSED':
        return '已处理';
      default:
        return status.isEmpty ? '已上报' : status;
    }
  }

  String _claimStatusLabel(String status) {
    switch (status) {
      case 'SUBMITTED':
        return '已提交';
      case 'ASSESSING':
        return '评估中';
      case 'APPROVED':
        return '已通过';
      case 'REJECTED':
        return '未通过';
      default:
        return status.isEmpty ? '已提交' : status;
    }
  }
}
