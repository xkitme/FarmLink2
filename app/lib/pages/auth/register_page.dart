import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});
  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _nickname = TextEditingController();
  final _username = TextEditingController();
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
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final n = _nickname.text.trim();
    final u = _username.text.trim();
    final p = _password.text;
    if (n.isEmpty || u.isEmpty || p.isEmpty) {
      setState(() => _error = '请填写所有字段');
      return;
    }
    if (p.length < 6) {
      setState(() => _error = '密码至少 6 位');
      return;
    }
    if (p != _confirmPassword.text) {
      setState(() => _error = '两次输入的密码不一致');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().register(u, p, n);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() {
        _error = serviceErrorMessage(e, fallback: '注册暂时不可用，请稍后重试');
        _loading = false;
      });
    }
  }

  Widget _field({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    TextInputAction action = TextInputAction.next,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant)),
        TextField(
          controller: controller,
          obscureText: obscure,
          textInputAction: action,
          onSubmitted:
              action == TextInputAction.done ? (_) => _register() : null,
          decoration: InputDecoration(
            filled: false,
            hintText: hint,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
            prefixIcon: Icon(icon, color: AppColors.outline, size: 20),
            prefixIconConstraints:
                const BoxConstraints(minWidth: 28, minHeight: 20),
            suffixIcon: suffix,
            enabledBorder: const UnderlineInputBorder(
                borderSide:
                    BorderSide(color: AppColors.outlineVariant, width: 1)),
            focusedBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: AppColors.primary, width: 2)),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.42,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset('assets/images/_6_1.jpg',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        const ColoredBox(color: Color(0xFF1F5E26))),
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
                          icon:
                              const Icon(Icons.arrow_back, color: Colors.white),
                          onPressed: () => context.go('/auth/login'),
                        ),
                        const SizedBox(width: 4),
                        const Padding(
                          padding: EdgeInsets.only(top: 10),
                          child: Row(
                            children: [
                              Icon(Icons.agriculture,
                                  color: Colors.white, size: 26),
                              SizedBox(width: 8),
                              Text('FarmLink 田园通',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 19,
                                      fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              constraints: BoxConstraints(
                minHeight: MediaQuery.of(context).size.height * 0.70,
              ),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(
                      color: Color(0x142E7D32),
                      blurRadius: 30,
                      offset: Offset(0, -8)),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('注册账号',
                        style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 4),
                    const Text('创建账号后即可进入田园通',
                        style: TextStyle(
                            color: AppColors.onSurfaceVariant, fontSize: 16)),
                    const SizedBox(height: 24),
                    _field(
                        label: '昵称',
                        controller: _nickname,
                        hint: '怎么称呼你',
                        icon: Icons.badge_outlined),
                    _field(
                        label: '手机号/账号',
                        controller: _username,
                        hint: '请输入常用手机号或账号',
                        icon: Icons.person_outline),
                    _field(
                      label: '密码',
                      controller: _password,
                      hint: '至少 6 位',
                      icon: Icons.lock_outline,
                      obscure: _obscure,
                      suffix: IconButton(
                        padding: EdgeInsets.zero,
                        icon: Icon(
                            _obscure ? Icons.visibility_off : Icons.visibility,
                            size: 20,
                            color: AppColors.outline),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    _field(
                      label: '确认密码',
                      controller: _confirmPassword,
                      hint: '再次输入密码',
                      icon: Icons.verified_user_outlined,
                      obscure: _obscureConfirm,
                      action: TextInputAction.done,
                      suffix: IconButton(
                        padding: EdgeInsets.zero,
                        icon: Icon(
                            _obscureConfirm
                                ? Icons.visibility_off
                                : Icons.visibility,
                            size: 20,
                            color: AppColors.outline),
                        onPressed: () =>
                            setState(() => _obscureConfirm = !_obscureConfirm),
                      ),
                    ),
                    if (_error != null) ...[
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppColors.error, fontSize: 13)),
                      const SizedBox(height: 8),
                    ],
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: _loading ? null : _register,
                      child: _loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2))
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('创建账号'),
                                SizedBox(width: 6),
                                Icon(Icons.arrow_forward, size: 20),
                              ],
                            ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => context.go('/auth/login'),
                      icon: const Icon(Icons.login, size: 20),
                      label: const Text('已有账号，返回登录'),
                    ),
                  ],
                ),
              ),
            )
                .animate()
                .slideY(
                    begin: 0.2, duration: 600.ms, curve: Curves.easeOutCubic)
                .fadeIn(),
          ),
        ],
      ),
    );
  }
}
