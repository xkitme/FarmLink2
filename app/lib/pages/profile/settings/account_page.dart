import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../models/user.dart';
import 'profile_media.dart';

/// 个人界面（只读）——「推特/X 资料页」版式：封面 banner + 叠压头像 + 名字/@账号/
/// 角色·村庄元信息 + 成长值与等级阶梯。右上「编辑资料」进入独立编辑页。
/// 编辑全部字段（含头像 / banner / 账号 / 手机号等）在 `account_edit_page.dart`。
class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage>
    with SingleTickerProviderStateMixin {
  static const String _bannerFallback =
      'assets/images/generated/smart-farming.jpg';
  static const double _bannerH = 150;
  static const double _avatar = 84;
  static const double _overhang = 44;

  late final AnimationController _intro;
  GrowthInfo? _growth;

  @override
  void initState() {
    super.initState();
    _intro = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 850))
      ..forward();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    // 拉成长值；顺带刷新资料，保证编辑返回后看到最新值。
    try {
      await context.read<AuthState>().refreshProfile();
    } catch (_) {}
    try {
      final data = await ApiClient.get('/user/growth');
      if (!mounted) return;
      if (data is Map) {
        setState(() =>
            _growth = GrowthInfo.fromJson(Map<String, dynamic>.from(data)));
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _intro.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          _reveal(0, _header(context, user)),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _reveal(1, _eyebrow('账号资料')),
                _reveal(1, _infoRow('账号', user?.username ?? '-')),
                _reveal(1, const Divider(height: 1)),
                _reveal(1, _infoRow('真实姓名', _orDash(user?.realName))),
                _reveal(1, const Divider(height: 1)),
                _reveal(2, _infoRow('手机号', _orDash(user?.phone))),
                _reveal(2, const Divider(height: 1)),
                _reveal(2, _infoRow('所属村', _orDash(user?.villageName))),
                _reveal(2, const Divider(height: 1)),
                _reveal(2, _infoRow('角色', kRoleLabels[user?.role] ?? '普通农户')),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _reveal(int step, Widget child) {
    final start = (step * 0.1).clamp(0.0, 0.6);
    final anim = CurvedAnimation(
      parent: _intro,
      curve: Interval(start, (start + 0.5).clamp(0.0, 1.0),
          curve: Curves.easeOutCubic),
    );
    return AnimatedBuilder(
      animation: anim,
      builder: (_, c) => Opacity(
        opacity: anim.value,
        child: Transform.translate(
          offset: Offset(0, (1 - anim.value) * 14),
          child: c,
        ),
      ),
      child: child,
    );
  }

  // ── 推特式头部 ────────────────────────────────────────────
  Widget _header(BuildContext context, dynamic user) {
    final topInset = MediaQuery.of(context).padding.top;
    final g = _growth;
    final initial = (user?.displayName as String?)?.isNotEmpty == true
        ? (user!.displayName as String).substring(0, 1)
        : null;
    const stackH = _bannerH + (_avatar - _overhang);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: stackH,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: _bannerH,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ProfileBanner(
                        url: user?.bannerUrl as String?,
                        fallbackAsset: _bannerFallback),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x4D000000), Color(0x00000000)],
                          stops: [0.0, 0.4],
                        ),
                      ),
                    ),
                    Positioned(
                        top: topInset + 8,
                        left: 8,
                        child: _circleBack(context)),
                  ],
                ),
              ),
              Positioned(
                left: 16,
                top: _bannerH - _overhang,
                child: ProfileAvatar(
                    url: user?.avatarUrl as String?,
                    initial: initial,
                    size: _avatar),
              ),
              Positioned(
                right: 16,
                top: _bannerH + 12,
                child: OutlinedButton(
                  onPressed: () =>
                      context.push('/profile/settings/account/edit'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 38),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    side: const BorderSide(
                        color: AppColors.outlineVariant, width: 1.5),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(R.sm)),
                  ),
                  child: const Text('编辑资料',
                      style:
                          TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      user?.displayName ?? '未登录',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 23,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                  if (g != null) ...[
                    const SizedBox(width: 8),
                    _levelPill(g),
                  ],
                ],
              ),
              const SizedBox(height: 2),
              Text(
                user == null ? '@未登录' : '@${user.username}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 14),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 16,
                runSpacing: 6,
                children: [
                  _metaItem(
                      Icons.badge_outlined, kRoleLabels[user?.role] ?? '普通农户'),
                  _metaItem(Icons.place_outlined, user?.villageName ?? '幸福村'),
                ],
              ),
              if (g != null) ...[
                const SizedBox(height: 16),
                _growthHeader(g),
                const SizedBox(height: 12),
                _LevelLadder(g),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _levelPill(GrowthInfo g) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.gold.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.gold, width: 1.2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.spa_rounded, size: 12, color: AppColors.tertiary),
            const SizedBox(width: 3),
            Text(
              'Lv${g.level} ${g.levelName}',
              style: const TextStyle(
                  color: AppColors.tertiary,
                  fontSize: 11,
                  fontWeight: FontWeight.w800),
            ),
          ],
        ),
      );

  Widget _metaItem(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(text,
              style: const TextStyle(
                  color: AppColors.onSurfaceVariant, fontSize: 13)),
        ],
      );

  Widget _growthHeader(GrowthInfo g) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text('${g.growth}',
              style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  height: 1.0)),
          const Padding(
            padding: EdgeInsets.only(left: 5, bottom: 2),
            child: Text('成长值',
                style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 13,
                    fontWeight: FontWeight.w600)),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text(g.headline,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 12.5)),
          ),
        ],
      );

  Widget _circleBack(BuildContext context) => Material(
        color: Colors.black.withValues(alpha: 0.32),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => context.canPop()
              ? context.pop()
              : context.go('/profile/settings'),
          child: const Padding(
            padding: EdgeInsets.all(7),
            child: Icon(Icons.arrow_back, color: Colors.white, size: 20),
          ),
        ),
      );

  Widget _eyebrow(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: const TextStyle(
                fontSize: 12,
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                letterSpacing: 2)),
      );

  Widget _infoRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 13),
        child: Row(
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 14)),
            const Spacer(),
            Flexible(
              child: Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 15,
                      fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );

  static String _orDash(String? v) =>
      (v == null || v.trim().isEmpty) ? '未填写' : v;
}

