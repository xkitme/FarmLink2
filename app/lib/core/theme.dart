import 'package:flutter/material.dart';
import 'constants.dart';

ThemeData buildInkTheme() {
  const colorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary:          InkColors.gold,
    onPrimary:        Color(0xFF0A0B0E),
    secondary:        InkColors.jade,
    onSecondary:      Colors.white,
    error:            InkColors.cinnabar,
    onError:          Colors.white,
    surface:          InkColors.surface,
    onSurface:        InkColors.textPrimary,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: InkColors.background,
    fontFamily: 'serif',

    // AppBar
    appBarTheme: const AppBarTheme(
      backgroundColor: InkColors.background,
      foregroundColor: InkColors.textPrimary,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: InkColors.textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        letterSpacing: 2,
      ),
    ),

    // Card
    cardTheme: CardTheme(
      color: InkColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: InkColors.border, width: 1),
      ),
    ),

    // Input
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: InkColors.surfaceHigh,
      hintStyle: const TextStyle(color: InkColors.textDisabled),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: InkColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: InkColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: InkColors.gold, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),

    // ElevatedButton
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: InkColors.gold,
        foregroundColor: const Color(0xFF0A0B0E),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: 2,
        ),
      ),
    ),

    // TextButton
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: InkColors.gold),
    ),

    // Divider
    dividerTheme: const DividerThemeData(
      color: InkColors.border,
      thickness: 1,
    ),

    // BottomNavigationBar
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: InkColors.surface,
      selectedItemColor: InkColors.gold,
      unselectedItemColor: InkColors.textDisabled,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: TextStyle(fontSize: 11, letterSpacing: 1),
      unselectedLabelStyle: TextStyle(fontSize: 11),
    ),

    // Text
    textTheme: const TextTheme(
      headlineLarge:  TextStyle(color: InkColors.textPrimary, fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: 2),
      headlineMedium: TextStyle(color: InkColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w600, letterSpacing: 1.5),
      headlineSmall:  TextStyle(color: InkColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: 1),
      bodyLarge:      TextStyle(color: InkColors.textPrimary, fontSize: 16, height: 1.8),
      bodyMedium:     TextStyle(color: InkColors.textPrimary, fontSize: 14, height: 1.7),
      bodySmall:      TextStyle(color: InkColors.textSecondary, fontSize: 12),
      labelLarge:     TextStyle(color: InkColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
    ),
  );
}
