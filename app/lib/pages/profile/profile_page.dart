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
    // 在 await 之前捕获，避免跨异步间隙用 context
    final auth = context.read<AuthState>();
    // 待发送队列始终先取，保证同步卡入口在服务响应异常时仍可见。
    var queue = _queue;
    try {
      queue = await OfflineSyncQueue.all();
    } catch (_) {}
    try {
      await auth.refreshProfile();
      final results = await Future.wait<dynamic>([
        ApiClient.get('/data/dashboard'),
        ApiClient.get('/data/sync/status'),
      ]);
      if (!mounted) return;
      setState(() {
        _dashboard = _map(results[0]);
        _syncStatus = _map(results[1]);
        _queue = queue;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      // 服务端数据读取失败：保留待发送队列，降级为内联提示，不整屏报错。
      if (!mounted) return;
      setState(() {
        _queue = queue;
        _error = serviceErrorMessage(e);
        _loading = false;
      });
    }
    final waiting =
        _queue.where((item) => item.status != SyncStatus.synced).length;
    if (triggerAutoSync && waiting > 0 && !_autoSyncing) {
      _autoSyncSilently();
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
      appBar: const FarmAppBar(title: '我的'),
      body: _loading
          ? const Loading(text: '正在读取个人数据')
          // 只有在「无缓存用户、也无任何数据」时才整屏报错；
          // 否则降级渲染缓存用户与待发送队列，保留 G7 重试入口。
          : (_error != null && user == null && _dashboard.isEmpty)
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.primary,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                    children: [
                      if (_error != null) ...[
                        AlertBanner(_error!, critical: false),
                        const SizedBox(height: 12),
                      ],
                      // 渐变 hero + 概览卡（概览卡上移 24，叠压 hero 底缘）
                      _profileHero(context, user),
                      Transform.translate(
                        offset: const Offset(0, -24),
                        child: _overview(context, cards),
                      ),
                      _entryCards(context),
                      const SizedBox(height: 16),
                      _syncPanel(),
                      const SectionTitle('我的事务'),
                      _taskGrid(context),
                      const SizedBox(height: 24),
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

  // ── Hero：绿色渐变 + 圆形头像 + 成长值 + 角色/村庄徽标 ──────────
  Widget _profileHero(BuildContext context, dynamic user) {
    final points = _int(user?.points);
    final nextLevelAt = ((points ~/ 100) + 1) * 100;
    final remaining = nextLevelAt - points;
    final growthText = user == null ? '登录后解锁成长体系' : '距下一等级还差 $remaining 成长值';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push('/profile/settings/account'),
        borderRadius: BorderRadius.circular(R.md),
        child: Container(
          decoration: BoxDecoration(
            gradient: AppColors.heroGradient,
            borderRadius: BorderRadius.circular(R.md),
            boxShadow: AppColors.ambientShadow,
          ),
          padding: const EdgeInsets.fromLTRB(20, 22, 16, 40),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // 右侧淡水印
              Positioned(
                right: -6,
                top: -6,
                child: Icon(
                  Icons.agriculture,
                  size: 92,
                  color: Colors.white.withValues(alpha: 0.10),
                ),
              ),
              Row(
                children: [
                  // 圆形头像 + 白环
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.15),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.72),
                        width: 2,
                      ),
                    ),
                    child:
                        const Icon(Icons.person, size: 34, color: Colors.white),
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
                            fontSize: 21,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.trending_up_rounded,
                                size: 15,
                                color: Colors.white.withValues(alpha: 0.85)),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                growthText,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.85),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            _heroBadge(kRoleLabels[user?.role] ?? '农户'),
                            _heroBadge(user?.villageName ?? '幸福村'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right,
                      color: Colors.white.withValues(alpha: 0.85)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _heroBadge(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      );

  // ── 概览：4 项数据，叠压在 hero 底部的白卡 ──────────────────
  Widget _overview(BuildContext context, Map<String, dynamic> cards) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          _stat(context, '地块', _int(cards['plotCount']), '/agri'),
          _divider(),
          _stat(context, '农事', _int(cards['recordCount']), '/agri'),
          _divider(),
          _stat(context, '订单', _int(cards['orderCount']), '/market'),
          _divider(),
          _stat(context, 'AI', _int(cards['aiCallCount']), '/ai'),
        ],
      ),
    );
  }

  Widget _stat(BuildContext context, String label, int value, String route) =>
      Expanded(
        child: InkWell(
          onTap: () => context.push(route),
          borderRadius: BorderRadius.circular(R.sm),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                Text('$value',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
          ),
        ),
      );

  Widget _divider() =>
      Container(width: 1, height: 30, color: AppColors.outlineVariant);

  // ── 两张大入口卡：我的订单 / 我的发布 ───────────────────────
  Widget _entryCards(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _entryCard(
            context,
            icon: Icons.receipt_long_outlined,
            tint: AppColors.primary,
            title: '我的订单',
            subtitle: '查看全部订单',
            route: '/market',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _entryCard(
            context,
            icon: Icons.campaign_outlined,
            tint: AppColors.secondary,
            title: '我的发布',
            subtitle: '管理我的发布',
            route: '/publish',
          ),
        ),
      ],
    );
  }

  Widget _entryCard(
    BuildContext context, {
    required IconData icon,
    required Color tint,
    required String title,
    required String subtitle,
    required String route,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push(route),
        borderRadius: BorderRadius.circular(R.md),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(R.md),
            border: Border.all(color: AppColors.outlineVariant, width: 1),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.sm),
                ),
                child: Icon(icon, color: tint, size: 22),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _syncPanel() {
    final waiting =
        _queue.where((item) => item.status != SyncStatus.synced).length;
    final failed = _int(_syncStatus['failed']);
    final conflict = _int(_syncStatus['conflict']);
    final total = _int(_syncStatus['total']);
    final hasError = (failed + conflict + waiting) > 0;
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

    return _flatBox(
      Column(
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
                    borderRadius: BorderRadius.circular(R.sm),
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
          if (hasError)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _autoSyncing ? null : _autoSyncSilently,
                      icon: const Icon(Icons.refresh, size: 16),
                      label: Text(_autoSyncing ? '同步中' : '立即重试'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextButton.icon(
                      onPressed: () => context.push('/data/service'),
                      icon: const Icon(Icons.list_alt, size: 16),
                      label: const Text('查看详情'),
                    ),
                  ),
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
      // G7：有待发送/失败/冲突时，卡片本身不再整块跳转，改露重试入口
      onTap: hasError ? null : () => context.push('/data/service'),
      padding: EdgeInsets.zero,
    );
  }

  // ── 我的事务：4 列图标宫格 ──────────────────────────────────
  Widget _taskGrid(BuildContext context) {
    const items = <_TaskItem>[
      _TaskItem(Icons.eco_outlined, '农事记录', '/agri'),
      _TaskItem(Icons.thunderstorm_outlined, '灾情记录', '/disaster'),
      _TaskItem(Icons.assignment_turned_in_outlined, '政策申请', '/policy/service'),
      _TaskItem(Icons.insights_outlined, '数据看板', '/data'),
      _TaskItem(Icons.notifications_none_rounded, '消息通知', '/messages'),
      _TaskItem(Icons.agriculture_outlined, '农机服务', '/machinery/service'),
      _TaskItem(Icons.elderly_outlined, '适老模式', '/profile/settings/elder',
          badge: '新'),
      _TaskItem(Icons.settings_outlined, '设置', '/profile/settings'),
    ];

    return _flatBox(
      GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 4,
        crossAxisSpacing: 4,
        childAspectRatio: 0.92,
        children: [
          for (final item in items) _taskCell(context, item),
        ],
      ),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
    );
  }

  Widget _taskCell(BuildContext context, _TaskItem item) {
    return InkWell(
      onTap: () => context.push(item.route),
      borderRadius: BorderRadius.circular(R.sm),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(R.sm),
                ),
                child: Icon(item.icon, color: AppColors.primary, size: 24),
              ),
              if (item.badge != null)
                Positioned(
                  right: -6,
                  top: -6,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(R.sm),
                    ),
                    child: Text(item.badge!,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }

  Widget _flatBox(Widget child,
      {VoidCallback? onTap,
      EdgeInsetsGeometry padding = const EdgeInsets.all(16)}) {
    final box = Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
      ),
      padding: padding,
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.md),
        child: box,
      ),
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

class _TaskItem {
  final IconData icon;
  final String label;
  final String route;
  final String? badge;
  const _TaskItem(this.icon, this.label, this.route, {this.badge});
}