/// 成长等级阶梯（浅底版）：6 档节点 + 连接段，已过=主绿实心，当前=放大主绿+麦金环，
/// 当前→下一档之间按 progress 部分填充，未达=浅描边空心。
class _LevelLadder extends StatelessWidget {
  final GrowthInfo g;
  const _LevelLadder(this.g);

  static const _tiers = ['新芽', '幼苗', '拔节', '抽穗', '金穗', '丰仓'];
  static const _slot = 26.0;

  int get _cur => (g.level - 1).clamp(0, 5);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(children: _nodeRow()),
        const SizedBox(height: 7),
        Row(children: _labelRow()),
      ],
    );
  }

  List<Widget> _nodeRow() {
    final out = <Widget>[];
    for (var i = 0; i < 6; i++) {
      out.add(SizedBox(width: _slot, child: Center(child: _node(i))));
      if (i < 5) out.add(Expanded(child: _segment(i)));
    }
    return out;
  }

  List<Widget> _labelRow() {
    final out = <Widget>[];
    for (var i = 0; i < 6; i++) {
      final active = i == _cur;
      out.add(SizedBox(
        width: _slot,
        child: Text(
          _tiers[i],
          textAlign: TextAlign.center,
          maxLines: 1,
          style: TextStyle(
            fontSize: 10,
            letterSpacing: -0.2,
            fontWeight: active ? FontWeight.w800 : FontWeight.w500,
            color: active ? AppColors.primary : AppColors.onSurfaceVariant,
          ),
        ),
      ));
      if (i < 5) out.add(const Expanded(child: SizedBox()));
    }
    return out;
  }

  Widget _node(int i) {
    if (i < _cur) return _dot(11, AppColors.primary, null);
    if (i == _cur) return _dot(18, AppColors.primary, AppColors.gold);
    return _dot(11, AppColors.outlineVariant, null);
  }

  Widget _dot(double size, Color color, Color? ring) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          border: ring != null ? Border.all(color: ring, width: 2.5) : null,
        ),
      );

  Widget _segment(int i) {
    final double frac = i < _cur
        ? 1.0
        : (i == _cur ? (g.isMax ? 1.0 : g.progress.clamp(0.0, 1.0)) : 0.0);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: Stack(
          children: [
            Container(height: 4, color: AppColors.outlineVariant),
            FractionallySizedBox(
              widthFactor: frac,
              child: Container(height: 4, color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}
