import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class AiPage extends StatelessWidget {
  const AiPage({super.key});

  static const _tools = [
    (icon: Icons.coronavirus_outlined, title: '智能识病',   desc: '拍照识别作物病虫害'),
    (icon: Icons.grass_outlined,       title: '杂草识别',   desc: '田间杂草拍照辨识'),
    (icon: Icons.spa_outlined,         title: '种子鉴别',   desc: 'AI 评估种子质量'),
    (icon: Icons.translate,            title: '政策问答',   desc: '惠农政策智能解读'),
    (icon: Icons.gavel,                title: '法律咨询',   desc: '涉农法律援助问答'),
    (icon: Icons.mic_none,             title: '语音助手',   desc: '方言语音问答'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          // 智能识病主卡（AI 卡片 — 麦金描边）
          AppCard(
            ai: true,
            onTap: () => toast(context, '智能识病功能将于后续分段实现'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.center_focus_strong, color: AppColors.primary, size: 22),
                    SizedBox(width: 8),
                    Text('智能识病',
                        style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                  ],
                ),
                const SizedBox(height: 6),
                const Text('拍照或上传作物叶片，AI 即刻为您诊断并提供用药建议',
                    style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
                const SizedBox(height: 14),
                DottedUploadBox(onTap: () => toast(context, '拍照识别将于后续分段实现')),
              ],
            ),
          ),
          const SectionTitle('AI 农技工具'),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.55,
            children: [
              for (final t in _tools)
                AppCard(
                  padding: const EdgeInsets.all(14),
                  onTap: () => toast(context, '${t.title}将于后续分段实现'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(R.md),
                        ),
                        child: Icon(t.icon, color: AppColors.primary, size: 21),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.title,
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 2),
                          Text(t.desc,
                              style: const TextStyle(
                                  fontSize: 11, color: AppColors.onSurfaceVariant)),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          // 农技专家 AI 对话入口
          AppCard(
            color: AppColors.primaryContainer.withValues(alpha: 0.08),
            onTap: () => toast(context, 'AI 对话将于后续分段实现'),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(
                    color: AppColors.primary, shape: BoxShape.circle),
                  child: const Icon(Icons.support_agent, color: Colors.white),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('农技专家 AI',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                      Text('病虫害 · 测土施肥 · 天气农事，随时问',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.outline),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 虚线上传框
class DottedUploadBox extends StatelessWidget {
  final VoidCallback onTap;
  const DottedUploadBox({super.key, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.md),
        child: Container(
          height: 130,
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(R.md),
            border: Border.all(
                color: AppColors.outlineVariant, width: 1.4, style: BorderStyle.solid),
          ),
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_a_photo_outlined, color: AppColors.primary, size: 32),
              SizedBox(height: 8),
              Text('点击拍摄或上传图片',
                  style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
            ],
          ),
        ),
      );
}
