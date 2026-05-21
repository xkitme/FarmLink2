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
  final _nickname = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nickname.dispose();
    _username.dispose();
    _password.dispose();
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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().register(u, p, n);
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
      appBar: AppBar(title: const Text('注册账号')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('加入田园通',
                  style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              const Text('开启你的数字助农之旅',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
              const SizedBox(height: 30),
              TextField(
                controller: _nickname,
                decoration: const InputDecoration(
                  hintText: '昵称',
                  prefixIcon: Icon(Icons.badge_outlined, color: AppColors.textHint),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _username,
                decoration: const InputDecoration(
                  hintText: '用户名（字母 / 数字）',
                  prefixIcon: Icon(Icons.person_outline, color: AppColors.textHint),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _password,
                obscureText: true,
                onSubmitted: (_) => _register(),
                decoration: const InputDecoration(
                  hintText: '密码（至少 6 位）',
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
                  onPressed: _loading ? null : _register,
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
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
