import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class PrivacySettingsPage extends StatefulWidget {
  const PrivacySettingsPage({super.key});

  @override
  State<PrivacySettingsPage> createState() => _PrivacySettingsPageState();
}

class _PrivacySettingsPageState extends State<PrivacySettingsPage> {
  bool _personalized = true;
  bool _dataContribution = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sp = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _personalized = sp.getBool('privacy.personalized') ?? true;
      _dataContribution = sp.getBool('privacy.dataContribution') ?? true;
    });
  }

  Future<void> _set(String key, bool value) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setBool(key, value);
    if (!mounted) return;
    setState(() {
      if (key == 'privacy.personalized') _personalized = value;
      if (key == 'privacy.dataContribution') _dataContribution = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '隐私设置'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsHeroCard(
            icon: Icons.shield_outlined,
            title: '隐私与权限',
            subtitle: '管理推荐、数据贡献与设备权限偏好。',
          ),
          const SizedBox(height: 16),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  value: _personalized,
                  onChanged: (value) => _set('privacy.personalized', value),
                  title: const Text('个性化推荐'),
                  subtitle: const Text('基于农事记录与查询历史提供个性化政策与商品推荐'),
                  activeColor: AppColors.primary,
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                SwitchListTile(
                  value: _dataContribution,
                  onChanged: (value) => _set('privacy.dataContribution', value),
                  title: const Text('数据贡献'),
                  subtitle: const Text('向平台提供脱敏后的种植数据用于改进 AI 推荐算法'),
                  activeColor: AppColors.primary,
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('设备权限'),
          AppCard(
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _permissionButton(context, Icons.location_on_outlined, '位置权限'),
                _permissionButton(context, Icons.photo_camera_outlined, '相机权限'),
                _permissionButton(
                    context, Icons.notifications_outlined, '通知权限'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _permissionButton(BuildContext context, IconData icon, String label) {
    return OutlinedButton.icon(
      onPressed: () => toast(context, '请在系统设置中调整$label'),
      icon: Icon(icon, size: 16),
      label: Text(label),
    );
  }
}
