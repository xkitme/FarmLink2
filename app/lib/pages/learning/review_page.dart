import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/learning.dart';
import '../../models/content.dart';
import '../../widgets/ink_card.dart';

class ReviewPage extends StatefulWidget {
  const ReviewPage({super.key});

  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage> {
  List<ReviewItem> _reviews = [];
  int _current = 0;
  Content? _content;
  bool _loading = true;
  bool _revealed = false;
  int _done = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.get('/api/learning/review/due');
      final list = (res['data'] as List)
          .map((e) => ReviewItem.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() { _reviews = list; _loading = false; });
      if (list.isNotEmpty) await _loadContent(list[0].contentId);
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadContent(String id) async {
    setState(() { _content = null; _revealed = false; });
    try {
      final res = await ApiClient.get('/api/contents/$id');
      if (!mounted) return;
      setState(() => _content = Content.fromJson(res['data'] as Map<String, dynamic>));
    } catch (_) {}
  }

  Future<void> _submit(int rating) async {
    final item = _reviews[_current];
    try {
      await ApiClient.post('/api/learning/progress', body: {
        'contentId': item.contentId,
        'rating': rating,
      });
    } catch (_) {}
    setState(() => _done++);
    final next = _current + 1;
    if (next >= _reviews.length) {
      if (mounted) _showDone();
      return;
    }
    setState(() { _current = next; _revealed = false; });
    await _loadContent(_reviews[next].contentId);
  }

  void _showDone() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: InkColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: InkColors.border),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎉', style: TextStyle(fontSize: 40)),
            const SizedBox(height: 12),
            const Text('复习完成！', style: TextStyle(
              color: InkColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            )),
            const SizedBox(height: 8),
            Text('完成了 $_done 项复习，继续保持！', style: const TextStyle(
              color: InkColors.textSecondary,
              fontSize: 13,
            )),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () { Navigator.pop(context); context.pop(); },
            child: const Text('返回', style: TextStyle(color: InkColors.gold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(
        title: Text(_reviews.isEmpty ? '复习' : '${_current + 1} / ${_reviews.length}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? const InkLoading(message: '加载复习内容...')
          : _reviews.isEmpty
              ? const InkEmpty('暂无待复习内容')
              : _buildCard(),
    );
  }

  Widget _buildCard() {
    final c = _content;
    final item = _reviews[_current];

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 进度条
          LinearProgressIndicator(
            value: (_current + 1) / _reviews.length,
            backgroundColor: InkColors.border,
            valueColor: const AlwaysStoppedAnimation(InkColors.gold),
            minHeight: 3,
          ),
          const SizedBox(height: 24),

          // 卡片正面：标题
          InkCard(
            padding: const EdgeInsets.all(24),
            gradient: const LinearGradient(
              colors: [Color(0xFF131008), Color(0xFF1E1A0A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  kCategories[item.category]?['emoji'] as String? ?? '📄',
                  style: const TextStyle(fontSize: 32),
                ),
                const SizedBox(height: 16),
                Text(
                  item.contentTitle,
                  style: const TextStyle(
                    color: InkColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 3,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                // 熟练度星星
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) => Icon(
                    i < item.mastery ? Icons.star : Icons.star_border,
                    color: InkColors.gold,
                    size: 18,
                  )),
                ),
              ],
            ),
          )
          .animate(key: ValueKey(_current))
          .fade(duration: 400.ms)
          .scale(begin: const Offset(0.95, 0.95)),

          const SizedBox(height: 16),

          // 正文（点击显示）
          if (!_revealed)
            SizedBox(
              height: 56,
              child: OutlinedButton(
                onPressed: () => setState(() => _revealed = true),
                style: OutlinedButton.styleFrom(
                  foregroundColor: InkColors.gold,
                  side: const BorderSide(color: InkColors.gold),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('查看内容', style: TextStyle(letterSpacing: 1)),
              ),
            )
          else if (c != null)
            InkCard(
              padding: const EdgeInsets.all(16),
              child: Text(
                c.body.length > 200 ? '${c.body.substring(0, 200)}...' : c.body,
                style: const TextStyle(
                  color: InkColors.textPrimary,
                  fontSize: 15,
                  height: 2,
                  letterSpacing: 1,
                ),
                textAlign: TextAlign.center,
              ),
            )
            .animate()
            .fade(duration: 300.ms)
            .slideY(begin: 0.05),

          const Spacer(),

          // 评分按钮
          if (_revealed) ...[
            const Text('掌握程度如何？', style: TextStyle(
              color: InkColors.textSecondary,
              fontSize: 13,
            ), textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Row(
              children: [
                _RatingBtn('忘了', InkColors.cinnabar, () => _submit(1)),
                const SizedBox(width: 8),
                _RatingBtn('模糊', InkColors.indigo, () => _submit(2)),
                const SizedBox(width: 8),
                _RatingBtn('记得', InkColors.jade, () => _submit(3)),
                const SizedBox(width: 8),
                _RatingBtn('熟练', InkColors.gold, () => _submit(5)),
              ],
            ),
          ] else
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: () => setState(() => _revealed = true),
                child: const Text('显示内容'),
              ),
            ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _RatingBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _RatingBtn(this.label, this.color, this.onTap);

  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.5)),
        ),
        child: Center(
          child: Text(label, style: TextStyle(
            color: color,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          )),
        ),
      ),
    ),
  );
}
