import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _nicknameCtrl  = TextEditingController();
  final _usernameCtrl  = TextEditingController();
  final _passwordCtrl  = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nicknameCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final nickname = _nicknameCtrl.text.trim();
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text;
    if (nickname.isEmpty || username.isEmpty || password.isEmpty) {
      setState(() => _error = '请填写所有字段');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = '密码至少 6 位');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthState>().register(username, password, nickname);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(
        title: const Text('注册'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('创建账号', style: TextStyle(
                color: InkColors.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              )),
              const SizedBox(height: 6),
              const Text('开启你的传统文化之旅', style: TextStyle(
                color: InkColors.textSecondary,
                fontSize: 13,
              )),
              const SizedBox(height: 32),
              TextField(
                controller: _nicknameCtrl,
                style: const TextStyle(color: InkColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: '昵称（如：墨客）',
                  prefixIcon: Icon(Icons.badge_outlined, color: InkColors.textDisabled, size: 20),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _usernameCtrl,
                style: const TextStyle(color: InkColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: '用户名（字母/数字）',
                  prefixIcon: Icon(Icons.person_outline, color: InkColors.textDisabled, size: 20),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _passwordCtrl,
                obscureText: true,
                style: const TextStyle(color: InkColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: '密码（至少 6 位）',
                  prefixIcon: Icon(Icons.lock_outline, color: InkColors.textDisabled, size: 20),
                ),
                onSubmitted: (_) => _register(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(
                  color: InkColors.cinnabar,
                  fontSize: 13,
                ), textAlign: TextAlign.center),
              ],
              const SizedBox(height: 28),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _register,
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation(InkColors.background),
                          ),
                        )
                      : const Text('注 册'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
