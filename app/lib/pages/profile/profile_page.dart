import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          // 用户信息卡
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.circular(R.lg),
              boxShadow: AppColors.ambientShadow,
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white.withValues(alpha: 0.22),
                  child: const Icon(Icons.person, size: 36, color: Colors.white),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.displayName ?? '未登录',
                          style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.white)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.22),
                              borderRadius: BorderRadius.circular(R.sm),
                            ),
                            child: Text(kRoleLabels[user?.role] ?? '农户',
                                style: const TextStyle(
                                    color: Colors.white, fontSize: 12)),
                          ),
                          const SizedBox(width: 8),
                          Icon(Icons.stars_rounded,
                              color: AppColors.gold, size: 16),
                          const SizedBox(width: 2),
                          Text('${user?.points ?? 0} 积分',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // 数据概览
          AppCard(
            child: Row(
              children: [
                _stat('我的地块', '3'),
                _divider(),
                _stat('农事记录', '12'),
                _divider(),
                _stat('我的订单', '5'),
              ],
            ),
          ),
          const SectionTitle('常用服务'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _menu(context, Icons.local_florist, '我的地块'),
                _line(),
                _menu(context, Icons.receipt_long, '农事记录'),
                _line(),
                _menu(context, Icons.shopping_bag_outlined, '我的订单'),
                _line(),
                _menu(context, Icons.stars_rounded, '乡村振兴积分'),
                _line(),
                _menu(context, Icons.elderly, '适老模式'),
                _line(),
                _menu(context, Icons.settings_outlined, '设置'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: () async {
              await auth.logout();
              if (context.mounted) context.go('/auth/login');
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: const BorderSide(color: AppColors.error, width: 2),
            ),
            child: const Text('退出登录'),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.onSurfaceVariant)),
          ],
        ),
      );

  Widget _divider() => Container(
      width: 1, height: 32, color: AppColors.outlineVariant);

  Widget _line() => const Divider(height: 1, indent: 56);

  Widget _menu(BuildContext context, IconData icon, String label) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primary),
      title: Text(label, style: const TextStyle(fontSize: 15)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.outline),
      onTap: () => toast(context, '「$label」将于后续分段实现'),
    );
  }
}
