import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../models/content.dart';
import '../../widgets/ink_card.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  ContentMeta? _daily;
  Map<String, dynamic>? _streak;
  List<ContentMeta> _recent = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/api/contents/daily/recommend'),
        ApiClient.get('/api/learning/streak'),
        ApiClient.get('/api/contents', query: {'limit': '4'}),
      ]);
      if (!mounted) return;
      setState(() {
        _daily = ContentMeta.fromJson(results[0]['data'] as Map<String, dynamic>);
        _streak = results[1]['data'] as Map<String, dynamic>;
        final list = results[2]['data'] as List;
        _recent = list.map((e) => ContentMeta.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final nickname = user?['nickname'] as String? ?? '学子';
    final streak = _streak?['streak'] as int? ?? 0;

    return Scaffold(
      backgroundColor: InkColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: InkColors.gold,
          backgroundColor: InkColors.surface,
          onRefresh: _load,
          child: CustomScrollView(
            slivers: [
              // 顶部 Banner
              SliverToBoxAdapter(
                child: _buildBanner(nickname, streak),
              ),
              if (_loading)
                const SliverFillRemaining(
                  child: InkLoading(message: '正在加载...'),
                )
              else ...[
                // 今日内容
                if (_daily != null)
                  SliverToBoxAdapter(child: _buildDailyCard()),
                // 功能入口
                SliverToBoxAdapter(child: _buildQuickActions(context)),
                // 最近内容
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                    child: SectionTitle('精选内容', action: TextButton(
                      onPressed: () => context.go('/explore'),
                      child: const Text('全部', style: TextStyle(color: InkColors.gold, fontSize: 12)),
                    )),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: InkListTile(
                          title: _recent[i].title,
                          subtitle: [
                            if (_recent[i].author != null) _recent[i].author!,
                            if (_recent[i].dynasty != null) _recent[i].dynasty!,
                          ].join(' · '),
                          tag: kCategories[_recent[i].category]?['label'] as String?,
                          onTap: () => context.go('/explore/${_recent[i].id}'),
                        ).animate(delay: (i * 80).ms).fade(duration: 400.ms).slideX(begin: 0.05),
                      ),
                      childCount: _recent.length,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBanner(String nickname, int streak) {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A1608), Color(0xFF2A2210)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: InkColors.gold.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: InkColors.gold.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('你好，$nickname', style: const TextStyle(
                  color: InkColors.textSecondary,
                  fontSize: 13,
                )),
                const SizedBox(height: 4),
                const Text('今日共勉', style: TextStyle(
                  color: InkColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2,
                )),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.local_fire_department, color: InkColors.cinnabar, size: 16),
                    const SizedBox(width: 4),
                    Text('连续学习 $streak 天', style: const TextStyle(
                      color: InkColors.gold,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    )),
                  ],
                ),
              ],
            ),
          ),
          // 装饰圆
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: InkColors.gold.withOpacity(0.4), width: 1.5),
            ),
            child: const Center(
              child: Text('文', style: TextStyle(
                color: InkColors.gold,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              )),
            ),
          ),
        ],
      ),
    )
    .animate()
    .fade(duration: 600.ms)
    .slideY(begin: -0.05, duration: 500.ms);
  }

  Widget _buildDailyCard() {
    final d = _daily!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('今日推荐'),
          InkCard(
            onTap: () => context.go('/explore/${d.id}'),
            gradient: const LinearGradient(
              colors: [Color(0xFF131008), Color(0xFF1E1A0A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: InkColors.gold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: InkColors.gold.withOpacity(0.4)),
                      ),
                      child: Text(
                        kCategories[d.category]?['label'] as String? ?? d.category,
                        style: const TextStyle(color: InkColors.gold, fontSize: 11),
                      ),
                    ),
                    const Spacer(),
                    const Icon(Icons.auto_awesome, color: InkColors.goldDim, size: 16),
                  ],
                ),
                const SizedBox(height: 14),
                Text(d.title, style: const TextStyle(
                  color: InkColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                )),
                if (d.author != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    [if (d.dynasty != null) d.dynasty!, d.author!].join(' · '),
                    style: const TextStyle(color: InkColors.textSecondary, fontSize: 13),
                  ),
                ],
                if (d.summary != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    d.summary!,
                    style: const TextStyle(
                      color: InkColors.textSecondary,
                      fontSize: 13,
                      height: 1.6,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 14),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('阅读全文', style: TextStyle(color: InkColors.gold, fontSize: 13)),
                    SizedBox(width: 4),
                    Icon(Icons.arrow_forward_ios, color: InkColors.gold, size: 12),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fade(duration: 500.ms);
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      _Action('🎓', '历史对话', '与孔子对话', () => context.go('/ai/character?key=confucius')),
      _Action('🍶', '诗仙李白', '把酒问明月', () => context.go('/ai/character?key=libai')),
      _Action('📚', '古文解译', 'AI 翻译古籍', () => context.go('/ai/chat')),
      _Action('🖌', '书法点评', 'AI 评估字帖', () => context.go('/ai/calligraphy')),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('AI 功能'),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.8,
            children: actions.asMap().entries.map((e) {
              final i = e.key;
              final a = e.value;
              return InkCard(
                onTap: a.onTap,
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Text(a.emoji, style: const TextStyle(fontSize: 24)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(a.title, style: const TextStyle(
                            color: InkColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          )),
                          Text(a.subtitle, style: const TextStyle(
                            color: InkColors.textSecondary,
                            fontSize: 11,
                          )),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate(delay: (i * 60 + 200).ms).fade(duration: 400.ms).scale(begin: const Offset(0.95, 0.95));
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _Action {
  final String emoji, title, subtitle;
  final VoidCallback onTap;
  const _Action(this.emoji, this.title, this.subtitle, this.onTap);
}
