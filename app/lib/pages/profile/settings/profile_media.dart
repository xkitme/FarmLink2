import 'package:flutter/material.dart';

import '../../../core/api_client.dart';
import '../../../core/constants.dart';
import '../../../core/site_images.dart';

bool _hasUrl(String? url) => url != null && url.trim().isNotEmpty;

/// 个人资料封面 banner：有 `url` 走后端图（失败回落 bundled 资产），否则用资产。
class ProfileBanner extends StatelessWidget {
  final String? url;
  final String fallbackAsset;
  const ProfileBanner(
      {super.key, required this.url, required this.fallbackAsset});

  @override
  Widget build(BuildContext context) {
    if (_hasUrl(url)) {
      return Image.network(
        ApiClient.resolveImageUrl(url!),
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            SiteImage(fallbackAsset, fit: BoxFit.cover),
      );
    }
    return SiteImage(fallbackAsset, fit: BoxFit.cover);
  }
}

/// 个人资料圆形头像：背景色描边「抠出」+ 内容（后端头像 / 昵称首字 / 人像图标）。
class ProfileAvatar extends StatelessWidget {
  final String? url;
  final String? initial;
  final double size;
  const ProfileAvatar({
    super.key,
    required this.url,
    required this.initial,
    this.size = 84,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: const EdgeInsets.all(4),
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.background,
      ),
      child: ClipOval(child: _inner()),
    );
  }

  Widget _inner() {
    if (_hasUrl(url)) {
      return Image.network(
        ApiClient.resolveImageUrl(url!),
        fit: BoxFit.cover,
        width: size,
        height: size,
        errorBuilder: (_, __, ___) => _placeholder(),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() => Container(
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: [Color(0xFF2E7D32), Color(0xFF0D631B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: initial != null
            ? Text(
                initial!,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: size * 0.38,
                  fontWeight: FontWeight.w800,
                ),
              )
            : Icon(Icons.person, size: size * 0.48, color: Colors.white),
      );
}
