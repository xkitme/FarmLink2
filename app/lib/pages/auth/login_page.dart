import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

/// 登录页 — 1:1 复刻设计稿 _6
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final u = _username.text.trim();
    final p = _password.text;
    if (u.isEmpty || p.isEmpty) {
      setState(() => _error = '请输入用户名和密码');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().login(u, p);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() {
        _error = serviceErrorMessage(e, fallback: '登录暂时不可用，请稍后重试');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // 顶部图片区 60%
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset('assets/images/_6_1.jpg',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        const ColoredBox(color: Color(0xFF1F5E26))),
                // 顶部深色渐隐，保证品牌文字可读
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.center,
                      colors: [Color(0x992A2E27), Color(0x00000000)],
                    ),
                  ),
                ),
                // 顶部品牌
                const Positioned(
                  top: 48,
                  left: 20,
                  child: Row(
                    children: [
                      Icon(Icons.agriculture, color: Colors.white, size: 30),
                      SizedBox(width: 8),
                      Text('田园通',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // 底部白卡
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              constraints: BoxConstraints(
                minHeight: MediaQuery.of(context).size.height * 0.52,
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('欢迎回来',
                        style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 4),
                    const Text('进入您的智能农业中心',
                        style: TextStyle(
                            fontSize: 16, color: AppColors.onSurfaceVariant)),
                    const SizedBox(height: 24),
                    _underlineField(
                      label: '手机号/账号',
                      controller: _username,
                      hint: '请输入注册手机号',
                      icon: Icons.person_outline,
                    ),
                    const SizedBox(height: 16),
                    _underlineField(
                      label: '密码',
                      controller: _password,
                      hint: '请输入登录密码',
                      icon: Icons.lock_outline,
                      obscure: _obscure,
                      onSubmit: _login,
                      suffix: IconButton(
                        padding: EdgeInsets.zero,
                        icon: Icon(
                            _obscure ? Icons.visibility_off : Icons.visibility,
                            size: 20,
                            color: AppColors.outline),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => toast(context, '请联系村委或管理员重置密码'),
                        style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 4)),
                        child:
                            const Text('忘记密码？', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 4),
                      Center(
                        child: Text(_error!,
                            style: const TextStyle(
                                color: AppColors.error, fontSize: 13)),
                      ),
                    ],
                    const SizedBox(height: 12),
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
                                    color: Colors.white, strokeWidth: 2))
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
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
                        onPressed: () => context.go('/auth/login/register'),
                        icon: const Icon(Icons.person_add_alt_1, size: 20),
                        label: const Text('注册账号'),
                      ),
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

  Widget _underlineField({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    VoidCallback? onSubmit,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.4,
                color: AppColors.onSurfaceVariant)),
        TextField(
          controller: controller,
          obscureText: obscure,
          textInputAction:
              onSubmit != null ? TextInputAction.done : TextInputAction.next,
          onSubmitted: onSubmit != null ? (_) => onSubmit() : null,
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
      ],
    );
  }
}
