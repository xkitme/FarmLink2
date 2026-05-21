import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});
  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final auth = context.read<AuthState>();
    await auth.init();
    await Future.delayed(const Duration(milliseconds: 1600));
    if (!mounted) return;
    context.go(auth.isLoggedIn ? '/home' : '/auth/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20),
                  ],
                ),
                child: const Icon(Icons.eco, size: 56, color: AppColors.primary),
              ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack).fade(),
              const SizedBox(height: 24),
              const Text('田园通',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 4))
                  .animate(delay: 300.ms)
                  .fade()
                  .slideY(begin: 0.3),
              const SizedBox(height: 6),
              const Text('FarmLink · 数字乡村助农',
                      style: TextStyle(color: Colors.white70, fontSize: 14, letterSpacing: 2))
                  .animate(delay: 500.ms)
                  .fade(),
              const SizedBox(height: 56),
              const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2),
              ).animate(delay: 700.ms).fade(),
            ],
          ),
        ),
      ),
    );
  }
}
