import 'package:flutter/material.dart';
import 'constants.dart';

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

    // 输入框：浅白填充 + 底部棕色边
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceLow,
      hintStyle: TextStyle(color: AppColors.outline),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      enabledBorder: UnderlineInputBorder(
        borderSide: BorderSide(color: AppColors.secondary, width: 2),
      ),
      focusedBorder: UnderlineInputBorder(
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      border: UnderlineInputBorder(
        borderSide: BorderSide(color: AppColors.secondary, width: 2),
      ),
    ),

    // 主按钮：胶囊形实心绿
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size(0, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(
            fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5),
      ),
    ),

    // 次按钮：胶囊棕色描边
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.secondary,
        minimumSize: const Size(0, 52),
        side: const BorderSide(color: AppColors.secondary, width: 2),
        shape: const StadiumBorder(),
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

    chipTheme: ChipThemeData(
      backgroundColor: AppColors.surfaceContainer,
      labelStyle:
          const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
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
