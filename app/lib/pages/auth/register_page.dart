import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});
  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _nickname = TextEditingController();
  final _username = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  bool _obscureConfirm = true;
  String? _error;

  @override
  void dispose() {
    _nickname.dispose();
    _username.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _error = '请按提示补全上方信息后再创建账号');
      return;
    }
    final n = _nickname.text.trim();
    final u = _username.text.trim();
    final ph = _phone.text.trim();
    final p = _password.text;
    TextInput.finishAutofillContext();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().register(u, p, n, phone: ph);
      if (mounted) context.go('/home');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = serviceErrorMessage(e, fallback: '注册暂时不可用，请稍后重试');
        _loading = false;
      });
    }
  }

  void _clearError() {
    if (_error != null) setState(() => _error = null);
  }

  @override
  Widget build(BuildContext context) {
    return AuthScreenScaffold(
      title: '田园通',
      subtitle: '每一次绿色选择，都在为乡村成长赋能',
      showBack: true,
      backEnabled: !_loading,
      brandTopGap: 70,
      compactBrandTopGap: 34,
      brandFormGap: 30,
      child: Form(
        key: _formKey,
        child: AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthTextField(
                controller: _nickname,
                hint: '昵称',
                icon: Icons.badge_outlined,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                autofillHints: const [AutofillHints.name],
                validator: (value) {
                  if ((value ?? '').trim().isEmpty) return '请输入昵称';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _username,
                hint: '手机号 / 用户名',
                icon: Icons.person_outline,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                autofillHints: const [
                  AutofillHints.username,
                  AutofillHints.telephoneNumber,
                ],
                validator: (value) {
                  if ((value ?? '').trim().isEmpty) return '请输入手机号/用户名';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _phone,
                hint: '手机号（用于找回密码）',
                icon: Icons.phone_iphone,
                keyboardType: TextInputType.phone,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                autofillHints: const [AutofillHints.telephoneNumber],
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(11),
                ],
                validator: (value) {
                  final phone = (value ?? '').trim();
                  if (phone.isEmpty) return '请输入手机号';
                  if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
                    return '请输入正确的手机号';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _password,
                hint: '密码，至少 6 位',
                icon: Icons.vpn_key_outlined,
                obscure: _obscure,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                autofillHints: const [AutofillHints.newPassword],
                keyboardType: TextInputType.visiblePassword,
                validator: (value) {
                  final password = value ?? '';
                  if (password.isEmpty) return '请输入密码';
                  if (password.length < 6) return '密码至少 6 位';
                  return null;
                },
                suffix: IconButton(
                  tooltip: _obscure ? '显示密码' : '隐藏密码',
                  padding: EdgeInsets.zero,
                  icon: Icon(
                    _obscure ? Icons.visibility_off : Icons.visibility,
                    size: 20,
                    color: const Color(0xFF6E9080),
                  ),
                  onPressed: _loading
                      ? null
                      : () => setState(() => _obscure = !_obscure),
                ),
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _confirmPassword,
                hint: '确认密码',
                icon: Icons.verified_user_outlined,
                obscure: _obscureConfirm,
                action: TextInputAction.done,
                onSubmit: _register,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                autofillHints: const [AutofillHints.newPassword],
                keyboardType: TextInputType.visiblePassword,
                validator: (value) {
                  final confirm = value ?? '';
                  if (confirm.isEmpty) return '请再次输入密码';
                  if (confirm != _password.text) return '两次输入的密码不一致';
                  return null;
                },
                suffix: IconButton(
                  tooltip: _obscureConfirm ? '显示确认密码' : '隐藏确认密码',
                  padding: EdgeInsets.zero,
                  icon: Icon(
                    _obscureConfirm ? Icons.visibility_off : Icons.visibility,
                    size: 20,
                    color: const Color(0xFF6E9080),
                  ),
                  onPressed: _loading
                      ? null
                      : () => setState(
                            () => _obscureConfirm = !_obscureConfirm,
                          ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                _errorText(_error!),
              ],
              const SizedBox(height: 18),
              AuthPrimaryButton(
                label: '创建账号',
                loading: _loading,
                onPressed: _loading ? null : _register,
              ),
              const SizedBox(height: 14),
              AuthInlineAction(
                prefix: '已有账号？',
                action: '返回登录',
                enabled: !_loading,
                onTap: () => context.go('/auth/login'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _errorText(String text) {
    return Text(
      text,
      textAlign: TextAlign.center,
      style: const TextStyle(
        color: Color(0xFFFFD9D9),
        fontSize: 13,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
