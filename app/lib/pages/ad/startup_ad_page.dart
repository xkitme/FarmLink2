import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/site_images.dart';

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
      final data = await ApiClient.get('/site/startup-ad');
      if (!mounted) return;
      final ad = _StartupAdConfig.fromJson(data as Map<String, dynamic>);
      if (!ad.enabled || ad.imageUrl.isEmpty || ad.durationMs <= 0) {
        _goTarget(ad.targetPath);
        return;
      }
      setState(() => _ad = ad);
      _startCountdown(ad.durationMs);
    } catch (_) {
      if (mounted) _goTarget('/home');
    }
  }

  void _startCountdown(int durationMs) {
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
    if (leftMs <= 0) _goTarget(_ad?.targetPath ?? '/home');
  }

  void _goTarget(String path) {
    _timer?.cancel();
    if (!mounted) return;
    context.go(path);
  }

  @override
  Widget build(BuildContext context) {
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
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 14, right: 14),
                child: TextButton(
                  onPressed: () => _goTarget(ad.targetPath),
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
