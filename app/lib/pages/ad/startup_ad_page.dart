import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/legal_documents.dart';
import '../../core/site_images.dart';
import '../../widgets/agreement_dialog.dart';

class StartupAdPage extends StatefulWidget {
  const StartupAdPage({super.key});

  @override
  State<StartupAdPage> createState() => _StartupAdPageState();
}

class _StartupAdConfig {
  final bool enabled;
  final String imageUrl;
  final int durationMs;
  final String targetPath;

  const _StartupAdConfig({
    required this.enabled,
    required this.imageUrl,
    required this.durationMs,
    required this.targetPath,
  });

  factory _StartupAdConfig.fromJson(Map<String, dynamic> json) {
    final rawDurationMs = json['durationMs'];
    final rawDurationSeconds = json['durationSeconds'];
    var durationMs = 5000;
    if (rawDurationMs is num) {
      durationMs = rawDurationMs.round();
    } else if (rawDurationSeconds is num) {
      durationMs = (rawDurationSeconds * 1000).round();
    }
    durationMs = durationMs.clamp(1000, 60000).toInt();

    final targetPath = '${json['targetPath'] ?? '/home'}'.trim();
    return _StartupAdConfig(
      enabled: json['enabled'] != false,
      imageUrl: '${json['imageUrl'] ?? ''}'.trim(),
      durationMs: durationMs,
      targetPath: targetPath.startsWith('/') ? targetPath : '/home',
    );
  }
}

class _StartupAdPageState extends State<StartupAdPage> {
  _StartupAdConfig? _ad;
  Timer? _timer;
  DateTime? _deadline;
  int _remainingSeconds = 0;
  bool _agreementShowing = false;
  bool _countdownActive = false;
  bool _exited = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/site/startup-ad')
          .timeout(const Duration(seconds: 2));
      if (!mounted) return;
      final ad = _StartupAdConfig.fromJson(data as Map<String, dynamic>);
      if (!ad.enabled || ad.imageUrl.isEmpty || ad.durationMs <= 0) {
        _finishAd(ad.targetPath);
        return;
      }
      // 广告图始终渲染作背景。
      setState(() => _ad = ad);
      if (context.read<AuthState>().isLoggedIn) {
        // 已登录：正常倒计时广告，显示「跳过」按钮。
        _startCountdown(ad.durationMs);
      } else {
        // 未登录：广告图作背景，直接弹服务协议浮于其上；不启动倒计时、不显示
        // 「跳过」按钮，避免按钮闪现一帧又被协议模态覆盖。
        _finishAd(ad.targetPath);
      }
    } catch (_) {
      if (mounted) _finishAd('/home');
    }
  }

  void _startCountdown(int durationMs) {
    _countdownActive = true;
    _deadline = DateTime.now().add(Duration(milliseconds: durationMs));
    _tick();
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 250), (_) => _tick());
  }

  void _tick() {
    final deadline = _deadline;
    if (deadline == null || !mounted) return;
    final leftMs = deadline.difference(DateTime.now()).inMilliseconds;
    final nextSeconds = leftMs <= 0 ? 0 : (leftMs + 999) ~/ 1000;
    if (nextSeconds != _remainingSeconds) {
      setState(() => _remainingSeconds = nextSeconds);
    }
    if (leftMs <= 0) _finishAd(_ad?.targetPath ?? '/home');
  }

  Future<void> _finishAd(String path) async {
    _timer?.cancel();
    if (!mounted || _agreementShowing || _exited) return;

    if (context.read<AuthState>().isLoggedIn) {
      context.go(path);
      return;
    }

    setState(() => _agreementShowing = true);
    final agreed = await showAgreementDialog(
      context,
      title: kServiceAgreementTitle,
      sections: kServiceAgreementSections,
      consentMode: true,
    );
    if (!mounted) return;

    if (agreed == true) {
      context.go('/auth/login');
    } else {
      _exitApp();
    }
  }

  void _exitApp() {
    if (kIsWeb) {
      setState(() => _exited = true);
      return;
    }
    SystemNavigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    if (_exited) {
      return const Scaffold(
        backgroundColor: Color(0xFF10211A),
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(28),
            child: Text(
              '您已退出田园通\n请关闭当前页面',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                height: 1.6,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );
    }

    final ad = _ad;
    if (ad == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 全屏大图 + 渐变隔离成独立缓存层：协议弹窗（半透明遮罩 + CRT 动画）
          // 浮在其上时，这层静止不变，引擎复用缓存而不必每帧透过遮罩重采样大图，
          // 否则广告页模态框会明显掉帧（登录页背景简单故不卡）。
          RepaintBoundary(
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  ApiClient.resolveImageUrl(ad.imageUrl),
                  fit: BoxFit.cover,
                  filterQuality: FilterQuality.low,
                  errorBuilder: (_, __, ___) => const SiteImage(
                    'assets/images/generated/farm-market.jpg',
                    fit: BoxFit.cover,
                  ),
                ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x66000000),
                        Color(0x08000000),
                        Color(0x99000000),
                      ],
                      stops: [0, 0.48, 1],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // 「跳过」按钮仅在倒计时进行中显示（即已登录看广告时）；未登录场景
          // 不启动倒计时，按钮始终不渲染，协议弹窗直接浮在广告图上。
          if (_countdownActive && !_agreementShowing)
            SafeArea(
              child: Align(
                alignment: Alignment.topRight,
                child: Padding(
                  padding: const EdgeInsets.only(top: 14, right: 14),
                  child: TextButton(
                    onPressed: () => _finishAd(ad.targetPath),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.white,
                      backgroundColor: Colors.black.withValues(alpha: 0.62),
                      shape: const StadiumBorder(),
                      minimumSize: const Size(116, 50),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      side: BorderSide(
                        color: Colors.white.withValues(alpha: 0.7),
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$_remainingSeconds秒跳过',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Icon(Icons.arrow_forward, size: 19),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
