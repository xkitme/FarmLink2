import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
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
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 64),
              Center(
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: const Icon(Icons.eco, size: 44, color: Colors.white),
                ),
              ).animate().scale(duration: 500.ms, curve: Curves.easeOutBack),
              const SizedBox(height: 18),
              const Text('田园通',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                      letterSpacing: 3)),
              const SizedBox(height: 4),
              const Text('登录你的助农账号',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
              const SizedBox(height: 40),
              TextField(
                controller: _username,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: '用户名',
                  prefixIcon: Icon(Icons.person_outline, color: AppColors.textHint),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _password,
                obscureText: true,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _login(),
                decoration: const InputDecoration(
                  hintText: '密码',
                  prefixIcon: Icon(Icons.lock_outline, color: AppColors.textHint),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.danger, fontSize: 13)),
              ],
              const SizedBox(height: 26),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : const Text('登 录'),
                ),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: () => context.go('/auth/login/register'),
                child: const Text('没有账号？立即注册'),
              ),
            ],
          ).animate().fadeIn(duration: 400.ms),
        ),
      ),
    );
  }
}
