import 'package:flutter/material.dart';
import 'constants.dart';

ThemeData buildAppTheme() {
  const cs = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    secondary: AppColors.harvest,
    onSecondary: Colors.white,
    error: AppColors.danger,
    onError: Colors.white,
    surface: AppColors.surface,
    onSurface: AppColors.textPrimary,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: cs,
    scaffoldBackgroundColor: AppColors.background,
    fontFamily: 'sans-serif',

    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: 1,
      ),
    ),

    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      hintStyle: const TextStyle(color: AppColors.textHint),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.6),
      ),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: 2),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.primary),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.surface,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textHint,
      type: BottomNavigationBarType.fixed,
      showUnselectedLabels: true,
      elevation: 0,
      selectedLabelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      unselectedLabelStyle: TextStyle(fontSize: 12),
    ),

    dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1, space: 1),

    textTheme: const TextTheme(
      headlineMedium: TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.bold),
      headlineSmall:  TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w600),
      titleMedium:    TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
      bodyLarge:      TextStyle(color: AppColors.textPrimary, fontSize: 16, height: 1.6),
      bodyMedium:     TextStyle(color: AppColors.textPrimary, fontSize: 14, height: 1.6),
      bodySmall:      TextStyle(color: AppColors.textSecondary, fontSize: 12),
    ),
  );
}
