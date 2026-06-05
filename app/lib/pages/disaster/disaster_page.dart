import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';
import '../common/info_detail_page.dart';
import '../../widgets/section_tool_chips.dart';

/// 气象灾害板块 —— 天气预报式界面。
/// 顶部「天气态势」hero 随当前最高灾情自动变色（暴雨 / 干旱 / 冻害 /
/// 火险 / 平稳），内嵌火险·干旱·冻害三项指数；下方依次为生效预警、
/// 冻害防护、应急预案、上报与求助。8 项功能均接服务端。
class DisasterPage extends StatefulWidget {
  const DisasterPage({super.key});

  @override
  State<DisasterPage> createState() => _DisasterPageState();
}

class _DisasterPageState extends State<DisasterPage>
    with SingleTickerProviderStateMixin {
  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _alerts = [];
  List<Map<String, dynamic>> _guides = [];
  Map<String, dynamic> _fire = {};
  Map<String, dynamic> _drought = {};
  Map<String, dynamic> _frost = {};

  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1600))
      ..repeat(reverse: true);
    _load();
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
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
    final wx = _wx();
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurfaceVariant),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/home'),
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
                    padding: EdgeInsets.zero,
                    children: [
                      const SectionToolChips(section: 'disaster'),
                      const SizedBox(height: 8),
                      if (_fromCache)
                        const AlertBanner('数据更新中，下拉刷新可重试', critical: false),
                      _hero(wx),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_alerts.isNotEmpty) ...[
                              const SectionTitle('生效预警'),
                              ..._alertCards(),
                            ],
                            const SectionTitle('冻害防护'),
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
                    ],
                  ),
                ),
    );
  }

  // ── 天气态势 hero（随最高灾情变色 + 内嵌三指数）──────────
  Widget _hero(_Wx wx) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(22, 18, 22, 22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: wx.sky,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // 背景大图标，营造天气氛围
          Positioned(
            right: -16,
            top: -8,
            child: Icon(wx.icon,
                size: 132, color: Colors.white.withValues(alpha: 0.10)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.place_outlined,
                      size: 15, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text('本地 · ${_today()}',
                      style:
                          const TextStyle(color: Colors.white70, fontSize: 13)),
                  const Spacer(),
                  _heroBadge(wx),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _heroIcon(wx),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(wx.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.2)),
                        const SizedBox(height: 4),
                        Text(wx.sub,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                                height: 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _indexStrip(),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroBadge(_Wx wx) {
    final txt = wx.alerts > 0 ? '${wx.alerts} 条预警生效' : '实时监测';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(wx.alerts > 0 ? Icons.warning_amber_rounded : Icons.sensors,
              size: 13, color: Colors.white),
          const SizedBox(width: 4),
          Text(txt,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _heroIcon(_Wx wx) {
    final pulse = wx.severity >= 3;
    return SizedBox(
      width: 72,
      height: 72,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (pulse)
            AnimatedBuilder(
              animation: _pulse,
              builder: (_, __) {
                final t = _pulse.value;
                return Container(
                  width: 50 + 22 * t,
                  height: 50 + 22 * t,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.22 * (1 - t)),
                  ),
                );
              },
            ),
          Icon(wx.icon, size: 56, color: Colors.white),
        ],
      ),
    );
  }

  /// 三项指数条（火险 / 干旱 / 冻害），半透明白底贴在 hero 渐变上
  Widget _indexStrip() {
    final fireLv = _int(_fire['level']);
    final droughtIdx = _int(_drought['index']);
    final frostAlert = _frost['hasAlert'] == true;
    final measures = (_frost['measures'] as List? ?? []).cast<dynamic>();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            _indexCell(
              icon: Icons.local_fire_department,
              big: fireLv > 0 ? '$fireLv 级' : '—',
              label: '火险等级',
              onTap: () => context.push('/detail/info',
                  extra: InfoDetailData(
                    title: '火险预警',
                    body:
                        '${_fire['advice'] ?? '暂无火险建议'}\n${_fire['hotline'] ?? ''}',
                  )),
            ),
            _cellDivider(),
            _indexCell(
              icon: Icons.water_drop_outlined,
              big: '$droughtIdx',
              label: '干旱指数',
              onTap: () => context.push('/detail/info',
                  extra: InfoDetailData(
                    title: '干旱监测指数',
                    body:
                        '${_drought['advice'] ?? '暂无干旱建议'}\n${_drought['note'] ?? ''}',
                  )),
            ),
            _cellDivider(),
            _indexCell(
              icon: Icons.ac_unit,
              big: frostAlert ? '预警' : '正常',
              label: '冻害风险',
              onTap: () => context.push('/detail/info',
                  extra: InfoDetailData(
                    title: '冻害防护',
                    body: measures.isEmpty
                        ? '当前暂无低温冻害预警。'
                        : measures.map((m) => '· $m').join('\n'),
                  )),
            ),
          ],
        ),
      ),
    );
  }

  Widget _cellDivider() =>
      Container(width: 1, color: Colors.white.withValues(alpha: 0.18));

  Widget _indexCell({
    required IconData icon,
    required String big,
    required String label,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(R.sm),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: Colors.white70),
                const SizedBox(height: 6),
                Text(big,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(label,
                    style:
                        const TextStyle(color: Colors.white70, fontSize: 11)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── 生效预警卡片 ──────────────────────────────
  List<Widget> _alertCards() {
    return [
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
    ];
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
          if (measures.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text('当前低温风险可控，关注后续气温变化即可。',
                  style: TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: AppColors.onSurfaceVariant)),
            )
          else ...[
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
    context.push('/detail/info',
        extra: InfoDetailData(
          title: '${detail['title'] ?? '应急预案'}',
          body: '${detail['content'] ?? ''}'.isNotEmpty
              ? '${detail['content']}'
              : null,
          sections: steps.isNotEmpty
              ? [
                  InfoSection(items: [
                    for (var i = 0; i < steps.length; i++)
                      '${i + 1}. ${steps[i]}',
                  ]),
                ]
              : null,
        ));
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '理赔评估结果',
            body: '受灾等级：${r['aiAssessLevel'] ?? '—'}\n'
                '建议理赔：约 ${r['suggestedPayout'] ?? 0} 元\n\n'
                '${r['assessDetail'] ?? ''}\n\n'
                '${r['insurerContact'] ?? ''}',
          ));
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '求助已发出',
            body: '请同时电话联系紧急联系人：\n\n'
                '${contacts.map((c) => '${(c as Map)['name']}：${c['phone']}').join('\n')}',
          ));
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
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '我的灾情与理赔',
            sections: [
              InfoSection(
                subtitle: '灾情上报',
                items: reports.isEmpty
                    ? ['暂无记录']
                    : [
                        for (final r in reports)
                          '${r['disasterType']} · 受灾${r['affectedArea']}亩 · ${_reportStatusLabel('${r['status'] ?? ''}')}',
                      ],
              ),
              InfoSection(
                subtitle: '保险理赔',
                items: claims.isEmpty
                    ? ['暂无记录']
                    : [
                        for (final c in claims)
                          '${c['claimType']} · 等级${c['aiAssessLevel']} · ${_claimStatusLabel('${c['status'] ?? ''}')}',
                      ],
              ),
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
  Future<bool?> _formSheet({
    required String title,
    required List<Widget> Function(void Function(void Function())) builder,
  }) {
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

  // ── 天气态势推断 ──────────────────────────────
  String _today() {
    final n = DateTime.now();
    const wd = ['一', '二', '三', '四', '五', '六', '日'];
    return '${n.month}月${n.day}日 周${wd[n.weekday - 1]}';
  }

  /// 预警等级 → 排序权重（红 > 橙 > 黄 > 蓝）
  int _alertRank(String level) {
    if (level.contains('红')) return 4;
    if (level.contains('橙')) return 3;
    if (level.contains('黄')) return 2;
    if (level.contains('蓝')) return 1;
    return 3; // 文案未含颜色时，按警告级处理
  }

  /// 灾种关键词 → 条件键（决定图标与渐变）
  String _condKey(String s) {
    if (s.contains('雹')) return 'hail';
    if (s.contains('雨') || s.contains('涝') || s.contains('洪')) return 'rain';
    if (s.contains('旱')) return 'drought';
    if (s.contains('冻') ||
        s.contains('霜') ||
        s.contains('雪') ||
        s.contains('寒') ||
        s.contains('低温')) {
      return 'frost';
    }
    if (s.contains('火')) return 'fire';
    if (s.contains('风') || s.contains('台')) return 'wind';
    if (s.contains('高温') || s.contains('热')) return 'heat';
    return 'rain';
  }

  IconData _condIcon(String k) {
    switch (k) {
      case 'hail':
        return Icons.grain;
      case 'drought':
      case 'heat':
        return Icons.wb_sunny;
      case 'frost':
        return Icons.ac_unit;
      case 'fire':
        return Icons.local_fire_department;
      case 'wind':
        return Icons.air;
      case 'clear':
        return Icons.wb_cloudy;
      default:
        return Icons.thunderstorm; // rain / generic
    }
  }

  List<Color> _condSky(String k) {
    switch (k) {
      case 'hail':
        return const [Color(0xFF566580), Color(0xFF2B3848)];
      case 'drought':
        return const [Color(0xFFC77800), Color(0xFF7A3D00)];
      case 'heat':
        return const [Color(0xFFCE6A1F), Color(0xFF8A3A00)];
      case 'frost':
        return const [Color(0xFF4F74A8), Color(0xFF2A3C5C)];
      case 'fire':
        return const [Color(0xFFC0392B), Color(0xFF6E140C)];
      case 'wind':
        return const [Color(0xFF3E7A6F), Color(0xFF1E3D38)];
      case 'clear':
        return const [Color(0xFF2E7D32), Color(0xFF0D631B)];
      default: // rain / generic
        return const [Color(0xFF40627A), Color(0xFF1F3340)];
    }
  }

  _Wx _wx() {
    final count = _alerts.length;
    Map<String, dynamic>? top;
    int topRank = -1;
    for (final a in _alerts) {
      final r = _alertRank('${a['alertLevel'] ?? ''}');
      if (r > topRank) {
        topRank = r;
        top = a;
      }
    }
    if (top != null) {
      final level = '${top['alertLevel'] ?? '预警'}';
      final type = '${top['alertType'] ?? '气象灾害'}';
      final key = _condKey('$type$level${top['title'] ?? ''}');
      final sev = topRank >= 3 ? 3 : (topRank == 2 ? 2 : 1);
      return _Wx(
        title: '${top['title'] ?? '$type$level预警'}',
        sub: '${top['content'] ?? '请注意防范，关注后续预警更新'}',
        icon: _condIcon(key),
        sky: _condSky(key),
        severity: sev,
        alerts: count,
      );
    }

    final fireLv = _int(_fire['level']);
    final droughtIdx = _int(_drought['index']);
    final frostAlert = _frost['hasAlert'] == true;
    final measures = (_frost['measures'] as List? ?? []).cast<dynamic>();

    if (fireLv >= 4) {
      return _Wx(
          title: '高火险 · $fireLv 级',
          sub: '${_fire['advice'] ?? '严禁野外用火，注意林地防火'}',
          icon: _condIcon('fire'),
          sky: _condSky('fire'),
          severity: 3,
          alerts: 0);
    }
    if (droughtIdx >= 60) {
      return _Wx(
          title: '干旱橙色 · 指数 $droughtIdx',
          sub: '${_drought['advice'] ?? '注意抗旱灌溉与节水'}',
          icon: _condIcon('drought'),
          sky: _condSky('drought'),
          severity: 3,
          alerts: 0);
    }
    if (frostAlert) {
      return _Wx(
          title: '低温冻害预警',
          sub: measures.isNotEmpty ? '${measures.first}' : '做好防冻保温准备',
          icon: _condIcon('frost'),
          sky: _condSky('frost'),
          severity: 2,
          alerts: 0);
    }
    if (fireLv == 3) {
      return _Wx(
          title: '火险偏高 · 3 级',
          sub: '${_fire['advice'] ?? '谨慎用火'}',
          icon: _condIcon('fire'),
          sky: _condSky('fire'),
          severity: 2,
          alerts: 0);
    }
    if (droughtIdx >= 40) {
      return _Wx(
          title: '轻度干旱 · 指数 $droughtIdx',
          sub: '${_drought['advice'] ?? '关注田间墒情'}',
          icon: _condIcon('drought'),
          sky: _condSky('drought'),
          severity: 1,
          alerts: 0);
    }
    return _Wx(
        title: '天气平稳',
        sub: '各项气象指数正常，暂无灾害预警',
        icon: _condIcon('clear'),
        sky: _condSky('clear'),
        severity: 0,
        alerts: 0);
  }
}

/// 天气态势数据（驱动 hero 的标题 / 渐变 / 图标 / 脉冲）
class _Wx {
  final String title;
  final String sub;
  final IconData icon;
  final List<Color> sky;
  final int severity; // 0 平稳 · 1 提示 · 2 警告 · 3 严重（脉冲）
  final int alerts;
  const _Wx({
    required this.title,
    required this.sub,
    required this.icon,
    required this.sky,
    required this.severity,
    required this.alerts,
  });
}
