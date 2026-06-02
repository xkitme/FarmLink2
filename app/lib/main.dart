import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
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
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('zh'), Locale('en')],
        locale: const Locale('zh'),
        builder: _appBuilder,
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
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('zh'), Locale('en')],
        locale: const Locale('zh'),
        routerConfig: _router,
        builder: _appBuilder,
      ),
    );
  }

  /// 手机宽度上限：web 构建被约束成手机框，超出部分留作背景
  static const double _phoneFrameWidth = 430;

  /// 全局包裹层：
  /// 1) 字体缩放 clamp 0.9~1.1（无障碍，全平台）
  /// 2) **web 专用**：把整个 App 约束成居中的「手机框」，避免移动端 UI
  ///    在桌面浏览器整窗铺开被拉成巨大卡片 / 异常滚动。同时把
  ///    MediaQuery.size 同步成框宽，让用 size 算比例的页面也正确。
  ///    非 web（APK）走原逻辑，零影响。
  Widget _appBuilder(BuildContext context, Widget? child) {
    final mq = MediaQuery.of(context);
    final textScaler =
        mq.textScaler.clamp(minScaleFactor: 0.9, maxScaleFactor: 1.1);

    if (!kIsWeb || mq.size.width <= _phoneFrameWidth) {
      // 原生端，或 web 窗口本就 ≤ 手机宽（真机浏览器）：只做字号 clamp
      return MediaQuery(
        data: mq.copyWith(textScaler: textScaler),
        child: child!,
      );
    }

    return ColoredBox(
      color: const Color(0xFF10211A),
      child: Center(
        child: ClipRect(
          child: SizedBox(
            width: _phoneFrameWidth,
            height: double.infinity,
            child: MediaQuery(
              data: mq.copyWith(
                textScaler: textScaler,
                size: Size(_phoneFrameWidth, mq.size.height),
              ),
              child: child!,
            ),
          ),
        ),
      ),
    );
  }
}
