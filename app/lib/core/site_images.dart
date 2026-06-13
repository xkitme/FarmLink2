import 'package:flutter/material.dart';

import 'api_client.dart';

/// 站点配图解析。
///
/// 把 bundled 资产名（`assets/images/<file>` 或 `assets/images/generated/<file>`）
/// 映射到后端 `/uploads/site/<file>`。后端替换 `uploads/site/` 下同名文件即可
/// **实时更新**前端配图，无需重新发布 App；网络不可用时回落到 bundled 资产。
class SiteImages {
  static const String _root = 'assets/images/';
  static const String _remotePrefix = '/uploads/site/';

  /// bundled 资产路径 → 后端站点图 URL；非 `assets/images/` 资产返回 null。
  static String? remoteUrl(String asset) {
    final a = asset.trim();
    if (!a.startsWith(_root)) return null;
    final file = a.split('/').last;
    if (file.isEmpty || !file.contains('.')) return null;
    return ApiClient.resolveImageUrl('$_remotePrefix$file');
  }
}

/// 站点配图组件：优先后端 `/uploads/site/` 实时图，加载中/失败回落 bundled 资产。
///
/// 用法等价于 `Image.asset(asset, ...)`，但图片来源以后端为准、可实时替换。
class SiteImage extends StatelessWidget {
  const SiteImage(
    this.asset, {
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.filterQuality = FilterQuality.low,
    this.errorFallback,
  });

  final String asset;
  final double? width;
  final double? height;
  final BoxFit fit;
  final FilterQuality filterQuality;

  /// 远端与 bundled 资产都加载失败时的占位（如各页的图标兜底框）。
  final Widget? errorFallback;

  Widget _bundled() => Image.asset(
        asset,
        width: width,
        height: height,
        fit: fit,
        filterQuality: filterQuality,
        errorBuilder:
            errorFallback == null ? null : (_, __, ___) => errorFallback!,
      );

  @override
  Widget build(BuildContext context) {
    final remote = SiteImages.remoteUrl(asset);
    if (remote == null) return _bundled();
    return Image.network(
      remote,
      width: width,
      height: height,
      fit: fit,
      filterQuality: filterQuality,
      errorBuilder: (_, __, ___) => _bundled(),
      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
        if (wasSynchronouslyLoaded || frame != null) return child;
        return _bundled(); // 远端加载中先显示 bundled，避免白屏闪烁
      },
    );
  }
}

class BrandLogo extends StatelessWidget {
  const BrandLogo({
    super.key,
    this.width = 40,
    this.height = 40,
    this.borderRadius = 8,
  });

  final double width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SiteImage(
        'assets/images/farmlink-mark.png',
        width: width,
        height: height,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.medium,
      ),
    );
  }
}
