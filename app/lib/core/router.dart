import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'auth_state.dart';
import '../pages/splash/splash_page.dart';
import '../pages/auth/login_page.dart';
import '../pages/auth/register_page.dart';
import '../pages/home/shell_page.dart';
import '../pages/home/home_page.dart';
import '../pages/ai/ai_page.dart';
import '../pages/publish/publish_page.dart';
import '../pages/messages/messages_page.dart';
import '../pages/profile/profile_page.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

GoRouter buildRouter(AuthState auth) => GoRouter(
      navigatorKey: _rootKey,
      initialLocation: '/splash',
      refreshListenable: auth,
      redirect: (ctx, state) {
        if (auth.loading) return null;
        final loc = state.uri.path;
        final loggedIn = auth.isLoggedIn;
        if (loc == '/splash') return null;
        if (!loggedIn && !loc.startsWith('/auth')) return '/auth/login';
        if (loggedIn && loc.startsWith('/auth')) return '/home';
        return null;
      },
      routes: [
        GoRoute(path: '/splash', builder: (_, __) => const SplashPage()),
        GoRoute(
          path: '/auth/login',
          builder: (_, __) => const LoginPage(),
          routes: [
            GoRoute(path: 'register', builder: (_, __) => const RegisterPage()),
          ],
        ),
        ShellRoute(
          navigatorKey: _shellKey,
          builder: (ctx, state, child) => ShellPage(child: child),
          routes: [
            GoRoute(path: '/home',     builder: (_, __) => const HomePage()),
            GoRoute(path: '/ai',       builder: (_, __) => const AiPage()),
            GoRoute(path: '/publish',  builder: (_, __) => const PublishPage()),
            GoRoute(path: '/messages', builder: (_, __) => const MessagesPage()),
            GoRoute(path: '/profile',  builder: (_, __) => const ProfilePage()),
          ],
        ),
      ],
    );
