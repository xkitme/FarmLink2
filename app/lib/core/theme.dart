import 'package:flutter/material.dart';
import 'constants.dart';

/// 全平台统一的「右进左出」页面切换：新页从右滑入、旧页向左轻微视差移出，
/// back 自动反向，前进/返回视觉对称。
///
/// 不用 `CupertinoPageTransitionsBuilder`——该符号在不同 Flutter 版本的归属
/// 不一致（3.32 在 material、3.44 在 material 已移除），跨机编译会失败；
/// 自定义 `PageTransitionsBuilder` 是全版本稳定 API。
class _SlidePageTransitionsBuilder extends PageTransitionsBuilder {
  const _SlidePageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final enter = Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
        .chain(CurveTween(curve: Curves.easeOutCubic))
        .animate(animation);
    final leave = Tween<Offset>(begin: Offset.zero, end: const Offset(-0.25, 0))
        .chain(CurveTween(curve: Curves.easeOutCubic))
        .animate(secondaryAnimation);
    return SlideTransition(
      position: leave,
      child: SlideTransition(position: enter, child: child),
    );
  }
}

/// Agro-Modernist Tech 主题（参考 docs/设计参考.md）
ThemeData buildAppTheme() {
  const cs = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    primaryContainer: AppColors.primaryContainer,
    onPrimaryContainer: AppColors.onPrimaryContainer,
    secondary: AppColors.secondary,
    onSecondary: Colors.white,
    tertiary: AppColors.tertiary,
    onTertiary: Colors.white,
    error: AppColors.error,
    onError: Colors.white,
    surface: AppColors.surface,
    onSurface: AppColors.onSurface,
    surfaceContainerHighest: AppColors.surfaceHigh,
    outline: AppColors.outline,
    outlineVariant: AppColors.outlineVariant,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: cs,
    scaffoldBackgroundColor: AppColors.background,
    splashFactory: InkRipple.splashFactory,

    // 页面切换：全平台统一右进左出（自定义 builder，跨 Flutter 版本稳定），
    // back 自动反向，前进/返回视觉对称。M3 默认 Zoom 进出方向一致，观感"不协调"。
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: _SlidePageTransitionsBuilder(),
        TargetPlatform.iOS: _SlidePageTransitionsBuilder(),
        TargetPlatform.linux: _SlidePageTransitionsBuilder(),
        TargetPlatform.macOS: _SlidePageTransitionsBuilder(),
        TargetPlatform.windows: _SlidePageTransitionsBuilder(),
        TargetPlatform.fuchsia: _SlidePageTransitionsBuilder(),
      },
    ),

    // 白底顶栏
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.primary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: AppColors.primary,
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
      ),
      iconTheme: IconThemeData(color: AppColors.onSurfaceVariant),
    ),

    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md)),
    ),

    // 输入框：白底 + 方角描边（R.sm），聚焦转主绿。
    // 利落方正，无下划线 / 无灰胶囊（沉淀自 AppSearchField 标准）。
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      hintStyle: const TextStyle(color: AppColors.outline),
      labelStyle:
          const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 14),
      floatingLabelStyle: const TextStyle(
          color: AppColors.primary, fontWeight: FontWeight.w600),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(R.sm),
        borderSide:
            const BorderSide(color: AppColors.outlineVariant, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(R.sm),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(R.sm),
        borderSide:
            const BorderSide(color: AppColors.outlineVariant, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(R.sm),
        borderSide: const BorderSide(color: AppColors.error, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(R.sm),
        borderSide: const BorderSide(color: AppColors.error, width: 1.5),
      ),
    ),

    // 主按钮：方角实心绿（R.sm），利落方正，无胶囊
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size(0, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.sm)),
        textStyle: const TextStyle(
            fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5),
      ),
    ),

    // 次按钮：方角主绿描边（R.sm）
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        minimumSize: const Size(0, 52),
        side: const BorderSide(color: AppColors.outlineVariant, width: 1.5),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.sm)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    dividerTheme: const DividerThemeData(
      color: AppColors.outlineVariant,
      thickness: 1,
      space: 1,
    ),

    // chip：未选中浅底深字，选中主绿底白字（高对比，去勾更利落）
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.surfaceContainer,
      selectedColor: AppColors.primary,
      labelStyle: const TextStyle(
          fontSize: 13, color: AppColors.onSurface, fontWeight: FontWeight.w500),
      secondaryLabelStyle: const TextStyle(
          fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600),
      checkmarkColor: Colors.white,
      showCheckmark: false,
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.sm)),
    ),

    textTheme: const TextTheme(
      headlineLarge: TextStyle(
          color: AppColors.onSurface,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          letterSpacing: 0),
      headlineMedium: TextStyle(
          color: AppColors.onSurface,
          fontSize: 24,
          fontWeight: FontWeight.w600,
          letterSpacing: 0),
      headlineSmall: TextStyle(
          color: AppColors.onSurface,
          fontSize: 20,
          fontWeight: FontWeight.w600),
      titleMedium: TextStyle(
          color: AppColors.onSurface,
          fontSize: 16,
          fontWeight: FontWeight.w600),
      bodyLarge:
          TextStyle(color: AppColors.onSurface, fontSize: 16, height: 1.45),
      bodyMedium:
          TextStyle(color: AppColors.onSurface, fontSize: 14, height: 1.4),
      bodySmall: TextStyle(
          color: AppColors.onSurfaceVariant, fontSize: 12, height: 1.35),
      labelLarge: TextStyle(
          color: AppColors.onSurface,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2),
      labelSmall: TextStyle(
          color: AppColors.onSurfaceVariant,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.4),
    ),
  );
}
