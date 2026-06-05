import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../common/info_detail_page.dart';
import '../../widgets/common.dart';

/// 惠农政策服务 —— 补贴申请/政策问答/法律咨询/积分兑换/
/// 村务公开/职业培训/人才库（7 项均接服务端）
class PolicyServicePage extends StatefulWidget {
  const PolicyServicePage({super.key});

  @override
  State<PolicyServicePage> createState() => _PolicyServicePageState();
}

class _PolicyServicePageState extends State<PolicyServicePage> {
  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _policies = [];
  List<Map<String, dynamic>> _subsidies = [];
  List<Map<String, dynamic>> _rank = [];
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _affairs = [];
  List<Map<String, dynamic>> _courses = [];
  List<Map<String, dynamic>> _talents = [];
  Map<String, dynamic>? _me;

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

  List<Map<String, dynamic>> _records(dynamic v) => _list(_m(v)['records']);

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await Future.wait<dynamic>([
        ApiClient.get('/policy/list', query: {'pageSize': 30}),
        ApiClient.get('/policy/subsidy/list'),
        ApiClient.get('/policy/points/rank'),
        ApiClient.get('/policy/points/items'),
        ApiClient.get('/village/affairs', query: {'pageSize': 8}),
        ApiClient.get('/training/course/list'),
        ApiClient.get('/talent/list'),
      ]);
      if (!mounted) return;
      final rankData = _m(r[2]);
      _policies = _records(r[0]);
      _subsidies = _list(r[1]);
      _rank = _list(rankData['rank']);
      _me = _m(rankData['me']);
      _items = _list(r[3]);
      _affairs = _records(r[4]);
      _courses = _list(r[5]);
      _talents = _list(r[6]);
      await OfflineCache.saveList('policy:service:policies', _policies);
      await OfflineCache.saveList('policy:service:subsidies', _subsidies);
      await OfflineCache.saveList('policy:service:rank', [
        {'rank': _rank, 'me': _me}
      ]);
      await OfflineCache.saveList('policy:service:items', _items);
      await OfflineCache.saveList('policy:service:affairs', _affairs);
      await OfflineCache.saveList('policy:service:courses', _courses);
      await OfflineCache.saveList('policy:service:talents', _talents);
      setState(() {
        _fromCache = false;
        _loading = false;
      });
    } catch (e) {
      _policies = await OfflineCache.readList('policy:service:policies');
      _subsidies = await OfflineCache.readList('policy:service:subsidies');
      final rankCache = await OfflineCache.readList('policy:service:rank');
      _rank = rankCache.isEmpty ? [] : _list(rankCache.first['rank']);
      _me = rankCache.isEmpty ? null : _m(rankCache.first['me']);
      _items = await OfflineCache.readList('policy:service:items');
      _affairs = await OfflineCache.readList('policy:service:affairs');
      _courses = await OfflineCache.readList('policy:service:courses');
      _talents = await OfflineCache.readList('policy:service:talents');
      if (!mounted) return;
      final hasCache = [
        _policies,
        _subsidies,
        _rank,
        _items,
        _affairs,
        _courses,
        _talents,
      ].any((list) => list.isNotEmpty);
      setState(() {
        _fromCache = hasCache;
        _error = hasCache ? null : '服务暂时不可用，请稍后重试';
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
              context.canPop() ? context.pop() : context.go('/policy'),
        ),
        title: const Text('政策服务',
            style: TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: _loading
          ? const Loading(text: '正在加载政策服务...')
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
                      const SectionTitle('补贴与问答'),
                      _toolRow([
                        (Icons.fact_check, '补贴申请', _subsidySheet),
                        (Icons.psychology_alt, '政策问答', _policyAskSheet),
                        (Icons.balance, '法律咨询', _legalAskSheet),
                      ]),
                      const SectionTitle('我的补贴'),
                      _subsidyList(),
                      const SectionTitle('振兴积分'),
                      _pointsCard(),
                      const SectionTitle('村务公开'),
                      _affairList(),
                      const SectionTitle('职业农民培训'),
                      _courseList(),
                      SectionTitle('乡村人才库',
                          trailing: TextButton.icon(
                            onPressed: _talentSheet,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('入库'),
                          )),
                      _talentList(),
                    ],
                  ),
                ),
    );
  }

  Widget _subsidyList() {
    if (_subsidies.isEmpty) return const AppCard(child: Text('暂无补贴申请记录'));
    return Column(
      children: [
        for (final s in _subsidies.take(3))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Row(
                children: [
                  const Icon(Icons.assignment_turned_in,
                      color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${_m(s['policy'])['title'] ?? '补贴申请'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text(
                            '状态：${_subsidyStatusLabel('${s['status'] ?? ''}')}',
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  StatusChip('${_m(s['policy'])['category'] ?? '补贴'}'),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _pointsCard() {
    final me = _me;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.goldContainer.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child:
                    const Icon(Icons.emoji_events, color: AppColors.tertiary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('我的积分 ${me?['points'] ?? 0}',
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    Text('村内排名 ${me?['rank'] ?? '-'}',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              OutlinedButton(
                  onPressed: _exchangeSheet, child: const Text('兑换')),
            ],
          ),
          const SizedBox(height: 14),
          for (final u in _rank.take(3))
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  StatusChip('第${u['rank']}名',
                      color: (u['rank'] == 1)
                          ? AppColors.goldContainer
                          : AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(child: Text('${u['nickname'] ?? '农户'}')),
                  Text('${u['points'] ?? 0} 分',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _affairList() {
    if (_affairs.isEmpty) return const AppCard(child: Text('暂无村务公开'));
    return Column(
      children: [
        for (final a in _affairs.take(4))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              onTap: () => context.push('/detail/info',
                  extra: InfoDetailData(
                    title: '${a['title'] ?? '村务公开'}',
                    body: '${a['content'] ?? '暂无详情'}',
                  )),
              child: Row(
                children: [
                  const Icon(Icons.campaign, color: AppColors.secondary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${a['title'] ?? '村务公开'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text('${a['publishOrg'] ?? a['category'] ?? ''}',
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  StatusChip('${a['category'] ?? '公开'}',
                      color: AppColors.secondary),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _courseList() {
    if (_courses.isEmpty) return const AppCard(child: Text('暂无培训课程'));
    return Column(
      children: [
        for (final c in _courses.take(4))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text('${c['title'] ?? '培训课程'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                      StatusChip('${c['category'] ?? '培训'}',
                          color: AppColors.primaryContainer),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                      '${c['instructor'] ?? '讲师'} · ${c['durationMin'] ?? 0} 分钟 · 已报名 ${c['enrollCount'] ?? 0}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _courseDetail(c),
                          icon: const Icon(Icons.menu_book, size: 18),
                          label: const Text('详情'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _enrollCourse(c),
                          child: const Text('报名'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _talentList() {
    if (_talents.isEmpty) return const AppCard(child: Text('暂无人才档案'));
    return Column(
      children: [
        for (final t in _talents.take(4))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 23,
                    backgroundColor:
                        AppColors.primaryContainer.withValues(alpha: 0.14),
                    child: Text('${t['name'] ?? '才'}'.characters.first,
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${t['name'] ?? '乡村人才'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text('${t['skills'] ?? t['description'] ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  StatusChip('${t['talentType'] ?? '人才'}',
                      color: AppColors.goldContainer),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _subsidySheet() async {
    if (_policies.isEmpty) {
      toast(context, '暂无可申请政策', error: true);
      return;
    }
    final selected = ValueNotifier('${_policies.first['id']}');
    final material = TextEditingController();
    final ok = await _formSheet(title: '补贴申请引导', fields: [
      _chipsField(
        [for (final p in _policies.take(5)) '${p['id']}'],
        selected,
        labels: {
          for (final p in _policies.take(5)) '${p['id']}': '${p['category']}'
        },
      ),
      _field(material, '材料说明（如 身份证、土地承包证）', lines: 2),
    ]);
    if (ok != true) return;
    await _submit(
        '/policy/subsidy/apply',
        {
          'policyId': int.tryParse(selected.value),
          'materials': [
            {'name': '材料说明', 'content': material.text.trim()}
          ],
        },
        'subsidy_application',
        '补贴申请已提交');
  }

  Future<void> _policyAskSheet() => _askSheet(
        title: '政策 AI 问答',
        path: '/policy/ai/ask',
        label: '请输入政策问题',
      );

  Future<void> _legalAskSheet() => _askSheet(
        title: '法律援助咨询',
        path: '/policy/legal/ask',
        label: '请输入土地、劳务、农资等法律问题',
      );

  Future<void> _askSheet({
    required String title,
    required String path,
    required String label,
  }) async {
    final question = TextEditingController();
    final ok = await _formSheet(
      title: title,
      fields: [_field(question, label, lines: 3)],
    );
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post(path, body: {
        'question': question.text.trim(),
      }));
      if (!mounted) return;
      final refs = _list(r['references']);
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: title,
            body: '${r['answer'] ?? ''}',
            sections: refs.isNotEmpty
                ? [
                    InfoSection(
                      subtitle: '参考来源',
                      items: [
                        for (final ref in refs.take(3))
                          '${ref['title'] ?? ref['policyTitle'] ?? '政策知识库'}',
                      ],
                    ),
                  ]
                : null,
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('问答', e), error: true);
    }
  }

  Future<void> _exchangeSheet() async {
    if (_items.isEmpty) {
      toast(context, '暂无可兑换物品');
      return;
    }
    _sheet('积分兑换',
        child: Column(
          children: [
            for (final item in _items)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: AppCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('${item['name']}',
                            style:
                                const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                      Text('${item['cost']} 分',
                          style: const TextStyle(
                              color: AppColors.onSurfaceVariant)),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          _exchangeItem(item);
                        },
                        child: const Text('兑换'),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ));
  }

  Future<void> _exchangeItem(Map<String, dynamic> item) async {
    try {
      final r = _m(await ApiClient.post('/policy/points/exchange',
          body: {'itemId': item['id']}));
      if (!mounted) return;
      toast(context, '兑换成功，剩余 ${r['remainPoints']} 分');
      _load();
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('兑换', e), error: true);
    }
  }

  Future<void> _courseDetail(Map<String, dynamic> course) async {
    try {
      final r = _m(await ApiClient.get('/training/course/${course['id']}'));
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '${r['title'] ?? '培训课程'}',
            body: '${r['content'] ?? '暂无课程介绍'}\n\n'
                '证书：${r['certName'] ?? '结业证书'}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('读取', e), error: true);
    }
  }

  Future<void> _enrollCourse(Map<String, dynamic> course) async {
    try {
      await ApiClient.post('/training/course/${course['id']}/enroll');
      if (mounted) toast(context, '报名成功');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('报名', e), error: true);
    }
  }

  Future<void> _talentSheet() async {
    final name = TextEditingController();
    final skills = TextEditingController();
    final desc = TextEditingController();
    final phone = TextEditingController();
    final type = ValueNotifier('致富带头人');
    final ok = await _formSheet(title: '乡村人才入库', fields: [
      _chipsField(['致富带头人', '乡村工匠', '农技能人', '返乡创业'], type),
      _field(name, '姓名'),
      _field(skills, '技能特长'),
      _field(phone, '联系电话（选填）', number: true),
      _field(desc, '个人介绍', lines: 2),
    ]);
    if (ok != true) return;
    await _submit(
        '/talent',
        {
          'name': name.text.trim(),
          'talentType': type.value,
          'skills': skills.text.trim(),
          'contactPhone': phone.text.trim(),
          'description': desc.text.trim(),
        },
        'talent_profile',
        '人才档案已入库');
  }

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

  String _subsidyStatusLabel(String status) {
    switch (status) {
      case 'SUBMITTED':
        return '已提交';
      case 'REVIEWING':
        return '审核中';
      case 'APPROVED':
        return '已通过';
      case 'REJECTED':
        return '未通过';
      default:
        return status.isEmpty ? '已提交' : status;
    }
  }
}
