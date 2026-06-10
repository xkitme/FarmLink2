import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

/// 个人资料：账号/角色只读，昵称/真实姓名/手机号/所属村可编辑，
/// 保存走 PUT /user/profile，成功后刷新 AuthState 与本地缓存。
class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  late final TextEditingController _nickname;
  late final TextEditingController _realName;
  late final TextEditingController _phone;
  late final TextEditingController _village;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthState>().user;
    _nickname = TextEditingController(text: user?.nickname ?? '');
    _realName = TextEditingController(text: user?.realName ?? '');
    _phone = TextEditingController(text: user?.phone ?? '');
    _village = TextEditingController(text: user?.villageName ?? '');
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
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '个人资料'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsImageBanner(
            image: 'assets/images/generated/auth-hero.jpg',
            title: '个人资料',
            subtitle: '完善昵称、真实姓名与联系方式，让村委与农技服务更好地联系到你。',
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _readonlyRow('账号', user?.username ?? '-'),
                const Divider(height: 20),
                _readonlyRow('角色', kRoleLabels[user?.role] ?? '普通农户'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              children: [
                _field(
                  controller: _nickname,
                  label: '昵称',
                  maxLength: 20,
                ),
                const SizedBox(height: 12),
                _field(
                  controller: _realName,
                  label: '真实姓名',
                  hint: '便于村委核验身份',
                  maxLength: 20,
                ),
                const SizedBox(height: 12),
                _field(
                  controller: _phone,
                  label: '手机号',
                  hint: '11 位手机号，便于接收通知',
                  maxLength: 11,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                ),
                const SizedBox(height: 12),
                _field(
                  controller: _village,
                  label: '所属村',
                  hint: '如：青禾村',
                  maxLength: 40,
                ),
                const SizedBox(height: 16),
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
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              '账号如需变更，请联系村委或管理员',
              style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }

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
