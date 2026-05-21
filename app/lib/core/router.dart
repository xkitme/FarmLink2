import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'auth_state.dart';
import '../pages/splash/splash_page.dart';
import '../pages/auth/login_page.dart';
import '../pages/auth/register_page.dart';
import '../pages/home/shell_page.dart';
import '../pages/home/home_page.dart';
import '../pages/explore/explore_page.dart';
import '../pages/explore/content_detail_page.dart';
import '../pages/ai/ai_page.dart';
import '../pages/ai/chat_page.dart';
import '../pages/ai/character_page.dart';
import '../pages/ai/calligraphy_page.dart';
import '../pages/learning/learning_page.dart';
import '../pages/learning/review_page.dart';
import '../pages/profile/profile_page.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

GoRouter buildRouter(AuthState auth) => GoRouter(
  navigatorKey: _rootKey,
  initialLocation: '/splash',
  redirect: (ctx, state) {
    final loading = auth.loading;
    final loggedIn = auth.isLoggedIn;
    final loc = state.uri.path;
    if (loading) return null;
    if (!loggedIn && !loc.startsWith('/auth') && loc != '/splash') return '/auth/login';
    if (loggedIn && loc.startsWith('/auth')) return '/home';
    return null;
  },
  refreshListenable: auth,
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
        GoRoute(path: '/explore',  builder: (_, __) => const ExplorePage(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (_, s) => ContentDetailPage(id: s.pathParameters['id']!),
            ),
          ],
        ),
        GoRoute(path: '/ai',       builder: (_, __) => const AiPage(),
          routes: [
            GoRoute(path: 'chat',         builder: (_, __) => const ChatPage()),
            GoRoute(path: 'character',    builder: (_, s) {
              final key = s.uri.queryParameters['key'] ?? 'confucius';
              return CharacterPage(characterKey: key);
            }),
            GoRoute(path: 'calligraphy',  builder: (_, __) => const CalligraphyPage()),
          ],
        ),
        GoRoute(path: '/learning', builder: (_, __) => const LearningPage(),
          routes: [
            GoRoute(path: 'review', builder: (_, __) => const ReviewPage()),
          ],
        ),
        GoRoute(path: '/profile',  builder: (_, __) => const ProfilePage()),
      ],
    ),
  ],
);
