import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';

class ShellPage extends StatelessWidget {
  final Widget child;

  const ShellPage({super.key, required this.child});

  static const _tabs = [
    _Tab('/home',     Icons.home_outlined,         Icons.home,            '首页'),
    _Tab('/explore',  Icons.explore_outlined,       Icons.explore,         '探索'),
    _Tab('/ai',       Icons.auto_awesome_outlined,  Icons.auto_awesome,    'AI'),
    _Tab('/learning', Icons.school_outlined,        Icons.school,          '学习'),
    _Tab('/profile',  Icons.person_outline,         Icons.person,          '我的'),
  ];

  int _currentIndex(String location) {
    for (var i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final idx = _currentIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: InkColors.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: idx,
          onTap: (i) => context.go(_tabs[i].path),
          items: _tabs.map((t) => BottomNavigationBarItem(
            icon: Icon(t.icon),
            activeIcon: Icon(t.activeIcon, color: InkColors.gold),
            label: t.label,
          )).toList(),
        ),
      ),
    );
  }
}

class _Tab {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _Tab(this.path, this.icon, this.activeIcon, this.label);
}
