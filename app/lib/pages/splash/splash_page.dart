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
    await Future.delayed(const Duration(milliseconds: 1700));
    if (!mounted) return;
    context.go(auth.isLoggedIn ? '/home' : '/auth/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // 顶部 hero 渐变区
          Expanded(
            flex: 5,
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(gradient: AppColors.heroGradient),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 104,
                      height: 104,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(R.lg),
                        boxShadow: AppColors.ambientShadow,
                      ),
                      child: const Icon(Icons.agriculture, size: 60, color: AppColors.primary),
                    ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
                    const SizedBox(height: 20),
                    const Text('FarmLink 田园通',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5))
                        .animate(delay: 300.ms)
                        .fade()
                        .slideY(begin: 0.3),
                  ],
                ),
              ),
            ),
          ),
          // 底部白色信息区
          Expanded(
            flex: 4,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('共建社区，乐享生活',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface))
                      .animate(delay: 500.ms)
                      .fade(),
                  const SizedBox(height: 10),
                  const Text('农产品直供 · 共享农机 · 助力乡村振兴',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 14, color: AppColors.onSurfaceVariant, height: 1.6))
                      .animate(delay: 650.ms)
                      .fade(),
                  const SizedBox(height: 36),
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        color: AppColors.primary, strokeWidth: 2.4),
                  ).animate(delay: 800.ms).fade(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
