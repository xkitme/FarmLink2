import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/constants.dart';
import '../../../core/elder_mode.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

/// 适老模式介绍页：宣传功能 + 底部启用开关。
/// 路由路径 '/profile/settings/elder'（由 router 统一注册）。
class ElderModePage extends StatelessWidget {
  const ElderModePage({super.key});

  static const _features = [
    (
      Icons.text_fields,
      '放大字号',
      '全局放大正文与按钮文字，看得更清楚，操作不费眼。',
    ),
    (
      Icons.record_voice_over_outlined,
      '朗读 AI 回答',
      '在 AI 农技助手里点一下 AI 的回答，就会语音朗读这段内容，再点一下停止。',
    ),
    (
      Icons.touch_app_outlined,
      '更大的点击区域',
      '关键按钮与列表项更大更好按，减少误触。',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final enabled = context.watch<ElderModeState>().enabled;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '适老模式'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          const SettingsHeroCard(
            icon: Icons.elderly_outlined,
            title: '适老模式',
            subtitle: '专为长辈打造的清晰、易用体验，字更大、声音读得出、按钮更好点。',
          ),
          const SettingsGroupLabel('开启后您将获得'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < _features.length; i++) ...[
                  if (i != 0) const Divider(height: 1, indent: 56),
                  _FeatureRow(
                    icon: _features[i].$1,
                    title: _features[i].$2,
                    desc: _features[i].$3,
                  ),
                ],
              ],
            ),
          ),
          const SettingsGroupLabel('启用适老模式'),
          AppCard(
            padding: EdgeInsets.zero,
            child: SwitchListTile(
              value: enabled,
              onChanged: (value) => _setElderMode(context, value),
              secondary: const Icon(
                Icons.elderly_outlined,
                color: AppColors.primary,
                size: 22,
              ),
              title: const Text('开启适老模式'),
              subtitle: Text(enabled ? '已开启，界面已切换为适老体验' : '关闭中，开启后立即生效'),
              activeColor: AppColors.primary,
            ),
          ),
          const SizedBox(height: 14),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              '提示：适老模式开启后，进入「AI 农技助手」，点击 AI 给出的回答即可听到语音朗读。语音朗读依赖设备的语音能力，个别环境可能不可用。',
              style: TextStyle(
                fontSize: 12,
                height: 1.6,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 照搬 settings_home_page 的写法：本地状态优先，再尽力同步到云端。
  static Future<void> _setElderMode(BuildContext context, bool value) async {
    await context.read<ElderModeState>().setEnabled(value);
    try {
      await ApiClient.put('/user/profile', body: {'isElderMode': value});
    } catch (_) {
      // 云端暂未接受该字段时，本地持久化已足够。
    }
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;

  const _FeatureRow({
    required this.icon,
    required this.title,
    required this.desc,
  });

  @override
  Widget build(BuildContext context) => ListTile(
        leading: CircleAvatar(
          radius: 20,
          backgroundColor: AppColors.primaryContainer.withValues(alpha: 0.16),
          child: Icon(icon, color: AppColors.primary, size: 22),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.onSurface,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            desc,
            style: const TextStyle(
              fontSize: 12,
              height: 1.5,
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
      );
}
