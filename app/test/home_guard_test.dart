import 'package:farmlink/core/api_client.dart';
import 'package:farmlink/core/auth_state.dart';
import 'package:farmlink/core/constants.dart';
import 'package:farmlink/core/router.dart';
import 'package:farmlink/pages/auth/login_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fakes.dart';

void main() {
  late AuthState auth;
  late GoRouter router;

  void resetApiClient() {
    ApiClient.baseUrl = kBaseUrl;
    ApiClient.setToken(null);
    ApiClient.configureAuth(
      refreshHandler: () async => false,
      sessionExpiredHandler: () async {},
    );
  }

  setUp(() async {
    resetApiClient();
    SharedPreferences.setMockInitialValues({});
  });

  tearDown(() async {
    router.dispose();
    auth.dispose();
    resetApiClient();
  });

  testWidgets(
    'B14: unauthenticated /home redirects to /auth/login and renders LoginPage',
    (WidgetTester tester) async {
      auth = AuthState(credentialStorage: InMemoryCredentialStorage());
      await auth.init();

      router = buildRouter(auth);

      await tester.pumpWidget(
        ChangeNotifierProvider<AuthState>.value(
          value: auth,
          child: MaterialApp.router(
            routerConfig: router,
          ),
        ),
      );

      router.go('/home');
      await tester.pumpAndSettle();

      expect(
        router.routeInformationProvider.value.uri.toString(),
        '/auth/login',
      );

      expect(find.byType(LoginPage), findsOneWidget);
    },
  );
}
