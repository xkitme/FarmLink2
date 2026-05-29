import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'core/auth_state.dart';
import 'core/router.dart';
import 'core/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const FarmLinkApp());
}

class FarmLinkApp extends StatefulWidget {
  const FarmLinkApp({super.key});
  @override
  State<FarmLinkApp> createState() => _FarmLinkAppState();
}

class _FarmLinkAppState extends State<FarmLinkApp> {
  final AuthState _auth = AuthState();
  late final GoRouter _router;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _router = buildRouter(_auth);
    _auth.init().whenComplete(() {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return MaterialApp(
        title: '田园通 FarmLink',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        builder: _clampTextScaler,
        home: const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    return ChangeNotifierProvider.value(
      value: _auth,
      child: MaterialApp.router(
        title: '田园通 FarmLink',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        routerConfig: _router,
        builder: _clampTextScaler,
      ),
    );
  }

  /// 限制系统字体缩放在 0.9~1.1，避免系统大字体把卡片撑爆（issue #4~#13 根因）
  Widget _clampTextScaler(BuildContext context, Widget? child) {
    final mq = MediaQuery.of(context);
    final clamped = mq.textScaler.clamp(minScaleFactor: 0.9, maxScaleFactor: 1.1);
    return MediaQuery(
      data: mq.copyWith(textScaler: clamped),
      child: child!,
    );
  }
}
