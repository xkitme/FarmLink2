import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'auth_state.dart';
import '../pages/splash/splash_page.dart';
import '../pages/auth/login_page.dart';
import '../pages/auth/register_page.dart';
import '../pages/home/shell_page.dart';
import '../pages/home/home_page.dart';
import '../pages/ai/ai_page.dart';
import '../pages/market/market_page.dart';
import '../pages/machinery/machinery_page.dart';
import '../pages/disaster/disaster_page.dart';
import '../pages/agri/agri_page.dart';
import '../pages/life/life_page.dart';
import '../pages/market/market_service_page.dart';
import '../pages/machinery/machinery_service_page.dart';
import '../pages/policy/policy_service_page.dart';
import '../pages/publish/publish_page.dart';
import '../pages/messages/messages_page.dart';
import '../pages/policy/policy_page.dart';
import '../pages/data/data_dashboard_page.dart';
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
            GoRoute(path: '/home', builder: (_, __) => const HomePage()),
            GoRoute(path: '/ai', builder: (_, __) => const AiPage()),
            GoRoute(path: '/market', builder: (_, __) => const MarketPage()),
            GoRoute(
                path: '/machinery', builder: (_, __) => const MachineryPage()),
            GoRoute(
                path: '/machinery/service',
                builder: (_, __) => const MachineryServicePage()),
            GoRoute(path: '/policy', builder: (_, __) => const PolicyPage()),
            GoRoute(
                path: '/policy/service',
                builder: (_, __) => const PolicyServicePage()),
            GoRoute(
                path: '/disaster', builder: (_, __) => const DisasterPage()),
            GoRoute(path: '/agri', builder: (_, __) => const AgriPage()),
            GoRoute(path: '/life', builder: (_, __) => const LifePage()),
            GoRoute(
                path: '/market/service',
                builder: (_, __) => const MarketServicePage()),
            GoRoute(
                path: '/data', builder: (_, __) => const DataDashboardPage()),
            GoRoute(path: '/publish', builder: (_, __) => const PublishPage()),
            GoRoute(
                path: '/messages', builder: (_, __) => const MessagesPage()),
            GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
          ],
        ),
      ],
    );
