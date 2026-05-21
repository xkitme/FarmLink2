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
    _init();
  }

  Future<void> _init() async {
    final auth = context.read<AuthState>();
    await auth.init();
    if (!mounted) return;
    await Future.delayed(const Duration(milliseconds: 2200));
    if (!mounted) return;
    context.go(auth.isLoggedIn ? '/home' : '/auth/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 墨点动画
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  colors: [InkColors.gold, InkColors.goldDim],
                ),
                boxShadow: [
                  BoxShadow(
                    color: InkColors.gold.withOpacity(0.4),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Center(
                child: Text('墨', style: TextStyle(
                  color: Color(0xFF0A0B0E),
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                )),
              ),
            )
            .animate()
            .scale(duration: 800.ms, curve: Curves.elasticOut)
            .fade(duration: 400.ms),

            const SizedBox(height: 28),

            Text(
              '𝑰𝒏𝒌𝑭𝒍𝒐𝒘',
              style: const TextStyle(
                color: InkColors.gold,
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 3,
              ),
            )
            .animate(delay: 400.ms)
            .slideY(begin: 0.3, curve: Curves.easeOut, duration: 600.ms)
            .fade(duration: 600.ms),

            const SizedBox(height: 8),

            const Text(
              '墨脉 · 中华传统文化 × AI 学习',
              style: TextStyle(
                color: InkColors.textSecondary,
                fontSize: 13,
                letterSpacing: 2,
              ),
            )
            .animate(delay: 700.ms)
            .fade(duration: 600.ms),

            const SizedBox(height: 60),

            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 1.5,
                valueColor: AlwaysStoppedAnimation(InkColors.goldDim),
              ),
            )
            .animate(delay: 1000.ms)
            .fade(duration: 400.ms),
          ],
        ),
      ),
    );
  }
}
