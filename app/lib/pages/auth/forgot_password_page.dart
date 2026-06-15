import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';
import '../../widgets/common.dart';

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
      setState(() => _error = null);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final media = MediaQuery.of(context);
          // 阈值覆盖 Pixel 2(731) 一类中等高度机型,避免高 hero 挤出底部提交按钮。
          final compact = constraints.maxHeight < 820;
          final heroHeight = (constraints.maxHeight * (compact ? 0.28 : 0.36))
              .clamp(160.0, 300.0)
              .toDouble();
          final panelMinHeight =
              (constraints.maxHeight - heroHeight).clamp(0.0, 620.0).toDouble();

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
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              '重置密码',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                color: AppColors.onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              '验证账号绑定手机号后设置新密码',
                              style: TextStyle(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _field(
                              label: '手机号/账号',
                              controller: _username,
                              hint: '请输入登录账号',
                              icon: Icons.person_outline,
                              autofillHints: const [AutofillHints.username],
                              enabled: !_loading,
                              validator: (value) {
                                if ((value ?? '').trim().isEmpty) {
                                  return '请输入登录账号';
                                }
                                return null;
                              },
                            ),
                            _field(
                              label: '绑定手机号',
                              controller: _phone,
                              hint: '请输入账号绑定的手机号',
                              icon: Icons.phone_iphone,
                              keyboardType: TextInputType.phone,
                              autofillHints: const [
                                AutofillHints.telephoneNumber,
                              ],
                              enabled: !_loading,
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
                            _field(
                              label: '新密码',
                              controller: _password,
                              hint: '至少 6 位',
                              icon: Icons.lock_outline,
                              obscure: _obscure,
                              autofillHints: const [AutofillHints.newPassword],
                              keyboardType: TextInputType.visiblePassword,
                              enabled: !_loading,
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
                            _field(
                              label: '确认新密码',
                              controller: _confirmPassword,
                              hint: '再次输入新密码',
                              icon: Icons.verified_user_outlined,
                              obscure: _obscureConfirm,
                              action: TextInputAction.done,
                              onSubmit: _resetPassword,
                              autofillHints: const [AutofillHints.newPassword],
                              keyboardType: TextInputType.visiblePassword,
                              enabled: !_loading,
                              validator: (value) {
                                final confirm = value ?? '';
                                if (confirm.isEmpty) return '请再次输入新密码';
                                if (confirm != _password.text) {
                                  return '两次输入的密码不一致';
                                }
                                return null;
                              },
                              suffix: IconButton(
                                tooltip: _obscureConfirm ? '显示确认密码' : '隐藏确认密码',
                                padding: EdgeInsets.zero,
                                icon: Icon(
                                  _obscureConfirm
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  size: 20,
                                  color: AppColors.outline,
                                ),
                                onPressed: _loading
                                    ? null
                                    : () => setState(
                                          () => _obscureConfirm =
                                              !_obscureConfirm,
                                        ),
                              ),
                            ),
                            if (_error != null) ...[
                              _errorText(_error!),
                              const SizedBox(height: 8),
                            ],
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: ElevatedButton(
                                onPressed: _loading ? null : _resetPassword,
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
                                          Text('重置密码'),
                                          SizedBox(width: 6),
                                          Icon(Icons.arrow_forward, size: 20),
                                        ],
                                      ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: _loading
                                  ? null
                                  : () => context.go('/auth/login'),
                              icon: const Icon(Icons.login, size: 20),
                              label: const Text('返回登录'),
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
      child: Stack(
        fit: StackFit.expand,
        children: [
          const SiteImage(
            'assets/images/generated/auth-hero.jpg',
            fit: BoxFit.cover,
            errorFallback: ColoredBox(color: Color(0xFF1F5E26)),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xAA2A2E27), Color(0x332E7D32)],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  IconButton(
                    tooltip: '返回登录',
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed:
                        _loading ? null : () => context.go('/auth/login'),
                  ),
                  const SizedBox(width: 4),
                  const Padding(
                    padding: EdgeInsets.only(top: 10),
                    child: Row(
                      children: [
                        Icon(Icons.agriculture, color: Colors.white, size: 26),
                        SizedBox(width: 8),
                        Text(
                          '田园通',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
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
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: AppColors.error,
          fontSize: 13,
        ),
      ),
    );
  }

  Widget _field({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    TextInputAction action = TextInputAction.next,
    TextInputType? keyboardType,
    VoidCallback? onSubmit,
    Iterable<String>? autofillHints,
    bool enabled = true,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        TextFormField(
          controller: controller,
          enabled: enabled,
          obscureText: obscure,
          keyboardType: keyboardType,
          autofillHints: autofillHints,
          inputFormatters: inputFormatters,
          enableSuggestions: !obscure,
          autocorrect: !obscure,
          textInputAction: action,
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
        const SizedBox(height: 16),
      ],
    );
  }
}
