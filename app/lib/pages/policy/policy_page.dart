import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';

/// 惠农政策 · 党建学习 · 文明乡风 —— 三个 tab 全部接入后端
class PolicyPage extends StatefulWidget {
  const PolicyPage({super.key});

  @override
  State<PolicyPage> createState() => _PolicyPageState();
}

class _PolicyItem {
  final int? id;
  final String source; // policy / party / honor
  final String image;
  final String title;
  final String summary;
  final String body;
  final String time;
  final String tag;
  final Color tagColor;

  const _PolicyItem({
    this.id,
    required this.source,
    required this.image,
    required this.title,
    required this.summary,
    required this.body,
    required this.time,
    required this.tag,
    required this.tagColor,
  });
}

class _PolicyPageState extends State<PolicyPage> {
  static const _tabs = ['惠农政策', '党建学习', '文明乡风'];
  static const _images = ['_3_1.jpg', '_3_2.jpg', '_3_3.jpg'];

  var _active = 0;
  final _loading = [true, true, true];
  final _error = <int, String?>{0: null, 1: null, 2: null};
  final _fromCache = [false, false, false];
  final _data = <int, List<_PolicyItem>>{0: [], 1: [], 2: []};

  @override
  void initState() {
    super.initState();
    _loadTab(0);
    _loadTab(1);
    _loadTab(2);
  }

  Future<void> _loadTab(int tab) async {
    setState(() {
      _loading[tab] = true;
      _error[tab] = null;
    });
    try {
      final items = await _fetch(tab);
      await OfflineCache.saveList(
          'policy:tab$tab', items.map((e) => _toCache(e)).toList());
      if (!mounted) return;
      setState(() {
        _data[tab] = items;
        _fromCache[tab] = false;
        _loading[tab] = false;
      });
    } catch (e) {
      final cached = await OfflineCache.readList('policy:tab$tab');
      if (!mounted) return;
      setState(() {
        _data[tab] = [
          for (var i = 0; i < cached.length; i++) _fromCacheItem(cached[i], i)
        ];
        _fromCache[tab] = cached.isNotEmpty;
        _error[tab] = cached.isEmpty ? '后端连接失败：$e' : null;
        _loading[tab] = false;
      });
    }
  }

  /// 三个 tab 各自请求不同后端接口
  Future<List<_PolicyItem>> _fetch(int tab) async {
    if (tab == 0) {
      final data = await ApiClient.get('/policy/list', query: {'pageSize': 20});
      final records = (data['records'] as List? ?? []);
      return [
        for (var i = 0; i < records.length; i++)
          _policyItem(_castMap(records[i]), i)
      ];
    }
    if (tab == 1) {
      final data = await ApiClient.get('/party/lesson/list');
      final list = (data as List? ?? []);
      return [
        for (var i = 0; i < list.length; i++) _partyItem(_castMap(list[i]), i)
      ];
    }
    final data = await ApiClient.get('/village/honor');
    final list = (data as List? ?? []);
    return [
      for (var i = 0; i < list.length; i++) _honorItem(_castMap(list[i]), i)
    ];
  }

  Map<String, dynamic> _castMap(dynamic v) =>
      v is Map ? v.cast<String, dynamic>() : <String, dynamic>{};

