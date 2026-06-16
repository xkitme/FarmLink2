import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../core/site_images.dart';
import '../../../models/user.dart';
import '../../../widgets/common.dart';

/// 个人资料 ——「推特/X 资料页」版式：顶部宽幅封面 banner + 圆形头像叠压在 banner
/// 左下缘（背景色描边「抠出」效果），其下名字 / @账号 / 角色·村庄元信息，再接成长值
/// 与等级阶梯。下方无卡片，按「认证信息 / 个人资料」分组，载入逐段渐入。
/// 账号/角色只读；昵称/真实姓名/手机号/所属村可编辑，保存走 PUT /user/profile。
class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage>
    with SingleTickerProviderStateMixin {
  static const String _banner = 'assets/images/generated/smart-farming.jpg';
  static const double _bannerH = 150;
  static const double _avatar = 84;
  static const double _overhang = 44;

  late final TextEditingController _nickname;
  late final TextEditingController _realName;
  late final TextEditingController _phone;
  late final TextEditingController _village;
  late final AnimationController _intro;
  bool _saving = false;
  GrowthInfo? _growth;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthState>().user;
    _nickname = TextEditingController(text: user?.nickname ?? '');
    _realName = TextEditingController(text: user?.realName ?? '');
    _phone = TextEditingController(text: user?.phone ?? '');
    _village = TextEditingController(text: user?.villageName ?? '');
    _intro = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 850))
      ..forward();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadGrowth());
  }

  Future<void> _loadGrowth() async {
    try {
      final data = await ApiClient.get('/user/growth');
      if (!mounted) return;
      if (data is Map) {
        setState(() =>
            _growth = GrowthInfo.fromJson(Map<String, dynamic>.from(data)));
      }
    } catch (_) {
      // 成长值读取失败不阻断资料编辑，静默降级（隐藏成长阶梯）。
    }
  }

  @override
  void dispose() {
    _nickname.dispose();
    _realName.dispose();
    _phone.dispose();
    _village.dispose();
    _intro.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final nickname = _nickname.text.trim();
    final phone = _phone.text.trim();
    if (nickname.isEmpty) {
      toast(context, '昵称不能为空', error: true);
      return;
    }
    if (phone.isNotEmpty && !RegExp(r'^1\d{10}$').hasMatch(phone)) {
      toast(context, '请输入有效的 11 位手机号', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ApiClient.put('/user/profile', body: {
        'nickname': nickname,
        'realName': _realName.text.trim(),
        'phone': phone,
        'villageName': _village.text.trim(),
      });
      if (!mounted) return;
      await context.read<AuthState>().refreshProfile();
      if (!mounted) return;
      toast(context, '资料已更新');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('保存', e), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
                _reveal(1, _eyebrow('认证信息')),
                _reveal(1, _readonlyRow('账号', user?.username ?? '-')),
                _reveal(1, const Divider(height: 1)),
                _reveal(
                    1, _readonlyRow('角色', kRoleLabels[user?.role] ?? '普通农户')),
                const SizedBox(height: 26),
                _reveal(2, _eyebrow('个人资料')),
                _reveal(2,
                    _field(controller: _nickname, label: '昵称', maxLength: 20)),
                _reveal(
                    3,
                    _field(
                      controller: _realName,
                      label: '真实姓名',
                      hint: '便于村委核验身份',
                      maxLength: 20,
                    )),
                _reveal(
                    3,
                    _field(
                      controller: _phone,
                      label: '手机号',
                      hint: '11 位手机号，便于接收通知',
                      maxLength: 11,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    )),
                _reveal(
                    4,
                    _field(
                      controller: _village,
                      label: '所属村',
                      hint: '如：青禾村',
                      maxLength: 40,
                    )),
                const SizedBox(height: 26),
                _reveal(
                    5,
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _save,
                        child: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('保存修改'),
                      ),
                    )),
                const SizedBox(height: 12),
                _reveal(
                    5,
                    const Center(
                      child: Text(
                        '账号如需变更，请联系村委或管理员',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.onSurfaceVariant),
                      ),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 载入逐段渐入：按 step 错峰，淡入 + 轻微上移。
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

  // ── 推特式头部：封面 banner + 叠压头像 + 名字/@账号/元信息 + 成长 ──────
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
              // 封面 banner
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: _bannerH,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    const SiteImage(_banner, fit: BoxFit.cover),
                    // 顶部轻压暗：保证返回箭头可读
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
              // 头像：叠压 banner 左下缘，背景色描边「抠出」
              Positioned(
                left: 16,
                top: _bannerH - _overhang,
                child: _avatarWidget(initial),
              ),
              // 等级胶囊：banner 右下、名字行之上（对应推特「编辑资料」位）
              if (g != null)
                Positioned(right: 16, top: _bannerH + 12, child: _levelPill(g)),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
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
              const SizedBox(height: 2),
              Text(
                user == null ? '@未登录' : '@${user.username}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 14,
                ),
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

  Widget _avatarWidget(String? initial) => Container(
        width: _avatar,
        height: _avatar,
        padding: const EdgeInsets.all(4),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.background,
        ),
        child: Container(
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [Color(0xFF2E7D32), Color(0xFF0D631B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: initial != null
              ? Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                  ),
                )
              : const Icon(Icons.person, size: 40, color: Colors.white),
        ),
      );

  Widget _levelPill(GrowthInfo g) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.gold.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.gold, width: 1.2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.spa_rounded, size: 13, color: AppColors.tertiary),
            const SizedBox(width: 4),
            Text(
              'Lv${g.level} ${g.levelName}',
              style: const TextStyle(
                color: AppColors.tertiary,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );

  Widget _metaItem(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
                color: AppColors.onSurfaceVariant, fontSize: 13),
          ),
        ],
      );

  /// 成长值大字 + 距下一级文案
  Widget _growthHeader(GrowthInfo g) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '${g.growth}',
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              height: 1.0,
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(left: 5, bottom: 2),
            child: Text(
              '成长值',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text(
              g.headline,
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12.5,
              ),
            ),
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

  // ── 下方分组 ────────────────────────────────────────────
  Widget _eyebrow(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.primary,
            fontWeight: FontWeight.w700,
            letterSpacing: 2,
          ),
        ),
      );

  Widget _readonlyRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 13),
        child: Row(
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.onSurfaceVariant, fontSize: 14)),
            const Spacer(),
            Text(value,
                style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 15,
                    fontWeight: FontWeight.w700)),
          ],
        ),
      );

  /// 利落方角小圆角 + 描边输入框（R.sm），禁胶囊
  Widget _field({
    required TextEditingController controller,
    required String label,
    String? hint,
    int? maxLength,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
  }) {
    OutlineInputBorder border(Color color, double width) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.sm),
          borderSide: BorderSide(color: color, width: width),
        );
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        enabled: !_saving,
        maxLength: maxLength,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          counterText: '',
          filled: true,
          fillColor: AppColors.surface,
          enabledBorder: border(AppColors.outlineVariant, 1),
          focusedBorder: border(AppColors.primary, 1.5),
          disabledBorder: border(AppColors.outlineVariant, 1),
        ),
      ),
    );
  }
}

/// 作物成长等级阶梯（浅底版）：6 档节点 + 连接段，已过=主绿实心，当前=放大主绿+麦金环，
/// 当前→下一档之间按 progress 部分填充，未达=浅描边空心。一图说清「我在哪、还差多少」。
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
