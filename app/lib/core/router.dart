import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'auth_state.dart';
import 'constants.dart';
import '../pages/ad/startup_ad_page.dart';
import '../pages/splash/splash_page.dart';
import '../pages/auth/login_page.dart';
import '../pages/auth/forgot_password_page.dart';
import '../pages/auth/register_page.dart';
import '../pages/home/shell_page.dart';
import '../pages/home/home_page.dart';
import '../pages/all/all_features_page.dart';
import '../pages/ai/ai_chat_page.dart';
import '../pages/ai/ai_threads_page.dart';
import '../pages/market/market_page.dart';
import '../pages/market/product_detail_page.dart';
import '../pages/machinery/machinery_page.dart';
import '../pages/disaster/disaster_page.dart';
import '../pages/agri/agri_page.dart';
import '../pages/agri/photo_flow_page.dart';
import '../pages/life/life_page.dart';
import '../pages/market/market_service_page.dart';
import '../pages/machinery/machinery_service_page.dart';
import '../pages/policy/policy_service_page.dart';
import '../pages/publish/publish_page.dart';
import '../pages/messages/messages_page.dart';
import '../pages/policy/policy_page.dart';
import '../pages/data/data_dashboard_page.dart';
import '../pages/data/data_service_page.dart';
import '../pages/iot/iot_page.dart';
import '../pages/screen/village_screen_page.dart';
import '../pages/profile/profile_page.dart';
import '../pages/profile/settings/about_page.dart';
import '../pages/profile/settings/account_page.dart';
import '../pages/profile/settings/elder_mode_page.dart';
import '../pages/profile/settings/help_feedback_page.dart';
import '../pages/profile/settings/password_page.dart';
import '../pages/profile/settings/privacy_settings_page.dart';
import '../pages/profile/settings/push_settings_page.dart';
import '../pages/profile/settings/settings_home_page.dart';
import '../pages/profile/settings/storage_page.dart';
import '../pages/profile/settings/weather_alert_page.dart';
import '../pages/common/info_detail_page.dart';
import '../pages/search/search_page.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

