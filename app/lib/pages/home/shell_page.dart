import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/constants.dart';
import '../../core/elder_mode.dart';
import '../../core/notification_state.dart';
import '../../design_system/farm_tokens.dart';
import '../../widgets/voice_assistant_layer.dart';

/// 底部导航 tab 定义。
typedef ShellTab = ({String path, IconData icon, String label});

/// 116h-A 五项底部导航：首页 / 集市 / 发布 / 小田助手 / 我的。
///
/// 消息不再占底栏 tab，改由各一级页顶栏「铃铛」进入（见 home_page / FarmAppBar）。
const List<ShellTab> kShellTabs = [
  (path: '/home', icon: Icons.home_rounded, label: '首页'),
  (path: '/market', icon: Icons.storefront_rounded, label: '集市'),
  (path: '/publish', icon: Icons.add_circle_rounded, label: '发布'),
  (path: '/ai', icon: Icons.smart_toy_rounded, label: '小田助手'),
  (path: '/profile', icon: Icons.person_rounded, label: '我的'),
];

class ShellPage extends StatefulWidget {
  final Widget child;
  final String location;
  const ShellPage({super.key, required this.child, required this.location});

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  String? _lastLocation;

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
    for (var i = 0; i < kShellTabs.length; i++) {
      if (loc == kShellTabs[i].path) return i;
    }
    return -1;
  }

  @override
  Widget build(BuildContext context) {
    // 底栏只在精确等于 5 个一级 tab 的路径显示；二级页（/search /messages /market/…）不展示。
    final idx = _index(widget.location);
    // 适老模式：底栏放大图标、字号与触控间距（见 _NavItem）。
    final elder = context.watch<ElderModeState>().enabled;
    // 助手覆盖层包住整个 Scaffold（含底部导航栏），激活时跑马灯边框与底栏才能盖住导航栏。
    return VoiceAssistantLayer(
      location: widget.location,
      enabled: idx >= 0,
      child: Scaffold(
        body: widget.child,
        bottomNavigationBar: idx >= 0
            ? FarmShellNavBar(
                selectedIndex: idx,
                elder: elder,
                onSelect: (i) => context.go(kShellTabs[i].path),
              )
            : null,
      ),
    );
  }
}

/// 五栏底部导航条（116h-A 起独立成公开组件，便于测试与适老密度验收）。
///
/// 适老模式：图标与字号同步放大、触控目标抬高，但每个 tab 文案恒为单行——
/// 文案用固定高度盒 + `FittedBox(scaleDown)` 兜底，杜绝「小田助手」在 411 窄屏
/// 折行成两行导致的底栏高度跳动 / 相互遮挡。
class FarmShellNavBar extends StatelessWidget {
  /// 当前选中 tab 下标（对应 [kShellTabs]）。
  final int selectedIndex;

  /// 适老模式：放大图标 / 字号 / 触控密度。
  final bool elder;

  /// 点击第 i 个 tab。
  final ValueChanged<int> onSelect;

  const FarmShellNavBar({
    super.key,
    required this.selectedIndex,
    required this.elder,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
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
          padding: EdgeInsets.fromLTRB(8, elder ? 8 : 7, 8, elder ? 6 : 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              for (var i = 0; i < kShellTabs.length; i++)
                _NavItem(
                  icon: kShellTabs[i].icon,
                  label: kShellTabs[i].label,
                  active: selectedIndex == i,
                  prominent: kShellTabs[i].path == '/publish',
                  elder: elder,
                  onTap: () => onSelect(i),
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
  final bool elder;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    this.prominent = false,
    this.elder = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : const Color(0xFFBFC3C2);
    // 适老密度：图标盒与字号同步放大，但文案盒高固定为单行，FittedBox 兜底不折行。
    final labelHeight = elder ? 20.0 : 16.0;
    final labelFont = elder ? 15.0 : 12.0;
    final labelBox = SizedBox(
      width: double.infinity,
      height: labelHeight,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          label,
          maxLines: 1,
          softWrap: false,
          style: TextStyle(
            fontSize: labelFont,
            fontWeight: active ? FontWeight.w800 : FontWeight.w600,
            color: prominent
                ? (active ? AppColors.primary : AppColors.outline)
                : color,
          ),
        ),
      ),
    );
    if (prominent) {
      final size = elder ? 56.0 : 54.0;
      final height = elder ? 46.0 : 44.0;
      final iconSize = elder ? 34.0 : 30.0;
      return Expanded(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(FarmRadius.pill),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: FarmMotion.fast,
                width: size,
                height: height,
                decoration: BoxDecoration(
                  gradient: AppColors.authButtonGradient,
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x4D40916C),
                      blurRadius: 16,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: iconSize),
              ),
              const SizedBox(height: 2),
              labelBox,
            ],
          ),
        ),
      );
    }
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(FarmRadius.md),
        child: AnimatedContainer(
          duration: FarmMotion.fast,
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: elder ? 36 : 34,
                height: elder ? 30 : 28,
                child: Icon(icon, color: color, size: elder ? 30 : 26),
              ),
              const SizedBox(height: 2),
              labelBox,
            ],
          ),
        ),
      ),
    );
  }
}
