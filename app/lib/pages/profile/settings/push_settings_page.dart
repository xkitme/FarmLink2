import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class PushSettingsPage extends StatefulWidget {
  const PushSettingsPage({super.key});

  @override
  State<PushSettingsPage> createState() => _PushSettingsPageState();
}

class _PushSettingsPageState extends State<PushSettingsPage> {
  final Map<String, bool> _values = {
    'push.system': true,
    'push.farm': true,
    'push.community': false,
    'push.event': true,
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sp = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      for (final key in _values.keys.toList()) {
        _values[key] = sp.getBool(key) ?? _values[key]!;
      }
    });
  }

  Future<void> _set(String key, bool value) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setBool(key, value);
    if (!mounted) return;
    setState(() => _values[key] = value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '消息推送设置'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsHeroCard(
            icon: Icons.notifications_active_outlined,
            title: '通知中心',
            subtitle: '及时获取农场最新动态与专业建议。',
          ),
          const SizedBox(height: 16),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _switchTile(
                  keyName: 'push.system',
                  title: '系统消息',
                  subtitle: '关于账号安全与系统维护的通知',
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _switchTile(
                  keyName: 'push.farm',
                  title: '农技建议提醒',
                  subtitle: '针对当前节气的精准种植指导',
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _switchTile(
                  keyName: 'push.community',
                  title: '社区动态通知',
                  subtitle: '关注的农友动态或互动提醒',
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _switchTile(
                  keyName: 'push.event',
                  title: '活动提醒',
                  subtitle: '线上讲座与线下农机展会活动',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            color: AppColors.primaryContainer.withValues(alpha: 0.08),
            child: const Text(
              '建议保留「系统消息」与「农技建议提醒」，避免错过重要生产指导或预警信息。',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Center(
            child: Text(
              'FarmLink 智慧农业互联平台',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _switchTile({
    required String keyName,
    required String title,
    required String subtitle,
  }) {
    return SwitchListTile(
      value: _values[keyName] ?? false,
      onChanged: (value) => _set(keyName, value),
      title: Text(title),
      subtitle: Text(subtitle),
      activeColor: AppColors.primary,
    );
  }
}
