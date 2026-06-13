import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../core/elder_mode.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class SettingsHomePage extends StatelessWidget {
  const SettingsHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final elderMode = context.watch<ElderModeState>().enabled;
    final user = auth.user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(
        title: '设置',
        fallbackRoute: '/profile',
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          const SettingsGroupLabel('账号与安全'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _ProfileTile(
                  name: user?.displayName ?? '未登录',
                  subtitle: '个人资料',
                  onTap: () => context.push('/profile/settings/account'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.phone_iphone,
                  label: '手机号绑定',
                  trailingText: _maskPhone(user?.phone),
                  onTap: () => context.push('/profile/settings/account'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.lock_outline,
                  label: '修改密码',
                  onTap: () => context.push('/profile/settings/password'),
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('通知与通用'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SettingTile(
                  icon: Icons.notifications_outlined,
                  label: '消息推送设置',
                  onTap: () => context.push('/profile/settings/push'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.thunderstorm_outlined,
                  label: '气象预警提醒',
                  onTap: () => context.push('/profile/settings/weather'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.elderly_outlined,
                  label: '适老模式',
                  subtitle: '放大字号、朗读 AI 回答，方便长辈使用',
                  trailingText: elderMode ? '已开启' : '未开启',
                  onTap: () => context.push('/profile/settings/elder'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.language,
                  label: '语言设置',
                  trailingText: '简体中文',
                  onTap: () => toast(context, '当前仅支持简体中文'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.storage_outlined,
                  label: '存储空间管理',
                  onTap: () => context.push('/profile/settings/storage'),
                ),
              ],
            ),
          ),
          const SettingsGroupLabel('隐私与支持'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SettingTile(
                  icon: Icons.shield_outlined,
                  label: '隐私设置',
                  onTap: () => context.push('/profile/settings/privacy'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.cleaning_services_outlined,
                  label: '清除缓存',
                  trailingText: '清理',
                  onTap: () => _clearCache(context),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.help_outline,
                  label: '帮助与反馈',
                  onTap: () => context.push('/profile/settings/help'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.info_outline,
                  label: '关于田园通',
                  trailingText: 'v$kAppVersion',
                  onTap: () => context.push('/profile/settings/about'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            onPressed: () async {
              await auth.logout();
              if (context.mounted) context.go('/auth/login');
            },
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text('退出登录'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: const BorderSide(color: AppColors.error, width: 2),
              minimumSize: const Size.fromHeight(52),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              '农业技术驱动，连接每一寸土地',
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

  static String _maskPhone(String? phone) {
    if (phone == null || phone.length < 7) return '未绑定';
    return '${phone.substring(0, 3)}****${phone.substring(phone.length - 4)}';
  }

  static Future<void> _clearCache(BuildContext context) async {
    final sp = await SharedPreferences.getInstance();
    // C1：仅 `cache:` 前缀有 writer，dashboard:/service: 为死前缀，去掉
    final keys = sp.getKeys().where((key) => key.startsWith('cache:')).toList();
    for (final key in keys) {
      await sp.remove(key);
    }
    if (context.mounted) {
      toast(context, '缓存已清理（${keys.length} 项）');
    }
  }
}

class _ProfileTile extends StatelessWidget {
  final String name;
  final String subtitle;
  final VoidCallback onTap;

  const _ProfileTile({
    required this.name,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          radius: 22,
          backgroundColor: AppColors.primaryContainer.withValues(alpha: 0.20),
          child: const Icon(Icons.person, color: AppColors.primary, size: 26),
        ),
        title: Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppColors.onSurface,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        trailing: const Icon(Icons.chevron_right, color: AppColors.outline),
      );
}
