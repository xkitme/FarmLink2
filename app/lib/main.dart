import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/auth_credential_store.dart';
import 'core/auth_state.dart';
import 'core/elder_mode.dart';
import 'core/router.dart';
import 'core/theme.dart';
import 'core/voice_wake.dart';
import 'design_system/farm_tokens.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const FarmLinkApp());
}

/// 依赖组合根（AppBootstrap）。
///
/// 116h-A 把「谁创建什么、谁依赖什么」集中到这一处，而不是散在 State 里：
/// - 平台依赖通过构造注入（[CredentialStorage]，测试用内存实现替换）；
///   密钥存储 / 语音 / 识图等平台能力已在 `core/` 以接口 + 原生/web 实现分离。
/// - 三个可观察状态（认证 / 适老 / 语音唤醒）与路由在此装配。
/// - [init] 按依赖顺序初始化：认证 → 适老（依赖用户）→ 语音唤醒。
class AppBootstrap {
  AppBootstrap({CredentialStorage? credentialStorage}) {
    auth = AuthState(credentialStorage: credentialStorage);
    elderMode = ElderModeState();
    voiceWake = VoiceWakeState();
    router = buildRouter(auth);
  }

  late final AuthState auth;
  late final ElderModeState elderMode;
  late final VoiceWakeState voiceWake;
  late final GoRouter router;

  Future<void> init() async {
    await auth.init();
    await elderMode.init(user: auth.user);
    await voiceWake.init();
  }
}

class FarmLinkApp extends StatefulWidget {
  const FarmLinkApp({super.key, this.credentialStorage});

  final CredentialStorage? credentialStorage;

  @override
  State<FarmLinkApp> createState() => _FarmLinkAppState();
}

class _FarmLinkAppState extends State<FarmLinkApp> {
  late final AppBootstrap _bootstrap;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _bootstrap = AppBootstrap(credentialStorage: widget.credentialStorage);
    _bootstrap.init().whenComplete(() {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return MaterialApp(
        title: '田园通',
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
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _bootstrap.auth),
        ChangeNotifierProvider.value(value: _bootstrap.elderMode),
        ChangeNotifierProvider.value(value: _bootstrap.voiceWake),
      ],
      child: MaterialApp.router(
        title: '田园通',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('zh'), Locale('en')],
        locale: const Locale('zh'),
        routerConfig: _bootstrap.router,
        builder: _appBuilder,
      ),
    );
  }

  /// 手机宽度上限：web 构建被约束成手机框，超出部分留作背景
  static const double _phoneFrameWidth = 430;

  /// 全局包裹层：
  /// 1) 字体缩放 clamp（无障碍，全平台）：常规夹取 0.9~1.1，适老模式抬到 1.3~1.35。
  /// 2) **web 专用**：把整个 App 约束成居中的「手机框」，避免移动端 UI
  ///    在桌面浏览器整窗铺开被拉成巨大卡片 / 异常滚动。同时把
  ///    MediaQuery.size 同步成框宽，让用 size 算比例的页面也正确。
  ///    非 web（APK）走原逻辑，零影响。
  Widget _appBuilder(BuildContext context, Widget? child) {
    final mq = MediaQuery.of(context);
    final elderMode = context.watch<ElderModeState?>()?.enabled ?? false;
    final textScaler = elderMode
        ? mq.textScaler.clamp(
            minScaleFactor: FarmTypography.elderMinTextScale,
            maxScaleFactor: FarmTypography.elderMaxTextScale)
        : mq.textScaler.clamp(
            minScaleFactor: FarmTypography.minTextScale,
            maxScaleFactor: FarmTypography.maxTextScale);

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