GoRouter buildRouter(AuthState auth) => GoRouter(
      navigatorKey: _rootKey,
      initialLocation: '/ad',
      overridePlatformDefaultLocation: true,
      refreshListenable: auth,
      redirect: (ctx, state) {
        if (auth.loading) return null;
        final loc = state.uri.path;
        final loggedIn = auth.isLoggedIn;
        if (loc == '/ad' || loc == '/splash') return null;
        if (!loggedIn && !loc.startsWith('/auth')) return '/auth/login';
        if (loggedIn && loc.startsWith('/auth')) return '/home';
        return null;
      },
      routes: [
        GoRoute(path: '/splash', builder: (_, __) => const SplashPage()),
        GoRoute(path: '/ad', builder: (_, __) => const StartupAdPage()),
        GoRoute(
            path: '/auth/forgot-password',
            builder: (_, __) => const ForgotPasswordPage()),
        GoRoute(
          path: '/auth/login',
          builder: (_, __) => const LoginPage(),
          routes: [
            GoRoute(path: 'register', builder: (_, __) => const RegisterPage()),
          ],
        ),
        GoRoute(path: '/screen', builder: (_, __) => const VillageScreenPage()),
        ShellRoute(
          navigatorKey: _shellKey,
          builder: (ctx, state, child) =>
              ShellPage(location: state.uri.path, child: child),
          routes: [
            GoRoute(path: '/home', builder: (_, __) => const HomePage()),
            GoRoute(path: '/all', builder: (_, __) => const AllFeaturesPage()),
            GoRoute(path: '/search', builder: (_, __) => const SearchPage()),
            GoRoute(
              path: '/detail/info',
              builder: (_, state) {
                final extra = state.extra;
                return InfoDetailPage(
                  data: extra is InfoDetailData
                      ? extra
                      : const InfoDetailData(
                          title: '详情',
                          body: '内容暂时不可用，请返回后重新进入。',
                        ),
                );
              },
            ),
            GoRoute(path: '/ai', builder: (_, __) => const AiThreadsPage()),
            GoRoute(
              // C4：保留 ?scene= 查询参数，未来主页招牌场景入口（如 scene=DISEASE/POLICY）会传
              path: '/ai/chat/new',
              builder: (_, state) => AiChatPage(
                initialScene: state.uri.queryParameters['scene'] ?? 'GENERAL',
              ),
            ),
            GoRoute(
              path: '/ai/chat/:id',
              builder: (_, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '');
                return AiChatPage(threadId: id);
              },
            ),
            GoRoute(path: '/market', builder: (_, __) => const MarketPage()),
            GoRoute(
              path: '/market/product/:id',
              builder: (_, state) => ProductDetailPage(
                productId: int.tryParse(state.pathParameters['id'] ?? ''),
                preview: state.extra as ProductPreview?,
              ),
            ),
            GoRoute(
                path: '/machinery', builder: (_, __) => const MachineryPage()),
            GoRoute(
                path: '/machinery/service',
                builder: (_, __) => const MachineryServicePage()),
            GoRoute(
              path: '/machinery/detail',
              builder: (_, state) {
                final extra = state.extra;
                if (extra is Map<String, dynamic>) {
                  return MachineDetailPage(data: extra);
                }
                return const Scaffold(
                  body: Center(
                    child: Text('农机数据不可用，请返回重试',
                        style: TextStyle(color: AppColors.onSurfaceVariant)),
                  ),
                );
              },
            ),
            GoRoute(path: '/policy', builder: (_, __) => const PolicyPage()),
            GoRoute(
                path: '/policy/service',
                builder: (_, __) => const PolicyServicePage()),
            GoRoute(
                path: '/disaster', builder: (_, __) => const DisasterPage()),
            GoRoute(path: '/agri', builder: (_, __) => const AgriPage()),
            GoRoute(
                path: '/agri/diagnose',
                builder: (_, __) => const PhotoFlowPage()),
            GoRoute(path: '/life', builder: (_, __) => const LifePage()),
            GoRoute(
                path: '/market/service',
                builder: (_, __) => const MarketServicePage()),
            GoRoute(
                path: '/data', builder: (_, __) => const DataDashboardPage()),
            GoRoute(path: '/iot', builder: (_, __) => const IotPage()),
            GoRoute(
                path: '/data/service',
                builder: (_, __) => const DataServicePage()),
            GoRoute(path: '/publish', builder: (_, __) => const PublishPage()),
            GoRoute(
              path: '/publish/detail',
              builder: (_, state) {
                final extra = state.extra;
                if (extra is Map<String, dynamic>) {
                  return PostDetailPage(post: extra);
                }
                return const Scaffold(
                  body: Center(
                    child: Text('动态数据不可用，请返回重试',
                        style: TextStyle(color: AppColors.onSurfaceVariant)),
                  ),
                );
              },
            ),
            GoRoute(
                path: '/messages', builder: (_, __) => const MessagesPage()),
            GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
            GoRoute(
                path: '/profile/settings',
                builder: (_, __) => const SettingsHomePage()),
            GoRoute(
                path: '/profile/settings/account',
                builder: (_, __) => const AccountPage()),
            GoRoute(
                path: '/profile/settings/password',
                builder: (_, __) => const PasswordPage()),
            GoRoute(
                path: '/profile/settings/push',
                builder: (_, __) => const PushSettingsPage()),
            GoRoute(
                path: '/profile/settings/weather',
                builder: (_, __) => const WeatherAlertPage()),
            GoRoute(
                path: '/profile/settings/storage',
                builder: (_, __) => const StoragePage()),
            GoRoute(
                path: '/profile/settings/about',
                builder: (_, __) => const AboutPage()),
            GoRoute(
                path: '/profile/settings/privacy',
                builder: (_, __) => const PrivacySettingsPage()),
            GoRoute(
                path: '/profile/settings/help',
                builder: (_, __) => const HelpFeedbackPage()),
            GoRoute(
                path: '/profile/settings/elder',
                builder: (_, __) => const ElderModePage()),
          ],
        ),
      ],
    );
