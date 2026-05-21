import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/auth_state.dart';
import 'core/router.dart';
import 'core/theme.dart';
import 'core/constants.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: InkColors.background,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const InkFlowApp());
}

class InkFlowApp extends StatefulWidget {
  const InkFlowApp({super.key});

  @override
  State<InkFlowApp> createState() => _InkFlowAppState();
}

class _InkFlowAppState extends State<InkFlowApp> {
  late final AuthState _auth;

  @override
  void initState() {
    super.initState();
    _auth = AuthState();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _auth,
      child: Consumer<AuthState>(
        builder: (ctx, auth, _) {
          final router = buildRouter(auth);
          return MaterialApp.router(
            title: '墨脉 InkFlow',
            theme: buildInkTheme(),
            routerConfig: router,
            debugShowCheckedModeBanner: false,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: TextScaler.noScaling),
              child: child!,
            ),
          );
        },
      ),
    );
  }
}
