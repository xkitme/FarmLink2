import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../widgets/ink_card.dart';

class AiPage extends StatelessWidget {
  const AiPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(title: const Text('AI 文化向导')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 历史人物对话
            const SectionTitle('历史人物'),
            ...kCharacters.asMap().entries.map((e) {
              final i = e.key;
              final c = e.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkCard(
                  onTap: () => context.go('/ai/character?key=${c['key']}'),
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF131008),
                      const Color(0xFF1A1710).withOpacity(0.8),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: InkColors.gold.withOpacity(0.5), width: 1.5),
                          color: InkColors.gold.withOpacity(0.08),
                        ),
                        child: Center(
                          child: Text(c['emoji']!, style: const TextStyle(fontSize: 28)),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(c['name']!, style: const TextStyle(
                                  color: InkColors.textPrimary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                )),
                                const SizedBox(width: 8),
                                Text(c['title']!, style: const TextStyle(
                                  color: InkColors.gold,
                                  fontSize: 11,
                                )),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(c['desc']!, style: const TextStyle(
                              color: InkColors.textSecondary,
                              fontSize: 12,
                              height: 1.5,
                            )),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: InkColors.textDisabled, size: 20),
                    ],
                  ),
                )
                .animate(delay: (i * 100).ms)
                .fade(duration: 400.ms)
                .slideX(begin: 0.05),
              );
            }),

            const SizedBox(height: 8),

            // 其他 AI 工具
            const SectionTitle('AI 工具'),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                _Tool('💬', 'AI 文化向导', '智能问答，文化百科', () => context.go('/ai/chat')),
                _Tool('🖌', '书法点评', '上传字帖，AI 点评', () => context.go('/ai/calligraphy')),
              ].asMap().entries.map((e) {
                final i = e.key;
                final t = e.value;
                return InkCard(
                  onTap: t.onTap,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(t.emoji, style: const TextStyle(fontSize: 28)),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.title, style: const TextStyle(
                            color: InkColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          )),
                          Text(t.subtitle, style: const TextStyle(
                            color: InkColors.textSecondary,
                            fontSize: 11,
                          )),
                        ],
                      ),
                    ],
                  ),
                )
                .animate(delay: (i * 80 + 300).ms)
                .fade(duration: 400.ms)
                .scale(begin: const Offset(0.95, 0.95));
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tool {
  final String emoji, title, subtitle;
  final VoidCallback onTap;
  const _Tool(this.emoji, this.title, this.subtitle, this.onTap);
}
