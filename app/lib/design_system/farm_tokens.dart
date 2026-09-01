import 'package:flutter/material.dart';

import '../core/constants.dart';

/// 田园通设计系统 · 语义 token（Agro-Modernist Tech）。
///
/// 116h-A 把散落在各页的「颜色 / 字号 / 间距 / 圆角 / 阴影 / 动效」收敛为单一语义层：
/// - 页面只引用语义 token，不再直接堆 `Color(0xFF...)` / 魔法数字。
/// - 原始色板仍以 [AppColors] 为事实源（constants.dart），本文件做语义映射，
///   避免跨页各写一套造成观感漂移。
/// - 适老模式不改色板（保持明亮浅色，不引入深色），只放大字号与触控密度，
///   见 [FarmTypography.elderTextScale] 与 [FarmSpacing.elderTouchTarget]。
abstract final class FarmColors {
  FarmColors._();

  // 品牌主色（叶绿）
  static const Color primary = AppColors.primary;
  static const Color onPrimary = Colors.white;
  static const Color primaryContainer = AppColors.primaryContainer;
  static const Color onPrimaryContainer = AppColors.onPrimaryContainer;

  // 次色 / 第三色
  static const Color secondary = AppColors.secondary;
  static const Color tertiary = AppColors.tertiary;

  // AI / 高亮（麦金）
  static const Color gold = AppColors.gold;
  static const Color goldContainer = AppColors.goldContainer;

  // 语义状态色
  static const Color error = AppColors.error;
  static const Color errorContainer = AppColors.errorContainer;
  static const Color warning = AppColors.warning;

  // 表面层
  static const Color background = AppColors.background;
  static const Color surface = AppColors.surface;
  static const Color surfaceContainer = AppColors.surfaceContainer;
  static const Color surfaceHigh = AppColors.surfaceHigh;

  // 文字 / 描边
  static const Color onSurface = AppColors.onSurface;
  static const Color onSurfaceVariant = AppColors.onSurfaceVariant;
  static const Color outline = AppColors.outline;
  static const Color outlineVariant = AppColors.outlineVariant;

  // 渐变
  static const LinearGradient heroGradient = AppColors.heroGradient;
  static const LinearGradient authButtonGradient = AppColors.authButtonGradient;
}

/// 间距 token（8pt 网格近似）。适老模式可用 [elderTouchTarget] 放大触控尺寸。
abstract final class FarmSpacing {
  FarmSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;

  /// 适老模式最小触控目标（Material 无障碍基线 48，适老放宽到 56）。
  static const double elderTouchTarget = 56;
}

/// 圆角 token。
abstract final class FarmRadius {
  FarmRadius._();

  static const double sm = 10;
  static const double md = 16;
  static const double lg = 26;
  static const double pill = 999;
}

/// 字号 token（逻辑像素，未叠加系统/适老缩放）。
abstract final class FarmTypography {
  FarmTypography._();

  static const double xs = 12;
  static const double sm = 13;
  static const double md = 14;
  static const double lg = 16;
  static const double xl = 18;
  static const double xxl = 20;
  static const double headline = 24;
  static const double display = 28;

  /// 常规模式的文本缩放夹取范围（无障碍，全平台统一）。
  static const double minTextScale = 0.9;
  static const double maxTextScale = 1.1;

  /// 适老模式的文本缩放夹取范围：下限抬高，保证最小可读。
  static const double elderMinTextScale = 1.3;
  static const double elderMaxTextScale = 1.35;
}

/// 阴影 token（环境光，柔和棕调，禁用浓黑）。
abstract final class FarmElevation {
  FarmElevation._();

  static List<BoxShadow> get ambient => AppColors.ambientShadow;
  static List<BoxShadow> get ambientUp => AppColors.ambientShadowUp;
}

/// 动效 token：统一时长，避免各页各写一套毫秒数。
abstract final class FarmMotion {
  FarmMotion._();

  static const Duration fast = Duration(milliseconds: 180);
  static const Duration medium = Duration(milliseconds: 320);
  static const Duration slow = Duration(milliseconds: 480);

  static const Curve enterCurve = Curves.easeOutCubic;
}
