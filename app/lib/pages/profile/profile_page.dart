import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../widgets/ink_card.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  List<Map<String, dynamic>> _achievements = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.get('/api/achievements/my');
      if (!mounted) return;
      final list = res['data'] as List;
      setState(() {
        _achievements = list.map((e) => e as Map<String, dynamic>).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user;
    final nickname = user?['nickname'] as String? ?? '学子';
    final username = user?['username'] as String? ?? '';

    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(
        title: const Text('我 的'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 20, color: InkColors.textSecondary),
            onPressed: () => _confirmLogout(context, auth),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: InkColors.gold,
        backgroundColor: InkColors.surface,
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 用户信息
              InkCard(
                gradient: const LinearGradient(
                  colors: [Color(0xFF131008), Color(0xFF1E1A0A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const RadialGradient(
                          colors: [InkColors.gold, InkColors.goldDim],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: InkColors.gold.withOpacity(0.3),
                            blurRadius: 16,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          nickname.isNotEmpty ? nickname[0] : '墨',
                          style: const TextStyle(
                            color: Color(0xFF0A0B0E),
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(nickname, style: const TextStyle(
                            color: InkColors.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          )),
                          const SizedBox(height: 4),
                          Text('@$username', style: const TextStyle(
                            color: InkColors.textSecondary,
                            fontSize: 13,
                          )),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: InkColors.gold.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: InkColors.gold.withOpacity(0.4)),
                                ),
                                child: Text(
                                  '墨脉学子',
                                  style: const TextStyle(color: InkColors.gold, fontSize: 11),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
              .animate().fade(duration: 500.ms),

              const SizedBox(height: 20),

              // 成就徽章
              SectionTitle('成就徽章 (${_achievements.length})',
                action: TextButton(
                  onPressed: () {},
                  child: const Text('全部', style: TextStyle(color: InkColors.gold, fontSize: 12)),
                ),
              ),
              if (_loading)
                const InkLoading()
              else if (_achievements.isEmpty)
                const InkCard(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: InkEmpty('暂无成就，继续学习获取徽章'),
                )
              else
                GridView.count(
                  crossAxisCount: 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  children: _achievements.take(6).toList().asMap().entries.map((e) {
                    final i = e.key;
                    final a = e.value['achievement'] as Map<String, dynamic>? ?? e.value;
                    final earned = e.value['earnedAt'] != null;
                    return InkCard(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            a['icon'] as String? ?? '🏆',
                            style: TextStyle(
                              fontSize: 28,
                              color: earned ? null : const Color(0xFF4A443C),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            a['name'] as String? ?? '',
                            style: TextStyle(
                              color: earned ? InkColors.textPrimary : InkColors.textDisabled,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    )
                    .animate(delay: (i * 80).ms)
                    .fade(duration: 400.ms)
                    .scale(begin: const Offset(0.9, 0.9));
                  }).toList(),
                ),

              const SizedBox(height: 20),

              // 菜单项
              const SectionTitle('更多'),
              ...[
                _MenuItem(Icons.bookmark_border, '我的收藏',
                    () => context.go('/explore')),
                _MenuItem(Icons.history, '学习记录',
                    () => context.go('/learning')),
                _MenuItem(Icons.settings_outlined, '设置',
                    () => _showSettings(context)),
              ].asMap().entries.map((e) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkListTile(
                    title: e.value.label,
                    onTap: e.value.onTap,
                  )
                  .animate(delay: (e.key * 60 + 400).ms)
                  .fade(duration: 300.ms),
                );
              }),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthState auth) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: InkColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: InkColors.border),
        ),
        title: const Text('退出登录', style: TextStyle(color: InkColors.textPrimary)),
        content: const Text('确定要退出吗？', style: TextStyle(color: InkColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消', style: TextStyle(color: InkColors.textSecondary)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              auth.logout();
            },
            child: const Text('退出', style: TextStyle(color: InkColors.cinnabar)),
          ),
        ],
      ),
    );
  }

  void _showSettings(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: InkColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('服务器设置', style: TextStyle(
                color: InkColors.textSecondary,
                fontSize: 12,
                letterSpacing: 1,
              )),
              const SizedBox(height: 8),
              Text('当前地址：${ApiClient.baseUrl}', style: const TextStyle(
                color: InkColors.textPrimary,
                fontSize: 13,
              )),
              const SizedBox(height: 4),
              const Text('如需更改 IP，请修改 lib/core/constants.dart 中的 kBaseUrl', style: TextStyle(
                color: InkColors.textDisabled,
                fontSize: 11,
              )),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuItem(this.icon, this.label, this.onTap);
}
