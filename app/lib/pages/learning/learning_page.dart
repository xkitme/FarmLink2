import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/learning.dart';
import '../../widgets/ink_card.dart';

class LearningPage extends StatefulWidget {
  const LearningPage({super.key});

  @override
  State<LearningPage> createState() => _LearningPageState();
}

class _LearningPageState extends State<LearningPage> {
  LearningStats? _stats;
  List<ReviewItem> _dueReviews = [];
  bool _loading = true;
  bool _checkedIn = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/api/learning/stats'),
        ApiClient.get('/api/learning/review/due'),
      ]);
      if (!mounted) return;
      final stats = results[0]['data'] as Map<String, dynamic>;
      final due = results[1]['data'] as List;
      setState(() {
        _stats = LearningStats.fromJson(stats);
        _dueReviews = due.map((e) => ReviewItem.fromJson(e as Map<String, dynamic>)).toList();
        _checkedIn = (stats['checkinToday'] as int? ?? 0) > 0;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkin() async {
    try {
      await ApiClient.post('/api/learning/checkin');
      setState(() => _checkedIn = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('打卡成功！继续加油 🔥'),
            backgroundColor: InkColors.jade,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(title: const Text('学 习')),
      body: _loading
          ? const InkLoading(message: '加载中...')
          : RefreshIndicator(
              color: InkColors.gold,
              backgroundColor: InkColors.surface,
              onRefresh: _load,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildStatsCard(),
                    const SizedBox(height: 20),
                    _buildCheckin(),
                    const SizedBox(height: 20),
                    _buildDueReviews(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatsCard() {
    final s = _stats;
    if (s == null) return const SizedBox.shrink();
    return InkCard(
      gradient: const LinearGradient(
        colors: [Color(0xFF131008), Color(0xFF1A1608)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatItem('${s.streak}', '连续打卡', InkColors.cinnabar, '🔥'),
              _StatItem('${s.total}', '已学内容', InkColors.gold, '📚'),
              _StatItem('${s.mastered}', '已掌握', InkColors.jade, '✓'),
            ],
          ),
          const SizedBox(height: 16),
          const GoldDivider(),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.schedule, color: InkColors.textSecondary, size: 14),
              const SizedBox(width: 6),
              Text('待复习 ${s.reviewing} 项', style: const TextStyle(
                color: InkColors.textSecondary,
                fontSize: 13,
              )),
              const Spacer(),
              if (s.total > 0) ...[
                Text('掌握率 ${(s.mastered / s.total * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(color: InkColors.gold, fontSize: 13)),
              ],
            ],
          ),
        ],
      ),
    ).animate().fade(duration: 500.ms);
  }

  Widget _buildCheckin() {
    return InkCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _checkedIn ? InkColors.jade.withOpacity(0.1) : InkColors.gold.withOpacity(0.1),
              border: Border.all(
                color: _checkedIn ? InkColors.jade : InkColors.gold,
                width: 1.5,
              ),
            ),
            child: Center(
              child: Icon(
                _checkedIn ? Icons.check_circle : Icons.local_fire_department,
                color: _checkedIn ? InkColors.jade : InkColors.gold,
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _checkedIn ? '今日已打卡' : '今日打卡',
                  style: TextStyle(
                    color: _checkedIn ? InkColors.jade : InkColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _checkedIn ? '坚持就是胜利，明天继续加油！' : '记录今日学习，积累文化底蕴',
                  style: const TextStyle(color: InkColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          if (!_checkedIn)
            ElevatedButton(
              onPressed: _checkin,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                textStyle: const TextStyle(fontSize: 13),
              ),
              child: const Text('打卡'),
            ),
        ],
      ),
    ).animate(delay: 100.ms).fade(duration: 400.ms);
  }

  Widget _buildDueReviews() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionTitle(
          '待复习 (${_dueReviews.length})',
          action: _dueReviews.isNotEmpty
              ? TextButton(
                  onPressed: () => context.go('/learning/review'),
                  child: const Text('开始复习', style: TextStyle(color: InkColors.gold, fontSize: 12)),
                )
              : null,
        ),
        if (_dueReviews.isEmpty)
          const InkCard(
            padding: EdgeInsets.all(24),
            child: Column(
              children: [
                Text('🎉', style: TextStyle(fontSize: 32)),
                SizedBox(height: 8),
                Text('暂无待复习内容', style: TextStyle(color: InkColors.textSecondary, fontSize: 14)),
                SizedBox(height: 4),
                Text('去探索更多传统文化内容吧', style: TextStyle(color: InkColors.textDisabled, fontSize: 12)),
              ],
            ),
          )
        else
          ...(_dueReviews.take(5).toList().asMap().entries.map((e) {
            final i = e.key;
            final item = e.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkListTile(
                title: item.contentTitle,
                subtitle: '熟练度 ${item.mastery}/5 · ${kCategories[item.category]?['label'] ?? item.category}',
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: item.mastery < 3
                        ? InkColors.cinnabar.withOpacity(0.1)
                        : InkColors.jade.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: item.mastery < 3 ? InkColors.cinnabar : InkColors.jade,
                      width: 0.5,
                    ),
                  ),
                  child: Text(
                    item.mastery < 2 ? '需加强' : item.mastery < 4 ? '复习中' : '快掌握',
                    style: TextStyle(
                      color: item.mastery < 3 ? InkColors.cinnabar : InkColors.jade,
                      fontSize: 11,
                    ),
                  ),
                ),
                onTap: () => context.go('/learning/review'),
              )
              .animate(delay: (i * 80 + 200).ms)
              .fade(duration: 300.ms)
              .slideX(begin: 0.03),
            );
          })),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value, label;
  final Color color;
  final String emoji;

  const _StatItem(this.value, this.label, this.color, this.emoji);

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(emoji, style: const TextStyle(fontSize: 20)),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(
        color: color,
        fontSize: 22,
        fontWeight: FontWeight.bold,
      )),
      Text(label, style: const TextStyle(
        color: InkColors.textSecondary,
        fontSize: 11,
      )),
    ],
  );
}
