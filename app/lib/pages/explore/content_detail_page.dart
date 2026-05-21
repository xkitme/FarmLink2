import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/content.dart';
import '../../widgets/ink_card.dart';

class ContentDetailPage extends StatefulWidget {
  final String id;
  const ContentDetailPage({super.key, required this.id});

  @override
  State<ContentDetailPage> createState() => _ContentDetailPageState();
}

class _ContentDetailPageState extends State<ContentDetailPage> {
  Content? _content;
  bool _loading = true;
  bool _favorited = false;
  bool _showTranslation = false;
  String? _translation;
  bool _translating = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.get('/api/contents/${widget.id}');
      await ApiClient.post('/api/contents/${widget.id}/view');
      if (!mounted) return;
      final c = Content.fromJson(res['data'] as Map<String, dynamic>);
      setState(() { _content = c; _favorited = c.isFavorited; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleFavorite() async {
    try {
      await ApiClient.post('/api/contents/${widget.id}/favorite');
      setState(() => _favorited = !_favorited);
    } catch (_) {}
  }

  Future<void> _translate() async {
    if (_translating || _translation != null) {
      setState(() => _showTranslation = !_showTranslation);
      return;
    }
    setState(() => _translating = true);
    try {
      final res = await ApiClient.post('/api/ai/translate', body: {
        'text': _content!.body,
        'title': _content!.title,
      });
      if (!mounted) return;
      setState(() {
        _translation = res['data']?['translation'] as String? ?? '翻译失败';
        _translating = false;
        _showTranslation = true;
      });
    } catch (e) {
      if (mounted) setState(() => _translating = false);
    }
  }

  Future<void> _startQuiz() async {
    context.go('/ai/chat', extra: {'contentId': widget.id, 'quizMode': true});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      body: _loading
          ? const InkLoading(message: '加载中...')
          : _content == null
              ? const InkEmpty('内容加载失败')
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final c = _content!;
    final catLabel = kCategories[c.category]?['label'] as String? ?? c.category;
    final catColor = kCategories[c.category]?['color'] as Color? ?? InkColors.gold;

    return CustomScrollView(
      slivers: [
        // SliverAppBar with gradient
        SliverAppBar(
          expandedHeight: 200,
          pinned: true,
          backgroundColor: InkColors.background,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, size: 18),
            onPressed: () => context.pop(),
          ),
          actions: [
            IconButton(
              icon: Icon(
                _favorited ? Icons.bookmark : Icons.bookmark_border,
                color: _favorited ? InkColors.gold : InkColors.textSecondary,
              ),
              onPressed: _toggleFavorite,
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    catColor.withOpacity(0.15),
                    InkColors.background,
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: catColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: catColor.withOpacity(0.4)),
                        ),
                        child: Text(catLabel, style: TextStyle(color: catColor, fontSize: 11)),
                      ),
                      const SizedBox(height: 10),
                      Text(c.title, style: const TextStyle(
                        color: InkColors.textPrimary,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      )),
                      if (c.author != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          [if (c.dynasty != null) c.dynasty!, c.author!].join(' · '),
                          style: const TextStyle(color: InkColors.textSecondary, fontSize: 13),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 正文
                InkCard(
                  padding: const EdgeInsets.all(20),
                  child: MarkdownBody(
                    data: c.body,
                    styleSheet: MarkdownStyleSheet(
                      p: const TextStyle(
                        color: InkColors.textPrimary,
                        fontSize: 16,
                        height: 2.2,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                )
                .animate()
                .fade(duration: 500.ms),

                const SizedBox(height: 16),

                // AI 工具栏
                Row(
                  children: [
                    Expanded(
                      child: _ActionBtn(
                        icon: Icons.translate,
                        label: _translating ? '译中...' : (_showTranslation ? '收起译文' : '古文今译'),
                        onTap: _translate,
                        loading: _translating,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ActionBtn(
                        icon: Icons.quiz_outlined,
                        label: '生成测题',
                        onTap: _startQuiz,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ActionBtn(
                        icon: Icons.chat_bubble_outline,
                        label: 'AI 问答',
                        onTap: () => context.go('/ai/chat'),
                      ),
                    ),
                  ],
                )
                .animate(delay: 200.ms)
                .fade(duration: 400.ms),

                // 译文展示
                if (_showTranslation && _translation != null) ...[
                  const SizedBox(height: 16),
                  InkCard(
                    padding: const EdgeInsets.all(20),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0D1210), Color(0xFF131A17)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 3,
                              height: 14,
                              color: InkColors.jade,
                            ),
                            const SizedBox(width: 8),
                            const Text('今文译义', style: TextStyle(
                              color: InkColors.jade,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            )),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(_translation!, style: const TextStyle(
                          color: InkColors.textPrimary,
                          fontSize: 14,
                          height: 1.8,
                        )),
                      ],
                    ),
                  )
                  .animate()
                  .fade(duration: 400.ms)
                  .slideY(begin: 0.05),
                ],

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool loading;

  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.onTap,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) => InkCard(
    onTap: loading ? null : onTap,
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        loading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 1.5,
                  valueColor: AlwaysStoppedAnimation(InkColors.gold),
                ),
              )
            : Icon(icon, color: InkColors.gold, size: 20),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(
          color: InkColors.textSecondary,
          fontSize: 11,
        )),
      ],
    ),
  );
}
