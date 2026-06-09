import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../common/info_detail_page.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';
import '../../widgets/section_tool_chips.dart';

/// 乡村生活服务 · 覆盖医疗、便民、就业金融、互助交易、文化环保 12 个模块。
class LifePage extends StatefulWidget {
  const LifePage({super.key});

  @override
  State<LifePage> createState() => _LifePageState();
}

class _LifePageState extends State<LifePage> {
  static const _cacheKey = 'life:service-home';

  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _clinics = [];
  List<Map<String, dynamic>> _expressPoints = [];
  List<Map<String, dynamic>> _tourism = [];
  List<Map<String, dynamic>> _jobs = [];
  List<Map<String, dynamic>> _loanProducts = [];
  List<Map<String, dynamic>> _help = [];
  List<Map<String, dynamic>> _secondhand = [];
  List<Map<String, dynamic>> _folk = [];
  Map<String, dynamic> _elder = {};

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

  Future<dynamic> _safeGet(String path,
      {Map<String, dynamic>? query, List<String>? errors}) async {
    try {
      return await ApiClient.get(path, query: query);
    } catch (_) {
      errors?.add(path);
      return null;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final errors = <String>[];
    final r = await Future.wait<dynamic>([
      _safeGet('/life/clinic/list', errors: errors),
      _safeGet('/life/express/list', errors: errors),
      _safeGet('/life/tourism/list', errors: errors),
      _safeGet('/life/job/list', query: {'pageSize': 6}, errors: errors),
      _safeGet('/life/loan/products', errors: errors),
      _safeGet('/life/help/list', query: {'pageSize': 6}, errors: errors),
      _safeGet('/life/secondhand/list', query: {'pageSize': 6}, errors: errors),
      _safeGet('/life/folk/list', errors: errors),
      _safeGet('/life/elder/services', errors: errors),
    ]);

    final hasAnyLive = r.any((e) => e != null);
    if (!hasAnyLive) {
      final cached = await OfflineCache.readList(_cacheKey);
      if (!mounted) return;
      if (cached.isEmpty) {
        setState(() {
          _loading = false;
          _error = errors.isEmpty ? '暂无生活服务数据' : '服务暂时不可用，请稍后重试';
        });
        return;
      }
      _applyCache(cached.first);
      setState(() {
        _fromCache = true;
        _loading = false;
      });
      return;
    }

    _clinics = _list(r[0]);
    _expressPoints = _list(r[1]);
    _tourism = _list(r[2]);
    _jobs = _records(r[3]);
    _loanProducts = _list(r[4]);
    _help = _records(r[5]);
    _secondhand = _records(r[6]);
    _folk = _list(r[7]);
    _elder = _m(r[8]);

    await OfflineCache.saveList(_cacheKey, [_cachePayload()]);
    if (!mounted) return;
    setState(() {
      _fromCache = false;
      _loading = false;
    });
  }

  Map<String, dynamic> _cachePayload() => {
        'clinics': _clinics,
        'expressPoints': _expressPoints,
        'tourism': _tourism,
        'jobs': _jobs,
        'loanProducts': _loanProducts,
        'help': _help,
        'secondhand': _secondhand,
        'folk': _folk,
        'elder': _elder,
      };

  void _applyCache(Map<String, dynamic> cache) {
    _clinics = _list(cache['clinics']);
    _expressPoints = _list(cache['expressPoints']);
    _tourism = _list(cache['tourism']);
    _jobs = _list(cache['jobs']);
    _loanProducts = _list(cache['loanProducts']);
    _help = _list(cache['help']);
    _secondhand = _list(cache['secondhand']);
    _folk = _list(cache['folk']);
    _elder = _m(cache['elder']);
  }

  String _imageFromJson(Map<String, dynamic> json, String fallback) {
    for (final key in const [
      'coverImage',
      'coverUrl',
      'image',
      'imageUrl',
      'thumbnail',
      'thumbnailUrl',
      'photo',
      'photoUrl',
      'picture',
      'pictureUrl',
    ]) {
      final value = _text(json[key]);
      if (value.isNotEmpty) return value;
    }
    for (final key in const ['images', 'photos']) {
      final value = json[key];
      if (value is List && value.isNotEmpty) {
        final first = value.first;
        final text = first is Map
            ? _text(first['url'] ?? first['imageUrl'])
            : _text(first);
        if (text.isNotEmpty) return text;
      }
    }
    return fallback;
  }

  String _text(dynamic value) {
    final text = '${value ?? ''}'.trim();
    return text == 'null' ? '' : text;
  }

  Widget _lifeImage(String image,
      {required double width,
      required double height,
      IconData icon = Icons.landscape}) {
    final source =
        image.trim().isEmpty ? 'assets/images/_7_1.jpg' : image.trim();
    final fallback = Container(
      width: width,
      height: height,
      color: AppColors.surfaceContainer,
      child: Icon(icon, color: AppColors.primary),
    );
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return Image.network(
        source,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.asset(
      source,
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }

  String _localizedStatus(
      dynamic status, Map<String, String> labels, String fallback) {
    final text = _text(status);
    if (text.isEmpty) return fallback;
    final upper = text.toUpperCase();
    if (labels.containsKey(upper)) return labels[upper]!;
    return RegExp(r'[\u4e00-\u9fa5]').hasMatch(text) ? text : fallback;
  }

  String _helpStatusLabel(dynamic status) => _localizedStatus(
      status,
      const {
        'DONE': '已响应',
        'COMPLETED': '已响应',
        'RESOLVED': '已响应',
        'PENDING': '待响应',
        'WAITING': '待响应',
        'IN_PROGRESS': '进行中',
        'PROCESSING': '进行中',
        'ACTIVE': '进行中',
        'CANCELED': '已关闭',
        'CANCELLED': '已关闭',
        'CLOSED': '已关闭',
      },
      '进行中');

  Color _helpStatusColor(dynamic status) {
    switch (_text(status).toUpperCase()) {
      case 'DONE':
      case 'COMPLETED':
      case 'RESOLVED':
        return AppColors.onSurfaceVariant;
      case 'PENDING':
      case 'WAITING':
        return AppColors.goldContainer;
      case 'CANCELED':
      case 'CANCELLED':
      case 'CLOSED':
        return AppColors.outline;
      default:
        return AppColors.primary;
    }
  }

  String _expressStatusLabel(dynamic status) => _localizedStatus(
      status,
      const {
        'PENDING': '待揽收',
        'WAITING': '待取件',
        'PICKUP': '待取件',
        'ARRIVED': '待取件',
        'IN_TRANSIT': '运输中',
        'TRANSIT': '运输中',
        'SHIPPING': '运输中',
        'DELIVERING': '派送中',
        'SIGNED': '已签收',
        'DELIVERED': '已签收',
        'RECEIVED': '已签收',
        'EXCEPTION': '异常',
        'FAILED': '异常',
      },
      '查询中');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(showBack: true),
      body: _loading
          ? const Loading(text: '正在加载生活服务...')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
                    children: [
                      const SectionToolChips(section: 'life'),
                      const SizedBox(height: 8),
                      if (_fromCache)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: AlertBanner('生活服务数据更新中', critical: false),
                        ),
                      _heroCard(),
                      const SectionTitle('便民服务'),
                      _primaryServiceGrid(),
                      const SectionTitle('就业金融与教育'),
                      _smartToolGrid(),
                      const SectionTitle('附近岗位'),
                      _jobList(),
                      const SectionTitle('乡村旅游'),
                      _tourismList(),
                      const SectionTitle('邻里互助'),
                      _helpList(),
                      const SectionTitle('二手交易'),
                      _secondhandList(),
                      const SectionTitle('民俗文化与环境'),
                      _cultureAndEnv(),
                    ],
                  ),
                ),
    );
  }

  Widget _heroCard() {
    final clinics = _clinics.length;
    final points = _expressPoints.length;
    final jobs = _jobs.length;
    return Container(
      height: 172,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/images/_7_1.jpg',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const ColoredBox(color: AppColors.primaryContainer)),
          const ColoredBox(color: Color(0x991A1C1C)),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('乡村生活服务',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                const Text('医疗、就业、便民、互助一站办理',
                    style: TextStyle(color: Colors.white70, fontSize: 14)),
                const Spacer(),
                Row(
                  children: [
                    _heroMetric('村医点', '$clinics'),
                    const SizedBox(width: 10),
                    _heroMetric('代收点', '$points'),
                    const SizedBox(width: 10),
                    _heroMetric('岗位', '$jobs'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroMetric(String label, String value) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(value,
                style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700)),
            const SizedBox(width: 4),
            Text(label,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 12)),
          ],
        ),
      );

  Widget _primaryServiceGrid() {
    final items = [
      (Icons.local_hospital, '村医问诊', '提交症状给村医', _clinicConsult),
      (Icons.local_shipping, '快递代收', '查件与联系站点', _expressSheet),
      (Icons.payments, '水电缴费', '账单查询与缴费', _utilitySheet),
      (Icons.elderly, '养老关爱', '健康打卡与服务', _elderSheet),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.52,
      ),
      itemBuilder: (_, i) {
        final it = items[i];
        return AppCard(
          onTap: it.$4,
          child: Row(
            children: [
              _iconBox(it.$1, AppColors.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(it.$2,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 4),
                    Text(it.$3,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _smartToolGrid() {
    final tools = [
      (Icons.work, '岗位匹配', _jobMatchSheet),
      (Icons.account_balance_wallet, '贷款预评估', _loanAssessSheet),
      (Icons.school, '教育答疑', _eduAskSheet),
      (Icons.travel_explore, '旅游文案', _tourismPromoteSheet),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: tools.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.85,
      ),
      itemBuilder: (_, i) {
        final t = tools[i];
        return AppCard(
          ai: i < 4,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
          onTap: t.$3,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(t.$1, color: AppColors.tertiary, size: 25),
              const SizedBox(height: 8),
              Text(t.$2,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12, height: 1.2, fontWeight: FontWeight.w600)),
            ],
          ),
        );
      },
    );
  }

  Widget _jobList() {
    if (_jobs.isEmpty) return _flatBox(const Text('暂无附近岗位'));
    return Column(
      children: [
        for (final j in _jobs.take(4))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _flatBox(
              Row(
                children: [
                  _iconBox(Icons.work_outline, AppColors.goldContainer),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${j['title'] ?? '岗位'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 3),
                        Text(
                            '${j['company'] ?? '乡村用工'} · ${j['location'] ?? '本村'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text('${j['salary'] ?? '面议'}',
                      style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 13,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _publishJobSheet,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('发布招工信息'),
          ),
        ),
      ],
    );
  }

  Widget _tourismList() {
    if (_tourism.isEmpty) {
      return _flatBox(
        Row(
          children: [
            _iconBox(Icons.landscape, AppColors.primary),
            const SizedBox(width: 12),
            const Expanded(child: Text('暂无乡村旅游项目')),
            TextButton(
                onPressed: _publishTourismSheet, child: const Text('发布')),
          ],
        ),
      );
    }
    return Column(
      children: [
        for (final t in _tourism.take(3))
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _flatBox(
              padding: const EdgeInsets.all(12),
              onTap: () => _tourismDetail(t),
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(R.md),
                    child: _lifeImage(
                      _imageFromJson(t, 'assets/images/_7_1.jpg'),
                      width: 92,
                      height: 76,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text('${t['name'] ?? '乡村旅游'}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700)),
                            ),
                            const Icon(Icons.star,
                                color: AppColors.gold, size: 16),
                            Text('${t['rating'] ?? '5.0'}',
                                style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Text('${t['address'] ?? t['description'] ?? ''}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _publishTourismSheet,
            icon: const Icon(Icons.add_location_alt, size: 18),
            label: const Text('发布旅游项目'),
          ),
        ),
      ],
    );
  }

  Widget _helpList() {
    if (_help.isEmpty) return _flatBox(const Text('暂无邻里互助信息'));
    return Column(
      children: [
        for (final h in _help.take(3))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _flatBox(
              onTap: () => _helpDetail(h),
              Row(
                children: [
                  _iconBox(Icons.volunteer_activism, AppColors.secondary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${h['title'] ?? '互助'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 3),
                        Text('${h['type'] ?? '求助'} · ${h['content'] ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  StatusChip(_helpStatusLabel(h['status']),
                      color: _helpStatusColor(h['status'])),
                ],
              ),
            ),
          ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _publishHelpSheet,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('发布互助'),
          ),
        ),
      ],
    );
  }

  Widget _secondhandList() {
    if (_secondhand.isEmpty) {
      return _flatBox(
        Row(
          children: [
            _iconBox(Icons.recycling, AppColors.secondary),
            const SizedBox(width: 12),
            const Expanded(child: Text('暂无二手物品')),
            TextButton(
                onPressed: _publishSecondhandSheet, child: const Text('发布')),
          ],
        ),
      );
    }
    return Column(
      children: [
        for (final s in _secondhand.take(3)) _secondhandCard(s),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _publishSecondhandSheet,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('发布二手物品'),
          ),
        ),
      ],
    );
  }

  Widget _secondhandCard(Map<String, dynamic> item) {
    final price = _priceOf(item['price']);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: _flatBox(
        Row(
          children: [
            _iconBox(Icons.inventory_2_outlined, AppColors.secondary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${item['title'] ?? '二手物品'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 3),
                  Text(
                      '${item['category'] ?? '其他'} · ${item['description'] ?? ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            Text(
              price <= 0 ? '免费共享' : '￥${price.toStringAsFixed(2)}',
              style: TextStyle(
                color: price <= 0 ? AppColors.primary : AppColors.error,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  double _priceOf(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse('$value') ?? 0;
  }

  Widget _cultureAndEnv() {
    return Column(
      children: [
        _flatBox(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _iconBox(Icons.theater_comedy, AppColors.goldContainer),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text('民俗文化数字档案',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                  TextButton(
                      onPressed: _publishFolkSheet, child: const Text('记录')),
                ],
              ),
              if (_folk.isNotEmpty) ...[
                const Divider(height: 22),
                for (final f in _folk.take(3))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Text('· ${f['title'] ?? '民俗记录'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14)),
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _envReportSheet,
            icon: const Icon(Icons.report_problem_outlined, size: 19),
            label: const Text('环境问题举报'),
          ),
        ),
      ],
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

  Widget _iconBox(IconData icon, Color color) => Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.13),
          borderRadius: BorderRadius.circular(R.md),
        ),
        child: Icon(icon, color: color, size: 23),
      );

  Future<void> _clinicConsult() async {
    final symptom = TextEditingController();
    final ok = await _formSheet(title: '村医在线问诊', fields: [
      if (_clinics.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: AppCard(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                _iconBox(Icons.local_hospital, AppColors.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${_clinics.first['name'] ?? '村卫生室'} · ${_clinics.first['doctorName'] ?? '村医'}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      _field(symptom, '症状描述', lines: 3),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/clinic/consult',
      {
        'clinicId': _clinics.isNotEmpty ? _clinics.first['id'] : null,
        'symptom': symptom.text.trim(),
      },
      'consultation',
      '问诊已提交',
    );
  }

  Future<void> _expressSheet() async {
    final no = TextEditingController();
    final ok = await _formSheet(title: '快递查询', fields: [
      if (_expressPoints.isNotEmpty)
        _simpleList(
          _expressPoints.take(3).map((p) {
            return '${p['name'] ?? '代收点'} · ${p['address'] ?? ''}';
          }).toList(),
        ),
      _field(no, '快递单号'),
    ]);
    if (ok != true || no.text.trim().isEmpty) return;
    try {
      final r = _m(
          await ApiClient.get('/life/express/query', query: {'no': no.text}));
      final traces = (r['traces'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      if (!mounted) return;
      final statusLabel = _expressStatusLabel(r['status']);
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '快递状态 · $statusLabel',
            sections: [
              InfoSection(
                items: [
                  for (final t in traces) '${(t as Map)['desc']}',
                ],
              ),
              if ('${r['tip'] ?? ''}'.isNotEmpty)
                InfoSection(body: '${r['tip']}'),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('查询', e), error: true);
    }
  }

  Future<void> _utilitySheet() async {
    final type = ValueNotifier('electric');
    final labels = {'electric': '电费', 'water': '水费', 'gas': '燃气费'};
    final ok = await _formSheet(title: '水电气缴费', fields: [
      _chipsField(labels.keys.toList(), type, labels: labels),
    ]);
    if (ok != true) return;
    try {
      final bill = _m(await ApiClient.get('/life/utility/bill',
          query: {'type': type.value}));
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '${bill['typeName'] ?? labels[type.value]}账单',
            body: '账期：${bill['period'] ?? ''}\n'
                '应缴金额：¥${bill['amount'] ?? 0}\n'
                '截止日期：${bill['dueDate'] ?? ''}',
            actionLabel: '确认缴费',
            onAction: () => _payUtility(type.value, bill['amount']),
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('账单读取', e), error: true);
    }
  }

  Future<void> _payUtility(String type, dynamic amount) async {
    try {
      final r = _m(await ApiClient.post('/life/utility/pay',
          body: {'type': type, 'amount': amount}));
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '缴费成功',
            body: '订单号：${r['orderNo'] ?? ''}\n金额：¥${r['amount'] ?? 0}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('缴费', e), error: true);
    }
  }

  Future<void> _elderSheet() async {
    final mood = ValueNotifier('良好');
    final bp = TextEditingController();
    final note = TextEditingController();
    final services = _list(_elder['services']);
    final ok = await _formSheet(title: '养老关爱服务', fields: [
      if (services.isNotEmpty)
        _simpleList(
            services.take(4).map((s) => '${s['name']}：${s['desc']}').toList()),
      _chipsField(['良好', '一般', '不适'], mood),
      _field(bp, '血压（选填，如 128/82）'),
      _field(note, '备注（选填）', lines: 2),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/elder/checkin',
      {'mood': mood.value, 'bloodPressure': bp.text, 'note': note.text},
      'elder_checkin',
      '健康打卡成功',
    );
  }

  Future<void> _jobMatchSheet() async {
    final skills = TextEditingController();
    final ok = await _formSheet(
        title: '岗位智能匹配', fields: [_field(skills, '技能或意向', lines: 2)]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/life/job/match',
          body: {'skills': skills.text.trim()}));
      final matched = _list(r['matched']);
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '岗位匹配结果',
            body: '${r['tip'] ?? ''}'.isNotEmpty ? '${r['tip']}' : null,
            sections: matched.isNotEmpty
                ? [
                    InfoSection(items: [
                      for (final j in matched)
                        '${j['title'] ?? '岗位'} · ${j['salary'] ?? '面议'}',
                    ]),
                  ]
                : null,
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('匹配', e), error: true);
    }
  }

  Future<void> _loanAssessSheet() async {
    if (_loanProducts.isEmpty) {
      toast(context, '暂无贷款产品');
      return;
    }
    final selected = ValueNotifier('${_loanProducts.first['id']}');
    final amount = TextEditingController();
    final purpose = TextEditingController();
    final labels = {
      for (final p in _loanProducts)
        '${p['id']}': '${p['productName'] ?? p['bankName'] ?? '贷款产品'}'
    };
    final ok = await _formSheet(title: '贷款资质预评估', fields: [
      _chipsField(labels.keys.toList(), selected, labels: labels),
      _field(amount, '申请额度（元）', number: true),
      _field(purpose, '贷款用途', lines: 2),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/life/loan/assess', body: {
        'loanProductId': int.tryParse(selected.value),
        'amount': double.tryParse(amount.text) ?? 0,
        'purpose': purpose.text.trim(),
      }));
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '贷款预评估',
            body: '信用评分：${r['aiCreditScore'] ?? '—'}\n'
                '评估结果：${r['aiAssessResult'] ?? ''}\n\n'
                '${r['tip'] ?? ''}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('评估', e), error: true);
    }
  }

  Future<void> _eduAskSheet() async {
    final subject = TextEditingController();
    final grade = TextEditingController();
    final question = TextEditingController();
    final ok = await _formSheet(title: '子女教育辅导', fields: [
      _field(subject, '科目'),
      _field(grade, '年级'),
      _field(question, '问题', lines: 3),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/life/edu/ask', body: {
        'subject': subject.text.trim(),
        'grade': grade.text.trim(),
        'question': question.text.trim(),
      }));
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '教育答疑',
            body: '${r['answer'] ?? ''}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('答疑', e), error: true);
    }
  }

  Future<void> _tourismPromoteSheet() async {
    final name = TextEditingController(
        text: _tourism.isNotEmpty ? '${_tourism.first['name'] ?? ''}' : '');
    final highlights = TextEditingController();
    final ok = await _formSheet(title: '乡村旅游推广文案', fields: [
      _field(name, '景点/农家乐名称'),
      _field(highlights, '亮点（逗号分隔）', lines: 2),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/life/tourism/promote', body: {
        'name': name.text.trim(),
        'highlights': highlights.text
            .split(RegExp(r'[,，、]'))
            .where((e) => e.trim().isNotEmpty)
            .toList(),
      }));
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '旅游推广文案',
            body: '${r['promoText'] ?? ''}\n\n'
                '标签：${(r['tags'] as List? ?? []).join(' · ')}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('生成', e), error: true);
    }
  }

  Future<void> _publishJobSheet() async {
    final title = TextEditingController();
    final company = TextEditingController();
    final salary = TextEditingController();
    final requirement = TextEditingController();
    final ok = await _formSheet(title: '发布招工信息', fields: [
      _field(title, '岗位标题'),
      _field(company, '单位/雇主'),
      _field(salary, '薪资待遇'),
      _field(requirement, '岗位要求', lines: 2),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/job',
      {
        'title': title.text.trim(),
        'company': company.text.trim(),
        'salary': salary.text.trim(),
        'requirement': requirement.text.trim(),
      },
      'job_info',
      '招工信息已发布',
    );
  }

  Future<void> _publishTourismSheet() async {
    final name = TextEditingController();
    final address = TextEditingController();
    final desc = TextEditingController();
    final price = TextEditingController();
    final ok = await _formSheet(title: '发布旅游项目', fields: [
      _field(name, '项目名称'),
      _field(address, '地址'),
      _field(desc, '项目介绍', lines: 2),
      _field(price, '价格（选填）', number: true),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/tourism',
      {
        'name': name.text.trim(),
        'address': address.text.trim(),
        'description': desc.text.trim(),
        'price': double.tryParse(price.text),
      },
      'tourism_spot',
      '旅游项目已发布',
    );
  }

  Future<void> _publishHelpSheet() async {
    final type = ValueNotifier('互助求助');
    final title = TextEditingController();
    final content = TextEditingController();
    final phone = TextEditingController();
    final ok = await _formSheet(title: '发布邻里互助', fields: [
      _chipsField(['互助求助', '招工', '分享见闻', '失物招领'], type),
      _field(title, '标题'),
      _field(content, '详细内容', lines: 3),
      _field(phone, '联系电话（选填）'),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/help',
      {
        'type': type.value,
        'title': title.text.trim(),
        'content': content.text.trim(),
        'contactPhone': phone.text.trim(),
      },
      'help_request',
      '互助信息已发布',
    );
  }

  Future<void> _publishSecondhandSheet() async {
    final title = TextEditingController();
    final category = TextEditingController();
    final price = TextEditingController();
    final desc = TextEditingController();
    final ok = await _formSheet(title: '发布二手物品', fields: [
      _field(title, '物品名称'),
      _field(category, '分类'),
      _field(price, '价格（元）', number: true),
      _field(desc, '说明', lines: 2),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/secondhand',
      {
        'title': title.text.trim(),
        'category': category.text.trim(),
        'price': double.tryParse(price.text) ?? 0,
        'description': desc.text.trim(),
      },
      'secondhand_item',
      '二手物品已发布',
    );
  }

  Future<void> _publishFolkSheet() async {
    final title = TextEditingController();
    final type = TextEditingController(text: '民俗');
    final content = TextEditingController();
    final ok = await _formSheet(title: '记录民俗文化', fields: [
      _field(title, '标题'),
      _field(type, '类型'),
      _field(content, '内容', lines: 3),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/folk',
      {
        'title': title.text.trim(),
        'cultureType': type.text.trim(),
        'content': content.text.trim(),
      },
      'folk_culture',
      '民俗文化记录已保存',
    );
  }

  Future<void> _envReportSheet() async {
    final type = ValueNotifier('垃圾堆放');
    final desc = TextEditingController();
    final ok = await _formSheet(title: '环境问题举报', fields: [
      _chipsField(['垃圾堆放', '污水排放', '异味扰民', '其他'], type),
      _field(desc, '问题描述', lines: 3),
    ]);
    if (ok != true) return;
    await _postWithQueue(
      '/life/env/report',
      {'problemType': type.value, 'description': desc.text.trim()},
      'env_report',
      '举报已提交',
    );
  }

  void _tourismDetail(Map<String, dynamic> t) {
    context.push('/detail/info',
        extra: InfoDetailData(
          title: '${t['name'] ?? '乡村旅游'}',
          body: '类型：${t['spotType'] ?? '乡村游'}\n'
              '地址：${t['address'] ?? ''}\n'
              '价格：¥${t['price'] ?? 0}\n'
              '电话：${t['phone'] ?? ''}\n\n'
              '${t['description'] ?? ''}',
        ));
  }

  void _helpDetail(Map<String, dynamic> h) {
    final content = '${h['content'] ?? ''}';
    final contactPhone = '${h['contactPhone'] ?? ''}';
    final body = [
      if (content.isNotEmpty) content,
      if (contactPhone.isNotEmpty) '联系电话：$contactPhone',
    ].join('\n\n');

    context.push('/detail/info',
        extra: InfoDetailData(
          title: '${h['title'] ?? '邻里互助'}',
          body: body,
          actionLabel: '响应互助',
          onAction: () => _acceptHelp(h),
        ));
  }

  Future<void> _acceptHelp(Map<String, dynamic> h) async {
    try {
      await ApiClient.post('/life/help/${h['id']}/accept');
      if (!mounted) return;
      toast(context, '已响应，请联系对方');
      _load();
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('响应', e), error: true);
    }
  }

  Future<void> _postWithQueue(String path, Map<String, dynamic> payload,
      String tableName, String okMsg) async {
    try {
      await ApiClient.post(path, body: payload);
      if (!mounted) return;
      toast(context, okMsg);
      _load();
    } catch (_) {
      await OfflineSyncQueue.enqueue(
          tableName: tableName, payload: payload, path: path);
      if (mounted) toast(context, '已加入待发送队列，将自动重传');
    }
  }

  Widget _simpleList(List<String> items) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final item in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Text('· $item',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.onSurfaceVariant)),
              ),
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
}
