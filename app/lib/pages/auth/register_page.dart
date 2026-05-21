import 'package:flutter/material.dart';
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

  Widget _field(String label, TextEditingController c, String hint, IconData icon,
      {bool obscure = false, TextInputAction action = TextInputAction.next}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 6),
        TextField(
          controller: c,
          obscureText: obscure,
          textInputAction: action,
          onSubmitted: action == TextInputAction.done ? (_) => _register() : null,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, color: AppColors.outline),
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
      appBar: AppBar(
        title: const Text('注册账号'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurfaceVariant),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: AppCard(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('加入田园通',
                  style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const SizedBox(height: 4),
              const Text('开启你的数字助农之旅',
                  style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 14)),
              const SizedBox(height: 24),
              _field('昵称', _nickname, '怎么称呼你', Icons.badge_outlined),
              _field('用户名', _username, '字母 / 数字', Icons.person_outline),
              _field('密码', _password, '至少 6 位', Icons.lock_outline,
                  obscure: true, action: TextInputAction.done),
              if (_error != null) ...[
                Text(_error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.error, fontSize: 13)),
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
                    : const Text('注 册'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
