import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../core/notification_state.dart';
import '../../widgets/voice_assistant_layer.dart';

class ShellPage extends StatefulWidget {
  final Widget child;
  final String location;
  const ShellPage({super.key, required this.child, required this.location});

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  String? _lastLocation;

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

  @override
  Widget build(BuildContext context) {
    // 底栏只在精确等于 5 个一级 tab 的路径显示；二级页（/search /all /market…）不展示。
    final idx = _index(widget.location);
    // 助手覆盖层包住整个 Scaffold（含底部导航栏），激活时跑马灯边框与底栏才能盖住导航栏。
    return VoiceAssistantLayer(
      location: widget.location,
      enabled: idx >= 0,
      child: Scaffold(
        body: widget.child,
        bottomNavigationBar: idx >= 0 ? _navBar(idx) : null,
      ),
    );
  }

  Widget _navBar(int idx) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Color(0x24000000),
            blurRadius: 14,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 7, 8, 6),
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
                    prominent: _tabs[i].path == '/publish',
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
  final bool prominent;
  final int badgeCount;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    this.prominent = false,
    required this.badgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : const Color(0xFFBFC3C2);
    if (prominent) {
      return Expanded(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(R.pill),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 54,
                height: 44,
                decoration: BoxDecoration(
                  gradient: AppColors.authButtonGradient,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x4D40916C),
                      blurRadius: 16,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 30),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                  color: active ? AppColors.primary : AppColors.outline,
                ),
              ),
            ],
          ),
        ),
      );
    }
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.md),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
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
                    fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                    color: color,
                  )),
            ],
          ),
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
