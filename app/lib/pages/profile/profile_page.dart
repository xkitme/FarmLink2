import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _loading = true;
  bool _autoSyncing = false;
  String? _error;
  Map<String, dynamic> _dashboard = {};
  Map<String, dynamic> _syncStatus = {};
  List<SyncQueueItem> _queue = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool triggerAutoSync = true}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().refreshProfile();
      final results = await Future.wait<dynamic>([
        ApiClient.get('/data/dashboard'),
        ApiClient.get('/data/sync/status'),
        OfflineSyncQueue.all(),
      ]);
      if (!mounted) return;
      setState(() {
        _dashboard = _map(results[0]);
        _syncStatus = _map(results[1]);
        _queue = results[2] as List<SyncQueueItem>;
        _loading = false;
      });
      final waiting =
          _queue.where((item) => item.status != SyncStatus.synced).length;
      if (triggerAutoSync && waiting > 0 && !_autoSyncing) {
        _autoSyncSilently();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = serviceErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _autoSyncSilently() async {
    if (_autoSyncing || !mounted) return;
    setState(() => _autoSyncing = true);
    try {
      await OfflineSyncQueue.flush();
    } catch (_) {
      // 静默处理，结果通过下一次刷新体现。
    } finally {
      if (mounted) {
        setState(() => _autoSyncing = false);
        await _load(triggerAutoSync: false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user;
    final cards = _map(_dashboard['cards']);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: _loading
          ? const Loading(text: '正在读取个人数据')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.primary,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                    children: [
                      _profileHero(user),
                      const SizedBox(height: 16),
                      _overview(cards),
                      const SizedBox(height: 16),
                      _syncPanel(),
                      const SectionTitle('我的事务'),
                      _menuPanel(context),
                      const SizedBox(height: 20),
                      OutlinedButton.icon(
                        onPressed: () async {
                          await auth.logout();
                          if (context.mounted) context.go('/auth/login');
                        },
                        icon: const Icon(Icons.logout_rounded, size: 18),
                        label: const Text('退出登录'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.error,
                          side: const BorderSide(
                              color: AppColors.error, width: 2),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _profileHero(dynamic user) {
    return Container(
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
                Text(
                  user?.displayName ?? '未登录',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _whiteBadge(kRoleLabels[user?.role] ?? '农户'),
                    _whiteBadge(user?.villageName ?? '幸福村'),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.stars_rounded,
                            color: AppColors.gold, size: 16),
                        const SizedBox(width: 3),
                        Text(
                          '${user?.points ?? 0} 积分',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _whiteBadge(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.20),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Text(
          text,
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
      );

  Widget _overview(Map<String, dynamic> cards) {
    return AppCard(
      child: Row(
        children: [
          _stat('地块', '${_int(cards['plotCount'])}'),
          _divider(),
          _stat('农事', '${_int(cards['recordCount'])}'),
          _divider(),
          _stat('订单', '${_int(cards['orderCount'])}'),
          _divider(),
          _stat('AI', '${_int(cards['aiCallCount'])}'),
        ],
      ),
    );
  }

  Widget _syncPanel() {
    final waiting =
        _queue.where((item) => item.status != SyncStatus.synced).length;
    final failed = _int(_syncStatus['failed']);
    final conflict = _int(_syncStatus['conflict']);
    final total = _int(_syncStatus['total']);
    String stateLabel;
    Color stateColor;
    if (_autoSyncing) {
      stateLabel = '同步中';
      stateColor = AppColors.primary;
    } else if (waiting > 0) {
      stateLabel = '待发送 $waiting';
      stateColor = AppColors.warning;
    } else if (failed > 0 || conflict > 0) {
      stateLabel = '失败 ${failed + conflict}';
      stateColor = AppColors.error;
    } else {
      stateLabel = '已同步';
      stateColor = AppColors.primary;
    }

    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => context.push('/data/service'),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: const Icon(Icons.sync_alt_rounded,
                      color: AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '数据同步',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '已同步 $total 条，待发送 $waiting 条',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:
                            const TextStyle(color: AppColors.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusChip(stateLabel, color: stateColor),
              ],
            ),
          ),
          if (_autoSyncing)
            const LinearProgressIndicator(
              minHeight: 2,
              backgroundColor: Colors.transparent,
              color: AppColors.primary,
            ),
        ],
      ),
    );
  }

  Widget _menuPanel(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _menu(context, Icons.receipt_long_outlined, '我的订单', '/market'),
          _line(),
          _menu(context, Icons.add_circle_outline, '我的发布', '/publish'),
          _line(),
          _menu(context, Icons.eco_outlined, '农事记录', '/agri'),
          _line(),
          _menu(context, Icons.thunderstorm_outlined, '灾情记录', '/disaster'),
          _line(),
          _menu(context, Icons.assignment_turned_in_outlined, '政策申请',
              '/policy/service'),
          _line(),
          _menu(context, Icons.notifications_none_rounded, '消息通知', '/messages'),
          _line(),
          _menu(context, Icons.settings_outlined, '设置', '/profile/settings'),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.onSurfaceVariant)),
          ],
        ),
      );

  Widget _divider() =>
      Container(width: 1, height: 32, color: AppColors.outlineVariant);

  Widget _line() => const Divider(height: 1, indent: 56);

  Widget _menu(
      BuildContext context, IconData icon, String label, String route) {
    return _menuAction(context, icon, label, () => context.push(route));
  }

  Widget _menuAction(
      BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primary),
      title: Text(label, style: const TextStyle(fontSize: 15)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.outline),
      onTap: onTap,
    );
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map) {
      return value.map((key, value) => MapEntry('$key', value));
    }
    return {};
  }

  static int _int(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }
}
