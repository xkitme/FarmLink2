import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/content.dart';
import '../../widgets/ink_card.dart';
import '../../widgets/category_chip.dart';

class ExplorePage extends StatefulWidget {
  const ExplorePage({super.key});

  @override
  State<ExplorePage> createState() => _ExplorePageState();
}

class _ExplorePageState extends State<ExplorePage> {
  String? _selectedCategory;
  List<ContentMeta> _items = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({String? category, String? q}) async {
    setState(() => _loading = true);
    try {
      final query = <String, String>{'limit': '20'};
      if (category != null) query['category'] = category;
      if (q != null && q.isNotEmpty) query['q'] = q;
      final res = category == null && q != null && q.isNotEmpty
          ? await ApiClient.get('/api/search', query: {'q': q, 'limit': '20'})
          : await ApiClient.get('/api/contents', query: query);
      if (!mounted) return;
      final list = res['data'] as List;
      setState(() {
        _items = list.map((e) => ContentMeta.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onCategoryTap(String key) {
    final newCat = _selectedCategory == key ? null : key;
    setState(() => _selectedCategory = newCat);
    _load(category: newCat);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(
        title: const Text('探 索'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: InkColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: '搜索诗词、典籍、历史...',
                prefixIcon: const Icon(Icons.search, color: InkColors.textDisabled, size: 18),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 16, color: InkColors.textDisabled),
                        onPressed: () {
                          _searchCtrl.clear();
                          _load(category: _selectedCategory);
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onSubmitted: (q) => _load(q: q),
              onChanged: (v) => setState(() {}),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // 分类筛选
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: kCategories.keys.map((key) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: CategoryChip(
                  category: key,
                  selected: _selectedCategory == key,
                  onTap: () => _onCategoryTap(key),
                ),
              )).toList(),
            ),
          ),
          const Divider(height: 1),
          // 内容列表
          Expanded(
            child: _loading
                ? const InkLoading(message: '加载中...')
                : _items.isEmpty
                    ? const InkEmpty('暂无内容')
                    : RefreshIndicator(
                        color: InkColors.gold,
                        backgroundColor: InkColors.surface,
                        onRefresh: () => _load(category: _selectedCategory),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, i) {
                            final item = _items[i];
                            return InkListTile(
                              title: item.title,
                              subtitle: [
                                if (item.author != null) item.author!,
                                if (item.dynasty != null) item.dynasty!,
                                if (item.summary != null) item.summary!,
                              ].take(2).join(' · '),
                              tag: kCategories[item.category]?['label'] as String?,
                              onTap: () => context.go('/explore/${item.id}'),
                            )
                            .animate(delay: (i * 40).ms)
                            .fade(duration: 300.ms)
                            .slideX(begin: 0.03);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
