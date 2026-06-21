import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/legal_documents.dart';
import '../../widgets/agreement_dialog.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  bool _agreed = false;
  String? _error;

  late final TapGestureRecognizer _tapService;
  late final TapGestureRecognizer _tapPrivacy;

  @override
  void initState() {
    super.initState();
    _tapService = TapGestureRecognizer()
      ..onTap = () => showAgreementDialog(
            context,
            title: kServiceAgreementTitle,
            sections: kServiceAgreementSections,
          );
    _tapPrivacy = TapGestureRecognizer()
      ..onTap = () => showAgreementDialog(
            context,
            title: kPrivacyPolicyTitle,
            sections: kPrivacyPolicySections,
          );
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    _tapService.dispose();
    _tapPrivacy.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _error = null);
      return;
    }
    final u = _username.text.trim();
    final p = _password.text;
    if (!_agreed) {
      setState(() => _error = '请先阅读并勾选同意《用户协议》与《隐私政策》');
      return;
    }
    TextInput.finishAutofillContext();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().login(u, p);
      if (mounted) context.go('/home');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = serviceErrorMessage(e, fallback: '登录暂时不可用，请稍后重试');
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
      brandTopGap: 120,
      compactBrandTopGap: 78,
      brandFormGap: 38,
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthTextField(
                controller: _username,
                hint: '手机号 / 用户名',
                icon: Icons.person_outline,
                autofillHints: const [
                  AutofillHints.username,
                  AutofillHints.telephoneNumber,
                ],
                keyboardType: TextInputType.text,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                validator: (value) {
                  if ((value ?? '').trim().isEmpty) return '请输入手机号/用户名';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _password,
                hint: '密码',
                icon: Icons.vpn_key_outlined,
                obscure: _obscure,
                onSubmit: _login,
                autofillHints: const [AutofillHints.password],
                keyboardType: TextInputType.visiblePassword,
                enabled: !_loading,
                onChanged: (_) => _clearError(),
                validator: (value) {
                  if ((value ?? '').isEmpty) return '请输入密码';
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
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: _agreementRow()),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: _loading
                        ? null
                        : () => context.go('/auth/forgot-password'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFD3FFE0),
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      minimumSize: const Size(0, 0),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      '忘记密码？',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                _errorText(_error!),
              ],
              const SizedBox(height: 18),
              AuthPrimaryButton(
                label: '登录',
                loading: _loading,
                onPressed: _loading ? null : _login,
              ),
              const SizedBox(height: 16),
              AuthInlineAction(
                prefix: '还没有账号？',
                action: '立即注册',
                enabled: !_loading,
                onTap: () => context.go('/auth/login/register'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 「已阅读并同意《用户协议》与《隐私政策》」勾选 + 可点协议链接。
  Widget _agreementRow() {
    const linkStyle = TextStyle(
      fontSize: 11.5,
      color: Color(0xFFD3FFE0),
      fontWeight: FontWeight.w800,
    );
    return Semantics(
      container: true,
      checked: _agreed,
      label: '已阅读并同意用户协议与隐私政策',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 36,
            height: 36,
            child: Checkbox(
              value: _agreed,
              onChanged: _loading
                  ? null
                  : (v) => setState(() {
                        _agreed = v ?? false;
                        if (_agreed) _error = null;
                      }),
              visualDensity: VisualDensity.compact,
              activeColor: const Color(0xFF53C891),
              checkColor: Colors.white,
              side: const BorderSide(color: Color(0xD9FFFFFF), width: 1.4),
            ),
          ),
          const SizedBox(width: 2),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text.rich(
                TextSpan(
                  style: const TextStyle(
                    fontSize: 11.5,
                    height: 1.4,
                    color: Color(0xD9FFFFFF),
                  ),
                  children: [
                    const TextSpan(text: '已阅读并同意'),
                    TextSpan(
                      text: '《用户协议》',
                      style: linkStyle,
                      recognizer: _tapService,
                    ),
                    const TextSpan(text: '与'),
                    TextSpan(
                      text: '《隐私政策》',
                      style: linkStyle,
                      recognizer: _tapPrivacy,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _errorText(String text) {
    return Semantics(
      liveRegion: true,
      child: Center(
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFFFFD9D9),
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