  _PolicyItem _policyItem(Map<String, dynamic> j, int i) {
    final category = '${j['category'] ?? '政策解读'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: 'policy',
      image: 'assets/images/${_images[i % 3]}',
      title: '${j['title'] ?? '惠农政策'}',
      summary: '${j['summary'] ?? j['publishOrg'] ?? '本地政策服务'}',
      body: '${j['summary'] ?? ''}',
      time: _ymd(j['createdAt']),
      tag: category,
      tagColor: _tagColor(category),
    );
  }

  _PolicyItem _partyItem(Map<String, dynamic> j, int i) {
    final type = '${j['type'] ?? '党建学习'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: 'party',
      image: 'assets/images/${_images[i % 3]}',
      title: '${j['title'] ?? '党建学习'}',
      summary: '完成学习可得 ${j['pointsReward'] ?? 0} 积分'
          '${j['learned'] == true ? ' · 已学习' : ''}',
      body: '${j['content'] ?? ''}',
      time: _ymd(j['publishDate']),
      tag: type,
      tagColor: AppColors.primaryContainer,
    );
  }

  _PolicyItem _honorItem(Map<String, dynamic> j, int i) {
    final type = '${j['honorType'] ?? '文明乡风'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: 'honor',
      image: 'assets/images/${_images[i % 3]}',
      title: '${j['honoreeName'] ?? '身边榜样'} · $type',
      summary: '${j['deed'] ?? '乡风文明事迹'}',
      body: '${j['deed'] ?? ''}',
      time: '获赞 ${j['votes'] ?? 0}',
      tag: type,
      tagColor: AppColors.goldContainer,
    );
  }

  Map<String, dynamic> _toCache(_PolicyItem e) => {
        'id': e.id,
        'source': e.source,
        'title': e.title,
        'summary': e.summary,
        'body': e.body,
        'time': e.time,
        'tag': e.tag,
      };

  _PolicyItem _fromCacheItem(Map<String, dynamic> j, int i) => _PolicyItem(
        id: j['id'] as int?,
        source: '${j['source'] ?? 'policy'}',
        image: 'assets/images/${_images[i % 3]}',
        title: '${j['title'] ?? ''}',
        summary: '${j['summary'] ?? ''}',
        body: '${j['body'] ?? ''}',
        time: '${j['time'] ?? ''}',
        tag: '${j['tag'] ?? '政策'}',
        tagColor: _tagColor('${j['tag'] ?? ''}'),
      );

  @override
  Widget build(BuildContext context) {
    final list = _data[_active] ?? [];
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(actions: [
        IconButton(
          tooltip: '政策服务',
          onPressed: () => context.go('/policy/service'),
          icon: const Icon(Icons.dashboard_customize_outlined,
              color: AppColors.onSurfaceVariant),
        ),
      ]),
      body: Column(
        children: [
          _tabsBar(),
          if (_fromCache[_active])
            const AlertBanner('当前内容来自离线缓存，请检查后端连接', critical: false),
          Expanded(
            child: _loading[_active]
                ? const Loading(text: '正在从后端同步...')
                : _error[_active] != null
                    ? ErrorRetry(
                        message: _error[_active]!,
                        onRetry: () => _loadTab(_active))
                    : list.isEmpty
                        ? const EmptyView('暂无内容')
                        : RefreshIndicator(
                            color: AppColors.primary,
                            onRefresh: () => _loadTab(_active),
                            child: ListView.separated(
                              padding:
                                  const EdgeInsets.fromLTRB(20, 24, 20, 32),
                              itemCount: list.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 16),
                              itemBuilder: (_, i) => _card(context, list[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _tabsBar() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Row(
        children: [
          for (var i = 0; i < _tabs.length; i++)
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _active = i),
                borderRadius: BorderRadius.circular(R.sm),
                child: Column(
                  children: [
                    Text(
                      _tabs[i],
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: _active == i
                            ? AppColors.primary
                            : AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 14),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      height: 3,
                      decoration: BoxDecoration(
                        color: _active == i
                            ? AppColors.primary
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, _PolicyItem item) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => _openDetail(context, item),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(R.md),
            child: Image.asset(
              item.image,
              width: 104,
              height: 104,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 104,
                height: 104,
                color: AppColors.surfaceContainer,
                child: const Icon(Icons.account_balance,
                    color: AppColors.primary, size: 34),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 19,
                    height: 1.25,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item.summary,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.time,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.outline,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    _tag(item.tag, item.tagColor),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openDetail(BuildContext context, _PolicyItem item) async {
    var body = item.body;
    var title = item.title;
    var category = item.tag;
    String? guide;

    // 惠农政策可拉详情接口
    if (item.source == 'policy' && item.id != null) {
      try {
        final detail =
            await ApiClient.get('/policy/${item.id}') as Map<String, dynamic>;
        title = '${detail['title'] ?? title}';
        body = '${detail['content'] ?? detail['summary'] ?? body}';
        category = '${detail['category'] ?? category}';
        guide = detail['applyGuide'] as String?;
      } catch (e) {
        if (context.mounted) toast(context, '政策详情读取失败：$e', error: true);
        return;
      }
    }
    if (!context.mounted) return;

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
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            _tag(category, item.tagColor),
            const SizedBox(height: 12),
            Text(title,
                style: const TextStyle(
                    fontSize: 22,
                    height: 1.25,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface)),
            const SizedBox(height: 12),
            Text(body.isEmpty ? '暂无更多内容' : body,
                style: const TextStyle(
                    fontSize: 15, height: 1.7, color: AppColors.onSurface)),
            if (guide != null && guide.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('申请指引',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary)),
              const SizedBox(height: 6),
              Text(guide,
                  style: const TextStyle(
                      fontSize: 14,
                      height: 1.6,
                      color: AppColors.onSurfaceVariant)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _tag(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          style: const TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
        ),
      );
}

Color _tagColor(String category) {
  if (category.contains('金融') || category.contains('补贴')) {
    return AppColors.primaryContainer;
  }
  if (category.contains('农机') || category.contains('春耕')) {
    return AppColors.goldContainer;
  }
  if (category.contains('党')) return AppColors.error;
  return AppColors.secondary;
}

String _ymd(dynamic value) {
  final text = '$value';
  if (text.length >= 10) return text.substring(0, 10);
  return '近期';
}
