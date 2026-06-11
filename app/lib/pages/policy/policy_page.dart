import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';
import '../../widgets/section_tool_chips.dart';
import '../common/info_detail_page.dart';

/// 惠农政策 · 党建学习 · 文明乡风 —— 三个 tab 全部接入服务端
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
  static const _policyFallbackImage =
      'assets/images/generated/policy-support.jpg';
  static const _partyFallbackImage =
      'assets/images/generated/community-learning.jpg';
  static const _honorFallbackImage =
      'assets/images/generated/village-honor.jpg';

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
        _error[tab] = cached.isEmpty ? '服务暂时不可用，请稍后重试' : null;
        _loading[tab] = false;
      });
    }
  }

  /// 三个 tab 各自请求不同服务端接口
  Future<List<_PolicyItem>> _fetch(int tab) async {
    if (tab == 0) {
      final data = await ApiClient.get('/policy/list', query: {'pageSize': 20});
      final records = (data['records'] as List? ?? []);
      return [for (final record in records) _policyItem(_castMap(record))];
    }
    if (tab == 1) {
      final data = await ApiClient.get('/party/lesson/list');
      final list = (data as List? ?? []);
      return [for (final item in list) _partyItem(_castMap(item))];
    }
    final data = await ApiClient.get('/village/honor');
    final list = (data as List? ?? []);
    return [for (final item in list) _honorItem(_castMap(item))];
  }

  Map<String, dynamic> _castMap(dynamic v) =>
      v is Map ? v.cast<String, dynamic>() : <String, dynamic>{};

  _PolicyItem _policyItem(Map<String, dynamic> j) {
    final category = '${j['category'] ?? '政策解读'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: 'policy',
      image: _imageFromJson(j, _policyFallbackImage),
      title: '${j['title'] ?? '惠农政策'}',
      summary: '${j['summary'] ?? j['publishOrg'] ?? '政策服务'}',
      body: '${j['summary'] ?? ''}',
      time: _ymd(j['createdAt']),
      tag: category,
      tagColor: _tagColor(category),
    );
  }

  _PolicyItem _partyItem(Map<String, dynamic> j) {
    final type = '${j['type'] ?? '党建学习'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: 'party',
      image: _imageFromJson(j, _partyFallbackImage),
      title: '${j['title'] ?? '党建学习'}',
      summary: '完成学习可得 ${j['pointsReward'] ?? 0} 积分'
          '${j['learned'] == true ? ' · 已学习' : ''}',
      body: '${j['content'] ?? ''}',
      time: _ymd(j['publishDate']),
      tag: type,
      tagColor: AppColors.primaryContainer,
    );
  }

  _PolicyItem _honorItem(Map<String, dynamic> j) {
    final type = '${j['honorType'] ?? '文明乡风'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: 'honor',
      image: _imageFromJson(j, _honorFallbackImage),
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
        'image': e.image,
      };

  _PolicyItem _fromCacheItem(Map<String, dynamic> j, int i) {
    final source = '${j['source'] ?? 'policy'}';
    return _PolicyItem(
      id: j['id'] as int?,
      source: source,
      image: _text(j['image']).isNotEmpty
          ? _text(j['image'])
          : _fallbackImageForSource(source),
      title: '${j['title'] ?? ''}',
      summary: '${j['summary'] ?? ''}',
      body: '${j['body'] ?? ''}',
      time: '${j['time'] ?? ''}',
      tag: '${j['tag'] ?? '政策'}',
      tagColor: _tagColor('${j['tag'] ?? ''}'),
    );
  }

  String _imageFromJson(Map<String, dynamic> json, String fallback) {
    for (final key in const [
      'coverImage',
      'coverUrl',
      'image',
      'imageUrl',
      'thumbnail',
      'thumbnailUrl',
      'picUrl',
      'banner',
      'photo',
      'photoUrl',
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

  String _fallbackImageForSource(String source) {
    switch (source) {
      case 'party':
        return _partyFallbackImage;
      case 'honor':
        return _honorFallbackImage;
      default:
        return _policyFallbackImage;
    }
  }

  String _text(dynamic value) =>
      '$value'.trim() == 'null' ? '' : '$value'.trim();

  @override
  Widget build(BuildContext context) {
    final list = _data[_active] ?? [];
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(showBack: true, actions: [
        IconButton(
          tooltip: '政策服务',
          onPressed: () => context.push('/policy/service'),
          icon: const Icon(Icons.dashboard_customize_outlined,
              color: AppColors.onSurfaceVariant),
        ),
      ]),
      body: Column(
        children: [
          const SectionToolChips(section: 'policy'),
          const SizedBox(height: 8),
          _tabsBar(),
          if (_fromCache[_active])
            const AlertBanner('数据更新中，下拉刷新可重试', critical: false),
          Expanded(
            child: _loading[_active]
                ? const Loading(text: '正在加载政策服务...')
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
    return _flatBox(
      onTap: () => _openDetail(context, item),
      padding: const EdgeInsets.all(14),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(R.md),
            child: _itemImage(item),
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
                    const SizedBox(width: 8),
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
        if (context.mounted) {
          toast(context, actionErrorMessage('政策详情读取', e), error: true);
        }
        return;
      }
    }
    if (!context.mounted) return;

    final sections = <InfoSection>[
      InfoSection(items: ['分类：$category']),
    ];
    if (guide != null && guide.isNotEmpty) {
      sections.add(InfoSection(
        subtitle: '申请指引',
        body: guide,
      ));
    }

    context.push('/detail/info',
        extra: InfoDetailData(
          title: title,
          body: body.isEmpty ? '暂无更多内容' : body,
          sections: sections,
        ));
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

  Widget _tag(String text, Color color) => Container(
        constraints: const BoxConstraints(maxWidth: 132),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
        ),
      );

  Widget _itemImage(_PolicyItem item) {
    final image = item.image.trim().isEmpty
        ? _fallbackImageForSource(item.source)
        : item.image.trim();
    final fallback = Container(
      width: 104,
      height: 104,
      color: AppColors.surfaceContainer,
      child:
          const Icon(Icons.account_balance, color: AppColors.primary, size: 34),
    );
    if (image.startsWith('http://') ||
        image.startsWith('https://') ||
        image.startsWith('/')) {
      return Image.network(
        ApiClient.resolveImageUrl(image),
        width: 104,
        height: 104,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return SiteImage(
      image,
      width: 104,
      height: 104,
      fit: BoxFit.cover,
      errorFallback: fallback,
    );
  }
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
