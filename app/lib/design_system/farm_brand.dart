import 'package:flutter/material.dart';

import 'farm_tokens.dart';

/// 田园通品牌标识：官方品牌图（farmlink-mark.png）+「田园通」文字。
///
/// 硬约束：不得用通用叶子 / 农机图标替代正式品牌 Logo；本组件固定使用
/// `assets/images/farmlink-mark.png`（pubspec 已声明）作为品牌图形。
///
/// 品牌图是随 App 打包的稳定资产，直接用 `Image.asset`（非网络图），
/// 并带 errorBuilder 兜底，保证测试与离线预览不因图片缺失而溢出。
class FarmBrand extends StatelessWidget {
  /// 图形高度（宽高等比）。默认 32，适老模式可调大。
  final double markSize;

  /// 是否显示「田园通」文字。
  final bool showLabel;

  /// 文字颜色，默认主题正文色。
  final Color? labelColor;

  const FarmBrand({
    super.key,
    this.markSize = 32,
    this.showLabel = true,
    this.labelColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.asset(
            'assets/images/farmlink-mark.png',
            width: markSize,
            height: markSize,
            fit: BoxFit.cover,
            alignment: Alignment.centerLeft,
            filterQuality: FilterQuality.medium,
            errorBuilder: (_, __, ___) =>
                FarmBrandMarkFallback(markSize: markSize),
          ),
        ),
        if (showLabel) ...[
          const SizedBox(width: FarmSpacing.sm),
          Text(
            '田园通',
            style: TextStyle(
              color: labelColor ?? FarmColors.onSurface,
              fontSize: FarmTypography.xl,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ],
    );
  }
}

/// 品牌图加载失败的兜底块（主绿圆角方块），独立成组件便于测试与复用。
class FarmBrandMarkFallback extends StatelessWidget {
  /// 方块边长，与 [FarmBrand.markSize] 一致。
  final double markSize;

  const FarmBrandMarkFallback({super.key, required this.markSize});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: markSize,
      height: markSize,
      decoration: BoxDecoration(
        color: FarmColors.primary,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}
