import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../core/legal_documents.dart';
import '../../core/site_images.dart';
import '../../widgets/agreement_dialog.dart';
import '../../widgets/common.dart';

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
    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final media = MediaQuery.of(context);
          // 阈值覆盖 Pixel 2(731) 一类中等高度机型:46% 大 hero 仅在 ~820+ 的高屏
          // 才放得下完整表单,否则底部「注册账号」按钮会被挤出屏外需滚动;此band
          // 改用 34% 矮 hero 让全部内容一屏装下。高屏(≥820)仍用大 hero。
          final compact = constraints.maxHeight < 820;
          final heroHeight = (constraints.maxHeight * (compact ? 0.30 : 0.46))
              .clamp(180.0, 360.0)
              .toDouble();
          final panelMinHeight =
              (constraints.maxHeight - heroHeight).clamp(0.0, 520.0).toDouble();

          return SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding:
                EdgeInsets.only(bottom: media.viewInsets.bottom > 0 ? 16 : 0),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                children: [
                  _hero(height: heroHeight),
                  Container(
                    width: double.infinity,
                    constraints: BoxConstraints(minHeight: panelMinHeight),
                    decoration: const BoxDecoration(
                      color: AppColors.surface,
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(32)),
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x142E7D32),
                          blurRadius: 30,
                          offset: Offset(0, -8),
                        ),
                      ],
                    ),
                    padding: EdgeInsets.fromLTRB(
                      20,
                      compact ? 24 : 28,
                      20,
                      media.viewPadding.bottom + 32,
                    ),
                    child: Form(
                      key: _formKey,
                      autovalidateMode: AutovalidateMode.onUserInteraction,
                      child: AutofillGroup(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '欢迎回来',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                color: AppColors.onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              '进入您的智能农业中心',
                              style: TextStyle(
                                fontSize: 16,
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _underlineField(
                              label: '手机号/账号',
                              controller: _username,
                              hint: '请输入注册手机号或账号',
                              icon: Icons.person_outline,
                              autofillHints: const [
                                AutofillHints.username,
                                AutofillHints.telephoneNumber,
                              ],
                              keyboardType: TextInputType.text,
                              enabled: !_loading,
                              validator: (value) {
                                if ((value ?? '').trim().isEmpty) {
                                  return '请输入手机号/账号';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            _underlineField(
                              label: '密码',
                              controller: _password,
                              hint: '请输入登录密码',
                              icon: Icons.lock_outline,
                              obscure: _obscure,
                              onSubmit: _login,
                              autofillHints: const [AutofillHints.password],
                              keyboardType: TextInputType.visiblePassword,
                              enabled: !_loading,
                              validator: (value) {
                                if ((value ?? '').isEmpty) return '请输入密码';
                                return null;
                              },
                              suffix: IconButton(
                                tooltip: _obscure ? '显示密码' : '隐藏密码',
                                padding: EdgeInsets.zero,
                                icon: Icon(
                                  _obscure
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  size: 20,
                                  color: AppColors.outline,
                                ),
                                onPressed: _loading
                                    ? null
                                    : () => setState(
                                          () => _obscure = !_obscure,
                                        ),
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
                                      : () => context.go(
                                            '/auth/forgot-password',
                                          ),
                                  style: TextButton.styleFrom(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 4),
                                    minimumSize: const Size(0, 0),
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text(
                                    '忘记密码？',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 8),
                              _errorText(_error!),
                            ],
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: ElevatedButton(
                                onPressed: _loading ? null : _login,
                                child: _loading
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          color: Colors.white,
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text('安全登录'),
                                          SizedBox(width: 6),
                                          Icon(Icons.arrow_forward, size: 20),
                                        ],
                                      ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: OutlinedButton.icon(
                                onPressed: _loading
                                    ? null
                                    : () => context.go('/auth/login/register'),
                                icon: const Icon(
                                  Icons.person_add_alt_1,
                                  size: 20,
                                ),
                                label: const Text('注册账号'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                      .animate()
                      .slideY(
                        begin: 0.2,
                        duration: 600.ms,
                        curve: Curves.easeOutCubic,
                      )
                      .fadeIn(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _hero({required double height}) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: const Stack(
        fit: StackFit.expand,
        children: [
          SiteImage(
            'assets/images/generated/auth-hero.jpg',
            fit: BoxFit.cover,
            errorFallback: ColoredBox(color: Color(0xFF1F5E26)),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.center,
                // 中性黑半透明,仅压暗顶部供白色 logo 可读;去掉原绿灰蒙版。
                colors: [Color(0x73000000), Color(0x00000000)],
              ),
            ),
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.agriculture, color: Colors.white, size: 30),
                    SizedBox(width: 8),
                    Text(
                      '田园通',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
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

  /// 「已阅读并同意《用户协议》与《隐私政策》」勾选 + 可点协议链接。
  Widget _agreementRow() {
    const linkStyle = TextStyle(
      fontSize: 11.5,
      color: AppColors.primary,
      fontWeight: FontWeight.w600,
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
              activeColor: AppColors.primary,
              side: const BorderSide(color: AppColors.outline, width: 1.5),
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
                    color: AppColors.onSurfaceVariant,
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
            color: AppColors.error,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _underlineField({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    VoidCallback? onSubmit,
    Iterable<String>? autofillHints,
    TextInputType? keyboardType,
    bool enabled = true,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.4,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        TextFormField(
          controller: controller,
          enabled: enabled,
          obscureText: obscure,
          keyboardType: keyboardType,
          autofillHints: autofillHints,
          enableSuggestions: !obscure,
          autocorrect: !obscure,
          textInputAction:
              onSubmit != null ? TextInputAction.done : TextInputAction.next,
          onFieldSubmitted: onSubmit != null ? (_) => onSubmit() : null,
          onChanged: (_) => _clearError(),
          validator: validator,
          decoration: InputDecoration(
            filled: false,
            hintText: hint,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
            errorMaxLines: 2,
            prefixIcon: Icon(icon, color: AppColors.outline, size: 20),
            prefixIconConstraints:
                const BoxConstraints(minWidth: 28, minHeight: 20),
            suffixIcon: suffix,
            enabledBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: AppColors.outlineVariant, width: 1),
            ),
            focusedBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: AppColors.primary, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
