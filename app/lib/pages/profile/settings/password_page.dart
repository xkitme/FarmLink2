import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

class PasswordPage extends StatefulWidget {
  const PasswordPage({super.key});

  @override
  State<PasswordPage> createState() => _PasswordPageState();
}

class _PasswordPageState extends State<PasswordPage> {
  final _oldPwd = TextEditingController();
  final _newPwd = TextEditingController();
  final _confirm = TextEditingController();
  bool _showOld = false;
  bool _showNew = false;
  bool _showConfirm = false;
  bool _saving = false;

  @override
  void dispose() {
    _oldPwd.dispose();
    _newPwd.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_newPwd.text.length < 8) {
      toast(context, '新密码至少 8 位', error: true);
      return;
    }
    if (_newPwd.text != _confirm.text) {
      toast(context, '两次新密码不一致', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ApiClient.put('/user/password', body: {
        'oldPassword': _oldPwd.text,
        'newPassword': _newPwd.text,
      });
      if (!mounted) return;
      toast(context, '密码已修改，请重新登录');
      await context.read<AuthState>().logout();
      if (!mounted) return;
      context.go('/auth/login');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('修改', e), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '修改密码'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsImageBanner(
            image: 'assets/images/generated/auth-hero.jpg',
            title: '账号安全中心',
            subtitle: '定期更新密码，保护账号与业务数据安全。',
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              children: [
                _passwordField(
                  controller: _oldPwd,
                  label: '当前密码',
                  visible: _showOld,
                  onToggle: () => setState(() => _showOld = !_showOld),
                ),
                const SizedBox(height: 12),
                _passwordField(
                  controller: _newPwd,
                  label: '新密码',
                  visible: _showNew,
                  onToggle: () => setState(() => _showNew = !_showNew),
                  helper: '密码应包含字母、数字及特殊符号。',
                ),
                const SizedBox(height: 12),
                _passwordField(
                  controller: _confirm,
                  label: '确认新密码',
                  visible: _showConfirm,
                  onToggle: () => setState(() => _showConfirm = !_showConfirm),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () async {
                      final auth = context.read<AuthState>();
                      final router = GoRouter.of(context);
                      await auth.logout();
                      if (!mounted) return;
                      router.go('/auth/forgot-password');
                    },
                    child: const Text('忘记当前密码？'),
                  ),
                ),
                const SizedBox(height: 4),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _submit,
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
          const SizedBox(height: 18),
          const Center(
            child: Text(
              '田园通 安全中心保护您的隐私',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _passwordField({
    required TextEditingController controller,
    required String label,
    required bool visible,
    required VoidCallback onToggle,
    String? helper,
  }) {
    return TextField(
      controller: controller,
      enabled: !_saving,
      obscureText: !visible,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        filled: true,
        suffixIcon: IconButton(
          onPressed: onToggle,
          icon: Icon(visible ? Icons.visibility_off : Icons.visibility),
        ),
      ),
    );
  }
}
