import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../common/info_detail_page.dart';
import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '关于田园通'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.circular(R.md),
              boxShadow: AppColors.ambientShadow,
            ),
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: const Icon(Icons.agriculture,
                      size: 42, color: Colors.white),
                ),
                const SizedBox(height: 14),
                const Text(
                  '田园通',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '版本 v1.0.0',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.86),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.tonalIcon(
                  onPressed: () => toast(context, '已是最新版本'),
                  icon: const Icon(Icons.system_update_alt, size: 16),
                  label: const Text('检查更新'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SettingTile(
                  icon: Icons.description_outlined,
                  label: '服务协议',
                  onTap: () => _openTextDetail(context, '服务协议'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.privacy_tip_outlined,
                  label: '隐私政策',
                  onTap: () => _openTextDetail(context, '隐私政策'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.public,
                  label: '官方网站',
                  trailingText: '外链',
                  onTap: () =>
                      toast(context, '请访问 https://farmlink.example.com'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const AppCard(
            color: Color(0xFFFFF8E8),
            child: Text(
              '田园通致力于为现代农业提供智能化解决方案。通过 AI 土壤分析、智能排灌与实时气候监测，助力每一位耕耘者实现科技助农、丰收万家。',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                height: 1.6,
              ),
            ),
          ),
          const SizedBox(height: 22),
          const Center(
            child: Column(
              children: [
                Text(
                  '© 2026 WebClass 2 team 版权所有',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'All Rights Reserved. 粤 ICP 备 88888888 号',
                  style: TextStyle(fontSize: 12, color: AppColors.outline),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openTextDetail(BuildContext context, String title) {
    context.push('/detail/info',
        extra: InfoDetailData(
          title: title,
          sections: [
            for (final text in _sheetParagraphs) InfoSection(body: text),
          ],
        ));
  }

  static const _sheetParagraphs = [
    '田园通为农业生产、流通销售、农机共享、政策服务与乡村生活提供一体化数字服务。',
    '平台会根据您提交的业务信息提供对应服务，并以必要、最小化原则处理相关数据。',
    '您可以在账号设置中管理通知、隐私偏好与反馈信息。',
    '平台将持续完善安全、稳定与可用性能力，保障生产经营过程中的关键数据。',
    '如需帮助，请通过帮助与反馈页面联系平台支持团队。',
  ];
}
