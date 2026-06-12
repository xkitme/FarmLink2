import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/feature_catalog.dart';
import '../../widgets/common.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  static const _hotWords = ['补贴', '行情', '病虫害', '农机', '天气'];
  static const _voiceDialects = ['普通话', '四川话', '客家话', '粤语'];

  final _ctrl = TextEditingController();
  final _focus = FocusNode();
  String _query = '';
  bool _loading = false;
  Map<String, dynamic> _content = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  List<FeatureItem> get _featureHits {
    if (_query.isEmpty) return const [];
    final q = _query.toLowerCase();
    return kFeatureCatalog
        .where((feature) {
          final name = feature.name.toLowerCase();
          return name.contains(q) ||
              feature.keywords.any((keyword) {
                final key = keyword.toLowerCase();
                return key.contains(q) || q.contains(key);
              });
        })
        .take(8)
        .toList();
  }

  bool get _contentEmpty {
    const keys = ['policy', 'disease', 'product', 'job', 'course'];
    return keys.every((key) => _list(_content[key]).isEmpty);
  }

  Future<void> _searchContent() async {
    final q = _ctrl.text.trim();
    if (q.isEmpty) return;
    setState(() {
      _query = q;
      _content = {};
      _loading = true;
    });
    try {
      final data = await ApiClient.get('/search', query: {'keyword': q});
      if (!mounted) return;
      setState(() {
        _content = data is Map
            ? data.map((key, value) => MapEntry('$key', value))
            : <String, dynamic>{};
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _content = {};
        _loading = false;
      });
    }
  }

  void _clear() {
    _ctrl.clear();
    setState(() {
      _query = '';
      _content = {};
      _loading = false;
    });
  }

  void _useHotWord(String word) {
    _ctrl.text = word;
    setState(() => _query = word);
    _searchContent();
  }

  Future<void> _listenAndSearch() async {
    final transcript = await _recognizeVoice();
    if (transcript == null || !mounted) return;
    _ctrl.text = transcript;
    _ctrl.selection = TextSelection.collapsed(offset: _ctrl.text.length);
    setState(() => _query = transcript);
    await _searchContent();
  }

  Future<String?> _recognizeVoice() async {
    final dialect = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.sm)),
      ),
      builder: (sheetCtx) {
        var selectedDialect = _voiceDialects.first;
        return StatefulBuilder(
          builder: (ctx, setSheet) => Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final dialect in _voiceDialects)
                      ChoiceChip(
                        label: Text(dialect),
                        selected: selectedDialect == dialect,
                        onSelected: (_) =>
                            setSheet(() => selectedDialect = dialect),
                      ),
                  ],
                ),
                const SizedBox(height: 22),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const _VoicePulseIcon(),
                      const SizedBox(height: 16),
                      Text(
                        '正在以$selectedDialect聆听...',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        '语音将转换为搜索文字',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              Navigator.pop(sheetCtx, selectedDialect),
                          icon:
                              const Icon(Icons.stop_circle_outlined, size: 18),
                          label: const Text('松开/点击结束'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (dialect == null || !mounted) return null;
    try {
      final data = await ApiClient.post('/ai/voice/recognize', body: {
        'text': '',
        'scene': 'search',
        'dialect': dialect,
      });
      final transcript =
          data is Map ? '${data['transcript'] ?? ''}'.trim() : '';
      if (transcript.isEmpty) {
        if (mounted) toast(context, '未识别到语音内容', error: true);
        return null;
      }
      return transcript;
    } catch (e) {
      if (mounted) toast(context, serviceErrorMessage(e), error: true);
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final featureHits = _featureHits;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        automaticallyImplyLeading: false,
        leading: IconButton(
          tooltip: '返回',
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurfaceVariant),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/home'),
        ),
        titleSpacing: 0,
        title: Container(
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(R.sm),
            border: Border.all(color: AppColors.outlineVariant, width: 1.5),
          ),
          child: Row(
            children: [
              const Icon(Icons.search, size: 20, color: AppColors.outline),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  focusNode: _focus,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: '搜索功能、政策、农技、商品...',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  style: const TextStyle(
                    fontSize: 15,
                    color: AppColors.onSurface,
                  ),
                  onChanged: (value) => setState(() {
                    _query = value.trim();
                    if (_query.isEmpty) _content = {};
                  }),
                  onSubmitted: (_) => _searchContent(),
                ),
              ),
              IconButton(
                tooltip: '语音输入',
                onPressed: _listenAndSearch,
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.mic_none,
                    size: 20, color: AppColors.outline),
              ),
              if (_query.isNotEmpty)
                GestureDetector(
                  onTap: _clear,
                  child: const Icon(
                    Icons.close,
                    size: 18,
                    color: AppColors.outline,
                  ),
                ),
            ],
          ),
        ),
        actions: const [SizedBox(width: 4)],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          if (_query.isEmpty) _hotKeywords(),
          if (featureHits.isNotEmpty) ...[
            const SectionTitle('功能'),
            _featureGrid(featureHits),
          ],
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Loading(text: '搜索中'),
            ),
          if (!_loading && _content.isNotEmpty) ..._contentSections(),
          if (!_loading &&
              _query.isNotEmpty &&
              featureHits.isEmpty &&
              _contentEmpty)
            const Padding(
              padding: EdgeInsets.all(40),
              child: EmptyView('没有找到相关结果'),
            ),
        ],
      ),
    );
  }

  Widget _hotKeywords() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('热门搜索'),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final word in _hotWords)
              ActionChip(
                avatar: const Icon(Icons.search, size: 17),
                label: Text(word),
                onPressed: () => _useHotWord(word),
                backgroundColor: AppColors.surface,
                side: const BorderSide(color: AppColors.outlineVariant),
                labelStyle: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _featureGrid(List<FeatureItem> items) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 2.35,
      ),
      itemBuilder: (context, index) {
        final feature = items[index];
        final color = _sectionColor(feature.section);
        return AppCard(
          padding: const EdgeInsets.all(12),
          onTap: () => context.go(feature.route),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(feature.icon, color: color, size: 21),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      feature.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      kFeatureSections[feature.section] ?? feature.section,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _contentSections() {
    final sections = <Widget>[];
    _addContentSection(
      sections,
      title: '政策',
      icon: Icons.account_balance_outlined,
      route: '/policy',
      items: _list(_content['policy']),
      subtitle: (item) => _join([
        _text(item['level']),
        _text(item['category']),
        _text(item['summary']),
      ]),
    );
    _addContentSection(
      sections,
      title: '农技',
      icon: Icons.biotech_outlined,
      route: '/agri',
      items: _list(_content['disease']),
      titleOf: (item) => _text(item['diseaseName'], fallback: '农技结果'),
      subtitle: (item) => _join([
        _text(item['cropType']),
        _text(item['category']),
      ]),
    );
    _addContentSection(
      sections,
      title: '商品',
      icon: Icons.storefront_outlined,
      route: '/market',
      items: _list(_content['product']),
      subtitle: (item) => _join([
        _price(item),
        _text(item['category']),
      ]),
    );
    _addContentSection(
      sections,
      title: '招工',
      icon: Icons.work_outline,
      route: '/life',
      items: _list(_content['job']),
      subtitle: (item) => _join([
        _text(item['company']),
        _text(item['salary']),
        _text(item['jobType']),
      ]),
    );
    _addContentSection(
      sections,
      title: '课程',
      icon: Icons.school_outlined,
      route: '/policy/service',
      items: _list(_content['course']),
      subtitle: (item) => _join([
        _text(item['category']),
        _text(item['instructor']),
      ]),
    );
    return sections;
  }

  void _addContentSection(
    List<Widget> sections, {
    required String title,
    required IconData icon,
    required String route,
    required List<Map<String, dynamic>> items,
    required String Function(Map<String, dynamic>) subtitle,
    String Function(Map<String, dynamic>)? titleOf,
  }) {
    if (items.isEmpty) return;
    sections.add(SectionTitle(title));
    sections.addAll([
      for (final item in items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AppCard(
            padding: EdgeInsets.zero,
            onTap: () => context.go(route),
            child: ListTile(
              leading: _contentIcon(icon),
              title: Text(
                titleOf?.call(item) ?? _text(item['title'], fallback: title),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                subtitle(item).isEmpty ? '点击查看对应板块' : subtitle(item),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 15,
                color: AppColors.outline,
              ),
            ),
          ),
        ),
    ]);
  }

  Widget _contentIcon(IconData icon) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.primaryContainer.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(R.md),
      ),
      child: Icon(icon, color: AppColors.primary, size: 21),
    );
  }

  Color _sectionColor(String key) {
    for (final section in kSections) {
      if (section['key'] == key) return section['color'] as Color;
    }
    return AppColors.primary;
  }

  static List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map((item) {
        return item.map((key, value) => MapEntry('$key', value));
      }).toList();
    }
    return const [];
  }

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _price(Map<String, dynamic> item) {
    final price = item['price'];
    if (price == null) return '';
    final unit = _text(item['unit']);
    return '￥$price${unit.isEmpty ? '' : '/$unit'}';
  }

  static String _join(List<String> parts) {
    return parts.where((part) => part.trim().isNotEmpty).join(' · ');
  }
}

class _VoicePulseIcon extends StatefulWidget {
  const _VoicePulseIcon();

  @override
  State<_VoicePulseIcon> createState() => _VoicePulseIconState();
}

class _VoicePulseIconState extends State<_VoicePulseIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 820),
    )..repeat(reverse: true);
    _scale = Tween<double>(begin: 0.94, end: 1.08).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: AppColors.primaryContainer.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.primaryContainer),
        ),
        child: const Icon(Icons.mic_none, color: AppColors.primary, size: 32),
      ),
    );
  }
}
