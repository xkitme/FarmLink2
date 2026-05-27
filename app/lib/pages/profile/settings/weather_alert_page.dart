import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class WeatherAlertPage extends StatefulWidget {
  const WeatherAlertPage({super.key});

  @override
  State<WeatherAlertPage> createState() => _WeatherAlertPageState();
}

class _WeatherAlertPageState extends State<WeatherAlertPage> {
  final Map<String, bool> _alerts = {
    'alert.rain': true,
    'alert.heat': true,
    'alert.frost': false,
    'alert.typhoon': true,
  };
  String _freq = 'realtime';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sp = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      for (final key in _alerts.keys.toList()) {
        _alerts[key] = sp.getBool(key) ?? _alerts[key]!;
      }
      _freq = sp.getString('alert.freq') ?? 'realtime';
    });
  }

  Future<void> _setAlert(String key, bool value) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setBool(key, value);
    if (mounted) setState(() => _alerts[key] = value);
  }

  Future<void> _setFreq(String value) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString('alert.freq', value);
    if (mounted) setState(() => _freq = value);
  }

  Future<void> _reset() async {
    final sp = await SharedPreferences.getInstance();
    await sp.setBool('alert.rain', true);
    await sp.setBool('alert.heat', true);
    await sp.setBool('alert.frost', false);
    await sp.setBool('alert.typhoon', true);
    await sp.setString('alert.freq', 'realtime');
    await _load();
    if (mounted) toast(context, '已恢复默认配置');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '气象预警提醒'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsImageBanner(
            image: 'assets/images/_5_1.jpg',
            title: '精准农业气象监测',
            subtitle: '配置预警类型与通知频率。',
          ),
          const SettingsGroupLabel('预警类型'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _alertTile(
                  keyName: 'alert.rain',
                  title: '暴雨预警',
                  subtitle: '降水量超过阈值时提醒',
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _alertTile(
                  keyName: 'alert.heat',
                  title: '高温预警',
                  subtitle: '超过 35℃ 时推送风险提示',
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _alertTile(
                  keyName: 'alert.frost',
                  title: '霜冻预警',
                  subtitle: '作物冻害风险提示',
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _alertTile(
                  keyName: 'alert.typhoon',
                  title: '台风预警',
                  subtitle: '风力等级及路径追踪',
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('通知频率'),
          Row(
            children: [
              Expanded(
                child: _freqCard(
                  value: 'realtime',
                  title: '实时推送',
                  subtitle: '即时掌握动态',
                  icon: Icons.bolt_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _freqCard(
                  value: 'daily',
                  title: '每日总结',
                  subtitle: '每日 18:00 推送',
                  icon: Icons.calendar_month_outlined,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          AppCard(
            color: AppColors.primaryContainer.withValues(alpha: 0.08),
            child: const Text(
              '温馨提示：开启实时预警后，系统将结合农场地理位置精准下发，请确保应用拥有通知权限。',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () => toast(context, '设置已保存'),
              child: const Text('保存设置'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 52,
            child: OutlinedButton(
              onPressed: _reset,
              child: const Text('恢复默认配置'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _alertTile({
    required String keyName,
    required String title,
    required String subtitle,
  }) {
    return SwitchListTile(
      value: _alerts[keyName] ?? false,
      onChanged: (value) => _setAlert(keyName, value),
      title: Text(title),
      subtitle: Text(subtitle),
      activeColor: AppColors.primary,
    );
  }

  Widget _freqCard({
    required String value,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final selected = _freq == value;
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(R.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.md),
        onTap: () => _setFreq(value),
        child: Container(
          constraints: const BoxConstraints(minHeight: 112),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.md),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.outlineVariant,
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: AppColors.primary),
                  const Spacer(),
                  if (selected)
                    const Icon(Icons.check_circle,
                        color: AppColors.primary, size: 18),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
