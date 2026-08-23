import 'package:flutter/material.dart';

import '../core/site_images.dart';
import 'farm_tokens.dart';

/// 田园通品牌标识：官方品牌图（farmlink-mark.png）+「田园通」文字。
///
/// 硬约束：不得用通用叶子 / 农机图标替代正式品牌 Logo；本组件固定使用
/// [BrandLogo]（assets/images/farmlink-mark.png）作为品牌图形。
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
        BrandLogo(width: markSize, height: markSize, borderRadius: 8),
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
