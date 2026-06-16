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

/// 个人资料：顶部整幅配图背景（底部渐出融入页面），其上叠身份与成长值/等级；
/// 下方无卡片，字段直接排布在页面背景上。账号/角色只读，昵称/真实姓名/手机号/
/// 所属村可编辑，保存走 PUT /user/profile，成功后刷新 AuthState 与本地缓存。
class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  static const String _bgImage = 'assets/images/generated/village-honor.jpg';

  late final TextEditingController _nickname;
  late final TextEditingController _realName;
  late final TextEditingController _phone;
  late final TextEditingController _village;
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
      // 成长值读取失败不阻断资料编辑，静默降级（隐藏成长条）。
    }
  }

  @override
  void dispose() {
    _nickname.dispose();
    _realName.dispose();
    _phone.dispose();
    _village.dispose();
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
    final topInset = MediaQuery.of(context).padding.top;
    final headerHeight = 214.0 + topInset;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _header(context, user, topInset, headerHeight),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
              children: [
                _readonlyRow('账号', user?.username ?? '-'),
                _thinLine(),
                _readonlyRow('角色', kRoleLabels[user?.role] ?? '普通农户'),
                const SizedBox(height: 22),
                _field(controller: _nickname, label: '昵称', maxLength: 20),
                const SizedBox(height: 14),
                _field(
                  controller: _realName,
                  label: '真实姓名',
                  hint: '便于村委核验身份',
                  maxLength: 20,
                ),
                const SizedBox(height: 14),
                _field(
                  controller: _phone,
                  label: '手机号',
                  hint: '11 位手机号，便于接收通知',
                  maxLength: 11,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
                const SizedBox(height: 14),
                _field(
                  controller: _village,
                  label: '所属村',
                  hint: '如：青禾村',
                  maxLength: 40,
                ),
                const SizedBox(height: 22),
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
                ),
                const SizedBox(height: 12),
                const Center(
                  child: Text(
                    '账号如需变更，请联系村委或管理员',
                    style: TextStyle(
                        fontSize: 12, color: AppColors.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 顶部整幅配图：底部渐出融入页面背景，叠身份 + 成长值/等级 ──────
  Widget _header(
      BuildContext context, dynamic user, double topInset, double height) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          const SiteImage(_bgImage, fit: BoxFit.cover),
          // 自下而上的深色擦罩：仅压暗底部供白字落座，纯黑不掺色，避免灰绿浑浊。
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x00000000),
                  Color(0x40000000),
                  Color(0xCC000000),
                  Color(0xE6000000),
                ],
                stops: [0.0, 0.34, 0.84, 1.0],
              ),
            ),
          ),
          // 底缘窄渐出：把擦罩底色软化进页面背景，只在身份下方 18px，文字不落其中。
          const Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 18,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00F9F9F9), AppColors.background],
                ),
              ),
            ),
          ),
          // 返回按钮（半透明圆底，叠在图上）
          Positioned(
            top: topInset + 6,
            left: 6,
            child: _circleBack(context),
          ),
          // 身份 + 成长值（坐落在底部深色擦罩上，高对比）
          Positioned(
            left: 20,
            right: 20,
            bottom: 22,
            child: _identity(user),
          ),
        ],
      ),
    );
  }

  Widget _circleBack(BuildContext context) => Material(
        color: Colors.black.withValues(alpha: 0.28),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => context.canPop()
              ? context.pop()
              : context.go('/profile/settings'),
          child: const Padding(
            padding: EdgeInsets.all(8),
            child: Icon(Icons.arrow_back, color: Colors.white, size: 22),
          ),
        ),
      );

  Widget _identity(dynamic user) {
    final g = _growth;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            // 圆头像 + 白环（深底白图标，任何背景下都读得出是头像）
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.28),
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(Icons.person, size: 30, color: Colors.white),
            ),
            const SizedBox(width: 14),
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
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            shadows: [
                              Shadow(color: Color(0x66000000), blurRadius: 6),
                            ],
                          ),
                        ),
                      ),
                      if (g != null) ...[
                        const SizedBox(width: 8),
                        _levelChip(g),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user == null
                        ? ''
                        : '${kRoleLabels[user.role] ?? '农户'} · ${user.villageName ?? '幸福村'}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 13,
                      shadows: const [
                        Shadow(color: Color(0x66000000), blurRadius: 6),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (g != null) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '成长值 ${g.growth}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  shadows: [Shadow(color: Color(0x66000000), blurRadius: 6)],
                ),
              ),
              Text(
                g.headline,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.92),
                  fontSize: 12,
                  shadows: const [
                    Shadow(color: Color(0x66000000), blurRadius: 6)
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(R.sm),
            child: LinearProgressIndicator(
              value: g.isMax ? 1.0 : g.progress.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: Colors.white.withValues(alpha: 0.28),
              valueColor: const AlwaysStoppedAnimation(AppColors.primaryDim),
            ),
          ),
        ],
      ],
    );
  }

  Widget _levelChip(GrowthInfo g) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.gold.withValues(alpha: 0.26),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(
              color: AppColors.gold.withValues(alpha: 0.9), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.eco, size: 12, color: Colors.white),
            const SizedBox(width: 3),
            Text(
              'Lv${g.level} ${g.levelName}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
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
    return TextField(
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
    );
  }

  Widget _thinLine() => const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Divider(height: 1, color: AppColors.outlineVariant),
      );

  Widget _readonlyRow(String label, String value) => Row(
        children: [
          Text(label,
              style: const TextStyle(
                  color: AppColors.onSurfaceVariant, fontSize: 14)),
          const Spacer(),
          Text(value,
              style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 15,
                  fontWeight: FontWeight.w600)),
        ],
      );
}
