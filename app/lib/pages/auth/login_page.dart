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
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text;
    if (username.isEmpty || password.isEmpty) {
      setState(() => _error = '请填写用户名和密码');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthState>().login(username, password);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),

              // Logo 区域
              Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const RadialGradient(
                        colors: [InkColors.gold, InkColors.goldDim],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: InkColors.gold.withOpacity(0.3),
                          blurRadius: 24,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text('墨', style: TextStyle(
                        color: Color(0xFF0A0B0E),
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      )),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('𝑰𝒏𝒌𝑭𝒍𝒐𝒘', style: TextStyle(
                    color: InkColors.gold,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  )),
                  const SizedBox(height: 6),
                  const Text('中华传统文化 × AI 学习', style: TextStyle(
                    color: InkColors.textSecondary,
                    fontSize: 13,
                    letterSpacing: 2,
                  )),
                ],
              )
              .animate()
              .fade(duration: 600.ms)
              .slideY(begin: -0.1, duration: 600.ms),

              const SizedBox(height: 52),

              // 表单
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _usernameCtrl,
                    style: const TextStyle(color: InkColors.textPrimary),
                    decoration: const InputDecoration(
                      hintText: '用户名',
                      prefixIcon: Icon(Icons.person_outline, color: InkColors.textDisabled, size: 20),
                    ),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _passwordCtrl,
                    obscureText: true,
                    style: const TextStyle(color: InkColors.textPrimary),
                    decoration: const InputDecoration(
                      hintText: '密码',
                      prefixIcon: Icon(Icons.lock_outline, color: InkColors.textDisabled, size: 20),
                    ),
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _login(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: const TextStyle(
                      color: InkColors.cinnabar,
                      fontSize: 13,
                    ), textAlign: TextAlign.center),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _login,
                      child: _loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(InkColors.background),
                              ),
                            )
                          : const Text('登 录'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.go('/auth/login/register'),
                    child: const Text('没有账号？立即注册', style: TextStyle(
                      color: InkColors.textSecondary,
                      fontSize: 13,
                    )),
                  ),
                ],
              )
              .animate(delay: 200.ms)
              .fade(duration: 600.ms)
              .slideY(begin: 0.1, duration: 600.ms),

              const SizedBox(height: 40),

              // 装饰引言
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(
                    left: BorderSide(color: InkColors.gold.withOpacity(0.5), width: 2),
                  ),
                ),
                child: const Text(
                  '学而时习之，不亦说乎',
                  style: TextStyle(
                    color: InkColors.textSecondary,
                    fontSize: 14,
                    fontStyle: FontStyle.italic,
                    letterSpacing: 2,
                  ),
                ),
              )
              .animate(delay: 600.ms)
              .fade(duration: 800.ms),
            ],
          ),
        ),
      ),
    );
  }
}
