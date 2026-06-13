import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _Slide {
  final String image;
  final String title;
  final String body;

  const _Slide(this.image, this.title, this.body);
}

class _SplashPageState extends State<SplashPage> {
  final _pc = PageController();
  int _page = 0;
  bool _skip = false;

  static const _slides = [
    _Slide(
      'assets/images/generated/smart-farming.jpg',
      'AI 智慧种田',
      '病虫害拍照识别、精细气象预警，田间难题随手解决',
    ),
    _Slide(
      'assets/images/generated/farm-market.jpg',
      '产销直通田间',
      '农产品直供集市、实时行情查询，好收成卖出好价钱',
    ),
    _Slide(
      'assets/images/generated/rural-life.jpg',
      '共建社区，乐享生活',
      '农产品直供，共享农机，助力乡村振兴',
    ),
  ];

  @override
  void initState() {
    super.initState();
    if (context.read<AuthState>().isLoggedIn) {
      _skip = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _go());
    }
  }

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  void _go() {
    if (!mounted) return;
    final auth = context.read<AuthState>();
    context.go(auth.isLoggedIn ? '/ad' : '/auth/login');
  }

  Future<void> _finish() async {
    await context.read<AuthState>().markOnboardingSeen();
    _go();
  }

  void _next() {
    if (_page < _slides.length - 1) {
      _pc.nextPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOut,
      );
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_skip) {
      return const Scaffold(backgroundColor: AppColors.background);
    }
    final isLast = _page == _slides.length - 1;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pc,
            itemCount: _slides.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (_, i) => _SlideView(slide: _slides[i]),
          ),
          if (!isLast)
            Positioned(
              top: 44,
              right: 12,
              child: TextButton(
                onPressed: _finish,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  backgroundColor: Colors.black.withValues(alpha: 0.25),
                  shape: const StadiumBorder(),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                ),
                child: const Text('跳过'),
              ),
            ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 40,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < _slides.length; i++) ...[
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        width: i == _page ? 32 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: i == _page
                              ? AppColors.primary
                              : AppColors.surfaceHigh,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      if (i < _slides.length - 1) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _next,
                    child: Text(
                      isLast ? '立即开启' : '下一步',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SlideView extends StatelessWidget {
  final _Slide slide;

  const _SlideView({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          flex: 6,
          child: Stack(
            fit: StackFit.expand,
            children: [
              SiteImage(
                slide.image,
                fit: BoxFit.cover,
                errorFallback: const ColoredBox(color: Color(0xFF2E7D32)),
              ),
              const Align(
                alignment: Alignment.bottomCenter,
                child: SizedBox(
                  height: 120,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [AppColors.background, Color(0x00F9F9F9)],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 48,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surface.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: AppColors.ambientShadow,
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.agriculture,
                          color: AppColors.primary,
                          size: 22,
                        ),
                        SizedBox(width: 6),
                        Text(
                          '田园通',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 22,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          flex: 4,
          child: Transform.translate(
            offset: const Offset(0, -32),
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(48)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x14795548),
                    blurRadius: 30,
                    offset: Offset(0, -8),
                  ),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(28, 36, 28, 0),
              child: Column(
                children: [
                  Text(
                    slide.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    slide.body,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      height: 1.55,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
