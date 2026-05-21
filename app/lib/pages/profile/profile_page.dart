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
      appBar: AppBar(title: const Text('我的'), automaticallyImplyLeading: false),
      body: ListView(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            color: AppColors.surface,
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.primaryLight,
                  child: const Icon(Icons.person, size: 36, color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.displayName ?? '未登录',
                          style: const TextStyle(
                              fontSize: 19, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              kRoleLabels[user?.role] ?? '农户',
                              style: const TextStyle(
                                  color: AppColors.primaryDark, fontSize: 12),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('积分 ${user?.points ?? 0}',
                              style: const TextStyle(
                                  color: AppColors.harvest,
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
          const SizedBox(height: 12),
          _menu(context, Icons.local_florist, '我的地块', () {}),
          _menu(context, Icons.receipt_long, '农事记录', () {}),
          _menu(context, Icons.shopping_bag_outlined, '我的订单', () {}),
          _menu(context, Icons.notifications_none, '消息通知', () {}),
          _menu(context, Icons.elderly, '适老模式', () {}),
          _menu(context, Icons.settings_outlined, '设置', () {}),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton(
              onPressed: () async {
                await auth.logout();
                if (context.mounted) context.go('/auth/login');
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('退出登录'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _menu(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primary),
      title: Text(label, style: const TextStyle(fontSize: 15)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textHint),
      tileColor: AppColors.surface,
      onTap: () => toast(context, '「$label」将于后续分段实现'),
    );
  }
}
