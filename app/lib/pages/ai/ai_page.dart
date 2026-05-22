import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

/// AI 农技页 — 1:1 复刻设计稿 ai
class AiPage extends StatefulWidget {
  const AiPage({super.key});
  @override
  State<AiPage> createState() => _AiPageState();
}

class _AiPageState extends State<AiPage> {
  final _input = TextEditingController();

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        children: [
          _diagnosisCard(),
          const SizedBox(height: 24),
          _chatCard(),
        ],
      ),
    );
  }

  // 智能识病卡（麦金描边 AI 卡）
  Widget _diagnosisCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.gold),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.center_focus_strong,
                  color: AppColors.primary, size: 22),
              SizedBox(width: 8),
              Text('智能识病',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 8),
          const Text('拍照或上传作物叶片，AI 即刻为您诊断并提供用药建议。',
              style:
                  TextStyle(fontSize: 16, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 16),
          // 上传区
          InkWell(
            onTap: () => toast(context, '拍照识别将于后续分段实现'),
            borderRadius: BorderRadius.circular(R.md),
            child: Container(
              height: 128,
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(R.md),
                border: Border.all(color: AppColors.outlineVariant, width: 2),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_a_photo_outlined,
                      size: 30, color: AppColors.outline),
                  SizedBox(height: 8),
                  Text('点击拍照或上传图片',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // 示例诊断结果卡
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(R.md),
              border: Border.all(color: AppColors.surfaceHigh),
            ),
            padding: const EdgeInsets.all(8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(R.sm),
                  child: Image.asset('assets/images/ai_1.jpg',
                      width: 80,
                      height: 80,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                            width: 80,
                            height: 80,
                            color: AppColors.surfaceHigh,
                            child: const Icon(Icons.eco,
                                color: AppColors.primary, size: 32),
                          )),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          SizedBox(
                            width: 8,
                            height: 8,
                            child: DecoratedBox(
                                decoration: BoxDecoration(
                                    color: AppColors.error,
                                    shape: BoxShape.circle)),
                          ),
                          SizedBox(width: 6),
                          Text('发现疑似病害',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text('苹果白粉病',
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: AppColors.error)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _resultChip(
                              '建议喷洒三唑酮',
                              AppColors.primary,
                              AppColors.primaryContainer
                                  .withValues(alpha: 0.18)),
                          _resultChip('可信度 96%', AppColors.onSurfaceVariant,
                              AppColors.surfaceHigh),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _resultChip(String text, Color fg, Color bg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(text, style: TextStyle(fontSize: 12, color: fg)),
      );

  // AI 对话卡
  Widget _chatCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        children: [
          // 标题栏
          Container(
            decoration: const BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
              border: Border(bottom: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: const Row(
              children: [
                Icon(Icons.smart_toy, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text('农技专家 AI',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface)),
                Spacer(),
                Icon(Icons.history,
                    size: 20, color: AppColors.onSurfaceVariant),
              ],
            ),
          ),
          // 对话区
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _botBubble('您好！我是您的专属农技助手。无论是病虫害识别、测土配方还是天气影响，都可以问我。今天我能帮您什么？'),
                const SizedBox(height: 16),
                _userBubble('最近这几天要暴雨，我的玉米地刚施完肥，需要做啥防护吗？'),
                const SizedBox(height: 16),
                _botBubble(
                    '暴雨可能导致肥料流失与田间积水。建议：\n1. 紧急检查田间排水沟渠，确保排水通畅。\n2. 雨后及时查苗，如发生肥料流失，视作物长势追施速效肥。\n3. 注意防范雨后高温潮湿可能引发的病害。需要为您查询详细的玉米病害预防方案吗？'),
              ],
            ),
          ),
          // 输入栏
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLow,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add,
                      size: 20, color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _input,
                    decoration: const InputDecoration(
                      hintText: '向农技助手提问...',
                      isDense: true,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      filled: true,
                      fillColor: AppColors.surfaceLow,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(999)),
                        borderSide: BorderSide(color: AppColors.outlineVariant),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(999)),
                        borderSide:
                            BorderSide(color: AppColors.primary, width: 1.5),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.mic, color: Colors.white, size: 20),
                    onPressed: () => toast(context, '语音问答将于后续分段实现'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _botBubble(String text) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: AppColors.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.smart_toy, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Text(text,
                  style: const TextStyle(
                      fontSize: 14, height: 1.6, color: AppColors.onSurface)),
            ),
          ),
        ],
      );

  Widget _userBubble(String text) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(4),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Text(text,
                  style: const TextStyle(
                      fontSize: 14, height: 1.6, color: Colors.white)),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child:
                const Icon(Icons.person, color: AppColors.secondary, size: 18),
          ),
        ],
      );
}
