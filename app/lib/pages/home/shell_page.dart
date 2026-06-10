import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../core/notification_state.dart';

class ShellPage extends StatefulWidget {
  final Widget child;
  final String location;
  const ShellPage({super.key, required this.child, required this.location});

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  String? _lastLocation;

  static const _tabPaths = {
    '/home',
    '/all',
    '/search',
    '/ai',
    '/publish',
    '/messages',
    '/profile',
  };

  static const _tabs = [
    (path: '/home', icon: Icons.home_rounded, label: '首页'),
    (path: '/ai', icon: Icons.smart_toy_rounded, label: 'AI 农技'),
    (path: '/publish', icon: Icons.add_circle_rounded, label: '发布'),
    (path: '/messages', icon: Icons.mail_rounded, label: '消息'),
    (path: '/profile', icon: Icons.person_rounded, label: '我的'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final loc = widget.location;
    if (_lastLocation == loc) return;
    _lastLocation = loc;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) NotificationState.refresh();
    });
  }

  @override
  void didUpdateWidget(covariant ShellPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.location != widget.location) {
      _lastLocation = widget.location;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) NotificationState.refresh();
      });
    }
  }

  int _index(String loc) {
    for (var i = 0; i < _tabs.length; i++) {
      if (loc == _tabs[i].path) return i;
    }
    return -1;
  }

  bool _isTopLevelTab(String loc) => _tabPaths.contains(loc);

  @override
  Widget build(BuildContext context) {
    final loc = widget.location;
    final showBar = _isTopLevelTab(loc);
    final idx = _index(loc);
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: showBar ? _navBar(idx) : null,
    );
  }

  Widget _navBar(int idx) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.sm)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              for (var i = 0; i < _tabs.length; i++)
                ValueListenableBuilder<int>(
                  valueListenable: NotificationState.unread,
                  builder: (context, unread, _) => _NavItem(
                    icon: _tabs[i].icon,
                    label: _tabs[i].label,
                    active: idx == i,
                    badgeCount: _tabs[i].path == '/messages' ? unread : 0,
                    onTap: () => context.go(_tabs[i].path),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final int badgeCount;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.badgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : AppColors.onSurfaceVariant;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(R.sm),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? AppColors.primaryContainer.withValues(alpha: 0.16)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 34,
              height: 28,
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  Icon(icon, color: color, size: 26),
                  if (badgeCount > 0)
                    Positioned(
                      right: -3,
                      top: -3,
                      child: _UnreadBadge(count: badgeCount),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  color: color,
                )),
          ],
        ),
      ),
    );
  }
}

class _UnreadBadge extends StatelessWidget {
  final int count;
  const _UnreadBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    final text = count > 99 ? '99+' : '$count';
    return Container(
      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: AppColors.error,
        border: Border.all(color: AppColors.surface, width: 2),
        borderRadius: BorderRadius.circular(99),
      ),
      alignment: Alignment.center,
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          height: 1,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
