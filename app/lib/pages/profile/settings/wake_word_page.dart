import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants.dart';
import '../../../core/voice_wake.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

/// 语音唤醒介绍页：说明「呼叫唤起」+ 底部启用开关。
/// 路由路径 '/profile/settings/wake'（由 router 统一注册）。
class WakeWordPage extends StatelessWidget {
  const WakeWordPage({super.key});

  static const _features = [
    (
      Icons.hearing_outlined,
      '说出唤醒词即唤起',
      '开启后，在首页等主页面说出唤醒词，就能直接唤起 AI 语音助手，免去点按。',
    ),
    (
      Icons.offline_bolt_outlined,
      '离线本地识别',
      '唤醒词在设备本地离线识别，不上传录音；仅安卓 App 真机可用。',
    ),
    (
      Icons.tune_outlined,
      '唤醒词可后台配置',
      '唤醒词由管理台统一配置，识别带近音容错，说得稍有出入也能听懂。',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final wake = context.watch<VoiceWakeState>();
    final words = wake.wakeWords.join('、');
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '语音唤醒'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          SettingsHeroCard(
            icon: Icons.keyboard_voice_outlined,
            title: '语音唤醒',
            subtitle: '说一声「${wake.wakeWords.isNotEmpty ? wake.wakeWords.first : '你好小田'}」，'
                '即可呼叫唤起 AI 语音助手，帮你打开页面、搜索、下单或答疑。',
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
          const SettingsGroupLabel('当前唤醒词'),
          AppCard(
            child: Row(
              children: [
                const Icon(Icons.campaign_outlined,
                    color: AppColors.primary, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    words.isEmpty ? '你好小田' : words,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('启用语音唤醒'),
          AppCard(
            padding: EdgeInsets.zero,
            child: SwitchListTile(
              value: wake.enabled,
              onChanged: (value) =>
                  context.read<VoiceWakeState>().setEnabled(value),
              secondary: const Icon(
                Icons.keyboard_voice_outlined,
                color: AppColors.primary,
                size: 22,
              ),
              title: const Text('开启语音唤醒'),
              subtitle: Text(wake.enabled
                  ? '已开启，主页面将持续监听唤醒词'
                  : '关闭中，开启后将持续使用麦克风监听唤醒词'),
              activeColor: AppColors.primary,
            ),
          ),
          const SizedBox(height: 14),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              '提示：开启后会在首页、AI 农技、发布、消息、我的等主页面持续使用麦克风做离线监听，'
              '听到唤醒词才会唤起助手。该功能仅安卓 App 真机可用；如较费电或注重隐私，可随时关闭。',
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
          backgroundColor: AppColors.primary,
          child: Icon(icon, color: Colors.white, size: 22),
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
