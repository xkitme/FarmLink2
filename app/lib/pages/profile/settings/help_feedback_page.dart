import 'package:flutter/material.dart';

import '../../../core/api_client.dart';
import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class HelpFeedbackPage extends StatefulWidget {
  const HelpFeedbackPage({super.key});

  @override
  State<HelpFeedbackPage> createState() => _HelpFeedbackPageState();
}

class _HelpFeedbackPageState extends State<HelpFeedbackPage> {
  final _content = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _content.text.trim();
    if (text.isEmpty) {
      toast(context, '请填写反馈内容', error: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiClient.post('/feedback', body: {
        'category': 'App 反馈',
        'content': text,
      });
      if (!mounted) return;
      _content.clear();
      toast(context, '已收到反馈，感谢你的建议');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('提交', e), error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '帮助与反馈'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsGroupLabel('常见问题'),
          const AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _FaqTile(
                  title: '怎么发布动态？',
                  content: '进入发布页，点击右下角加号，选择动态类型并填写内容后提交。',
                ),
                Divider(height: 1, indent: 16, endIndent: 16),
                _FaqTile(
                  title: 'AI 识别不准怎么办？',
                  content: '建议补充清晰图片、作物名称和症状描述，必要时联系农技员复核。',
                ),
                Divider(height: 1, indent: 16, endIndent: 16),
                _FaqTile(
                  title: '如何申请补贴？',
                  content: '进入惠农政策服务页，查看可申请项目并按要求提交材料。',
                ),
                Divider(height: 1, indent: 16, endIndent: 16),
                _FaqTile(
                  title: '数据同步失败怎么办？',
                  content: '下拉刷新后重试；如仍失败，请在本页提交反馈并附上操作时间。',
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('联系我们'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SettingTile(
                  icon: Icons.phone_outlined,
                  label: '客服电话',
                  trailingText: '400-888-0000',
                  onTap: () => toast(context, '客服电话：400-888-0000'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.email_outlined,
                  label: '客服邮箱',
                  trailingText: 'support@farmlink.example.com',
                  onTap: () =>
                      toast(context, '客服邮箱：support@farmlink.example.com'),
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('提交反馈'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _content,
                  maxLines: 5,
                  minLines: 4,
                  decoration: const InputDecoration(
                    labelText: '反馈内容',
                    hintText: '请描述遇到的问题或建议',
                    filled: true,
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text('提交'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  final String title;
  final String content;

  const _FaqTile({required this.title, required this.content});

  @override
  Widget build(BuildContext context) => ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        title: Text(title),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              content,
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                height: 1.5,
              ),
            ),
          ),
        ],
      );
}
