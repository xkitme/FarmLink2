import 'package:flutter/material.dart';
import '../design_system/farm_tokens.dart';

/// 全平台统一的「右进左出」页面切换：新页从右滑入、旧页向左轻微视差移出，
/// back 自动反向，前进/返回视觉对称。
///
/// 不用 `CupertinoPageTransitionsBuilder`——该符号在不同 Flutter 版本的归属
/// 不一致（3.32 在 material、3.44 在 material 已移除），跨机编译会失败；
/// 自定义 `PageTransitionsBuilder` 是全版本稳定 API。
///
/// 方向契约（116h-A 系统导航收口）：
/// - **进入下级**（push）：新页自右滑入（dx: +1 → 0）；
/// - **返回上级**（pop）：新页自原位滑出右侧（dx: 0 → +1，动画自动反向），
///   与进入方向严格对称——返回必须走 `pop` 而非 `go`，否则会触发
///   「再前进」式动画造成方向反向（见 docs/108 的 push/pop 混用教训）。
class FarmSlidePageTransitionsBuilder extends PageTransitionsBuilder {
  const FarmSlidePageTransitionsBuilder();

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
    primary: FarmColors.primary,
    onPrimary: Colors.white,
    primaryContainer: FarmColors.primaryContainer,
    onPrimaryContainer: FarmColors.onPrimaryContainer,
    secondary: FarmColors.secondary,
    onSecondary: Colors.white,
    tertiary: FarmColors.tertiary,
    onTertiary: Colors.white,
    error: FarmColors.error,
    onError: Colors.white,
    surface: FarmColors.surface,
    onSurface: FarmColors.onSurface,
    surfaceContainerHighest: FarmColors.surfaceHigh,
    outline: FarmColors.outline,
    outlineVariant: FarmColors.outlineVariant,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: cs,
    scaffoldBackgroundColor: FarmColors.background,
    splashFactory: InkRipple.splashFactory,

    // 页面切换：全平台统一右进左出（自定义 builder，跨 Flutter 版本稳定），
    // back 自动反向，前进/返回视觉对称。M3 默认 Zoom 进出方向一致，观感"不协调"。
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FarmSlidePageTransitionsBuilder(),
        TargetPlatform.iOS: FarmSlidePageTransitionsBuilder(),
        TargetPlatform.linux: FarmSlidePageTransitionsBuilder(),
        TargetPlatform.macOS: FarmSlidePageTransitionsBuilder(),
        TargetPlatform.windows: FarmSlidePageTransitionsBuilder(),
        TargetPlatform.fuchsia: FarmSlidePageTransitionsBuilder(),
      },
    ),

    // 白底顶栏
    appBarTheme: const AppBarTheme(
      backgroundColor: FarmColors.background,
      foregroundColor: FarmColors.onSurface,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: FarmColors.onSurface,
        fontSize: 17,
        fontWeight: FontWeight.w800,
        letterSpacing: 0,
      ),
      iconTheme: IconThemeData(color: FarmColors.onSurfaceVariant),
    ),

    cardTheme: CardThemeData(
      color: FarmColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(FarmRadius.md)),
    ),

    // 输入框：白底 + 方角描边（FarmRadius.sm），聚焦转主绿。
    // 利落方正，无下划线 / 无灰胶囊（沉淀自 AppSearchField 标准）。
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: FarmColors.surface,
      hintStyle: const TextStyle(color: FarmColors.outline),
      labelStyle:
          const TextStyle(color: FarmColors.onSurfaceVariant, fontSize: 14),
      floatingLabelStyle: const TextStyle(
          color: FarmColors.primary, fontWeight: FontWeight.w600),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(FarmRadius.md),
        borderSide: const BorderSide(color: FarmColors.outlineVariant, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(FarmRadius.md),
        borderSide: const BorderSide(color: FarmColors.primary, width: 1.5),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(FarmRadius.md),
        borderSide: const BorderSide(color: FarmColors.outlineVariant, width: 1),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(FarmRadius.md),
        borderSide: const BorderSide(color: FarmColors.error, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(FarmRadius.md),
        borderSide: const BorderSide(color: FarmColors.error, width: 1.5),
      ),
    ),

    // 主按钮：方角实心绿（FarmRadius.sm），利落方正，无胶囊
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: FarmColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size(0, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(FarmRadius.md)),
        textStyle: const TextStyle(
            fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0),
      ),
    ),

    // 次按钮：方角主绿描边（FarmRadius.sm）
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: FarmColors.primary,
        minimumSize: const Size(0, 52),
        side: const BorderSide(color: FarmColors.outlineVariant, width: 1.5),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(FarmRadius.md)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: FarmColors.primary,
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    dividerTheme: const DividerThemeData(
      color: FarmColors.outlineVariant,
      thickness: 1,
      space: 1,
    ),

    // chip：未选中浅底深字，选中主绿底白字（高对比，去勾更利落）
    chipTheme: ChipThemeData(
      backgroundColor: FarmColors.surfaceContainer,
      selectedColor: FarmColors.primary,
      labelStyle: const TextStyle(
          fontSize: 13,
          color: FarmColors.onSurface,
          fontWeight: FontWeight.w500),
      secondaryLabelStyle: const TextStyle(
          fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600),
      checkmarkColor: Colors.white,
      showCheckmark: false,
      side: BorderSide.none,
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(FarmRadius.pill)),
    ),

    textTheme: const TextTheme(
      headlineLarge: TextStyle(
          color: FarmColors.onSurface,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          letterSpacing: 0),
      headlineMedium: TextStyle(
          color: FarmColors.onSurface,
          fontSize: 24,
          fontWeight: FontWeight.w600,
          letterSpacing: 0),
      headlineSmall: TextStyle(
          color: FarmColors.onSurface,
          fontSize: 20,
          fontWeight: FontWeight.w600),
      titleMedium: TextStyle(
          color: FarmColors.onSurface,
          fontSize: 16,
          fontWeight: FontWeight.w600),
      bodyLarge:
          TextStyle(color: FarmColors.onSurface, fontSize: 16, height: 1.45),
      bodyMedium:
          TextStyle(color: FarmColors.onSurface, fontSize: 14, height: 1.4),
      bodySmall: TextStyle(
          color: FarmColors.onSurfaceVariant, fontSize: 12, height: 1.35),
      labelLarge: TextStyle(
          color: FarmColors.onSurface,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2),
      labelSmall: TextStyle(
          color: FarmColors.onSurfaceVariant,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.4),
    ),
  );
}
