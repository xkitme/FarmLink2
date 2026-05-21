import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _auth,
      child: Consumer<AuthState>(
        builder: (ctx, auth, _) => MaterialApp.router(
          title: '田园通 FarmLink',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(),
          routerConfig: buildRouter(auth),
        ),
      ),
    );
  }
}
