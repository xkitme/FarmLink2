import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../models/user.dart';
import '../../../widgets/common.dart';

/// 个人资料 ——「成长档案」版式。
///
/// 弃用早前「整幅人物配图叠白字」做法（图与字互相打架、观感诡异），改为品牌自有
/// 材质构筑的深绿 hero：手绘等高线纹理（农田地形隐喻）+ 麦金高亮 + 作物成长等级
/// 阶梯（新芽→丰仓）。下方无卡片，按「认证信息 / 个人资料」分组，载入逐段渐入。
/// 账号/角色只读；昵称/真实姓名/手机号/所属村可编辑，保存走 PUT /user/profile。
class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage>
    with SingleTickerProviderStateMixin {
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
        vsync: this, duration: const Duration(milliseconds: 900))
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
      body: Column(
        children: [
          _reveal(0, _hero(context, user)),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
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
          offset: Offset(0, (1 - anim.value) * 16),
          child: c,
        ),
      ),
      child: child,
    );
  }

  // ── 深绿成长档案 hero：等高线纹理 + 头像 + 等级 + 成长阶梯 ─────────
  Widget _hero(BuildContext context, dynamic user) {
    final topInset = MediaQuery.of(context).padding.top;
    final g = _growth;
    final initial = (user?.displayName as String?)?.isNotEmpty == true
        ? (user!.displayName as String).substring(0, 1)
        : null;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF114F1C), Color(0xFF0A4915), Color(0xFF073A11)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(R.lg)),
      ),
      child: Stack(
        children: [
          // 等高线纹理（农田地形隐喻），低透明、限定在圆角内。
          Positioned.fill(
            child: ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(R.lg)),
              child: CustomPaint(painter: _ContourPainter()),
            ),
          ),
          // 右上角淡麦金大字「档」水印
          Positioned(
            right: 18,
            top: topInset + 14,
            child: Icon(Icons.eco_rounded,
                size: 76, color: AppColors.gold.withValues(alpha: 0.10)),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(20, topInset + 10, 20, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _circleBack(context),
                    const Spacer(),
                    Text(
                      '田园通 · 成长档案',
                      style: TextStyle(
                        color: AppColors.gold.withValues(alpha: 0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _avatar(initial),
                    const SizedBox(width: 16),
                    Expanded(
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
                                    color: Colors.white,
                                    fontSize: 23,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              if (g != null) ...[
                                const SizedBox(width: 8),
                                _levelChip(g),
                              ],
                            ],
                          ),
                          const SizedBox(height: 5),
                          Text(
                            user == null
                                ? '登录后解锁成长体系'
                                : '${kRoleLabels[user.role] ?? '农户'} · ${user.villageName ?? '幸福村'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.82),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (g != null) ...[
                  const SizedBox(height: 20),
                  _growthHeader(g),
                  const SizedBox(height: 14),
                  _LevelLadder(g),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatar(String? initial) => Container(
        width: 72,
        height: 72,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.10),
          border: Border.all(color: AppColors.gold, width: 2.5),
        ),
        child: initial != null
            ? Text(
                initial,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                ),
              )
            : const Icon(Icons.person, size: 36, color: Colors.white),
      );

  /// 成长值大字（麦金）+ 距下一级文案
  Widget _growthHeader(GrowthInfo g) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '${g.growth}',
            style: const TextStyle(
              color: AppColors.gold,
              fontSize: 30,
              fontWeight: FontWeight.w800,
              height: 1.0,
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(left: 6, bottom: 3),
            child: Text(
              '成长值',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(bottom: 3),
            child: Text(
              g.headline,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.85),
                fontSize: 12.5,
              ),
            ),
          ),
        ],
      );

  Widget _levelChip(GrowthInfo g) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.gold,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.spa_rounded, size: 12, color: Color(0xFF073A11)),
            const SizedBox(width: 3),
            Text(
              'Lv${g.level} ${g.levelName}',
              style: const TextStyle(
                color: Color(0xFF073A11),
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );

  Widget _circleBack(BuildContext context) => Material(
        color: Colors.white.withValues(alpha: 0.14),
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

/// 作物成长等级阶梯：6 档节点 + 连接段，已过=麦金实心，当前=放大麦金+白环，
/// 当前→下一档之间按 progress 部分填充，未达=暗白空心。一图说清「我在哪、还差多少」。
class _LevelLadder extends StatelessWidget {
  final GrowthInfo g;
  const _LevelLadder(this.g);

  static const _tiers = ['新芽', '幼苗', '拔节', '抽穗', '金穗', '丰仓'];
  static const _slot = 24.0;

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
            fontSize: 9,
            letterSpacing: -0.3,
            fontWeight: active ? FontWeight.w800 : FontWeight.w500,
            color:
                active ? AppColors.gold : Colors.white.withValues(alpha: 0.42),
          ),
        ),
      ));
      if (i < 5) out.add(const Expanded(child: SizedBox()));
    }
    return out;
  }

  Widget _node(int i) {
    if (i < _cur) return _dot(11, AppColors.gold, null);
    if (i == _cur) return _dot(17, AppColors.gold, Colors.white);
    return _dot(11, Colors.white.withValues(alpha: 0.26), null);
  }

  Widget _dot(double size, Color color, Color? ring) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          border: ring != null ? Border.all(color: ring, width: 2) : null,
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
            Container(height: 4, color: Colors.white.withValues(alpha: 0.18)),
            FractionallySizedBox(
              widthFactor: frac,
              child: Container(height: 4, color: AppColors.gold),
            ),
          ],
        ),
      ),
    );
  }
}

/// 等高线纹理：几条相位错开的横向正弦线，低透明白，营造农田地形质感。
class _ContourPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3
      ..color = Colors.white.withValues(alpha: 0.05);
    for (var i = 0; i < 7; i++) {
      final path = Path();
      final baseY = size.height * (0.12 + i * 0.13);
      path.moveTo(0, baseY);
      for (double x = 0; x <= size.width; x += 10) {
        final y =
            baseY + math.sin((x / size.width * 2 * math.pi) + i * 0.8) * 9;
        path.lineTo(x, y);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
