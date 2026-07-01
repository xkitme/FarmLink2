import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
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
    _username.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _error = '请按提示补全上方信息后再重置密码');
      return;
    }
    final username = _username.text.trim();
    final phone = _phone.text.trim();
    final password = _password.text;
    TextInput.finishAutofillContext();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ApiClient.post('/auth/reset-password', body: {
        'username': username,
        'phone': phone,
        'newPassword': password,
      });
      if (!mounted) return;
      toast(context, '密码已重置，请使用新密码登录');
      context.go('/auth/login');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = serviceErrorMessage(e, fallback: '密码重置暂时不可用，请稍后重试');
        _loading = false;
      });
    }
  }

  void _clearError() {
    if (_error != null) setState(() => _error = null);
  }

  void _backToLogin() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/auth/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScreenScaffold(
      title: '田园通',
      subtitle: '每一次绿色选择，都在为乡村成长赋能',
      showBack: true,
      backEnabled: !_loading,
      onBack: _backToLogin,
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
                controller: _username,
                hint: '手机号 / 用户名',
                icon: Icons.person_outline,
                autofillHints: const [AutofillHints.username],
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                validator: (value) {
                  if ((value ?? '').trim().isEmpty) return '请输入登录账号';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _phone,
                hint: '绑定手机号',
                icon: Icons.phone_iphone,
                keyboardType: TextInputType.phone,
                autofillHints: const [AutofillHints.telephoneNumber],
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(11),
                ],
                validator: (value) {
                  final phone = (value ?? '').trim();
                  if (phone.isEmpty) return '请输入绑定手机号';
                  if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
                    return '请输入正确的手机号';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _password,
                hint: '新密码，至少 6 位',
                icon: Icons.vpn_key_outlined,
                obscure: _obscure,
                autofillHints: const [AutofillHints.newPassword],
                keyboardType: TextInputType.visiblePassword,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                validator: (value) {
                  final password = value ?? '';
                  if (password.isEmpty) return '请输入新密码';
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
                hint: '确认新密码',
                icon: Icons.verified_user_outlined,
                obscure: _obscureConfirm,
                action: TextInputAction.done,
                onSubmit: _resetPassword,
                autofillHints: const [AutofillHints.newPassword],
                keyboardType: TextInputType.visiblePassword,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                validator: (value) {
                  final confirm = value ?? '';
                  if (confirm.isEmpty) return '请再次输入新密码';
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
                label: '重置密码',
                loading: _loading,
                onPressed: _loading ? null : _resetPassword,
              ),
              const SizedBox(height: 14),
              AuthInlineAction(
                prefix: '想起密码？',
                action: '返回登录',
                enabled: !_loading,
                onTap: _backToLogin,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _errorText(String text) {
    return Semantics(
      liveRegion: true,
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFFFFD9D9),
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
