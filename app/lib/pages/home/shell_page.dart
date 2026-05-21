import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';

class ShellPage extends StatelessWidget {
  final Widget child;
  const ShellPage({super.key, required this.child});

  static const _tabs = [
    (path: '/home',    icon: Icons.home_outlined,         active: Icons.home,            label: '首页'),
    (path: '/agri',    icon: Icons.eco_outlined,          active: Icons.eco,             label: '农事'),
    (path: '/ai',      icon: Icons.smart_toy_outlined,    active: Icons.smart_toy,       label: 'AI 助手'),
    (path: '/service', icon: Icons.grid_view_outlined,    active: Icons.grid_view,       label: '服务'),
    (path: '/profile', icon: Icons.person_outline,        active: Icons.person,          label: '我的'),
  ];

  int _index(String loc) {
    for (var i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).uri.path;
    final idx = _index(loc);
    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: idx,
          onTap: (i) => context.go(_tabs[i].path),
          items: [
            for (var i = 0; i < _tabs.length; i++)
              BottomNavigationBarItem(
                icon: Icon(idx == i ? _tabs[i].active : _tabs[i].icon),
                label: _tabs[i].label,
              ),
          ],
        ),
      ),
    );
  }
}
