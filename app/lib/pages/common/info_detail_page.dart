import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';

/// 纯展示详情页入口数据，通过 router `state.extra` 传入。
class InfoDetailData {
  final String title;
  final String? body;
  final List<InfoSection>? sections;
  final Uint8List? imageBytes;

  const InfoDetailData({
    required this.title,
    this.body,
    this.sections,
    this.imageBytes,
  });
}

/// 详情页内一个段落。
class InfoSection {
  final String? subtitle;
  final String? body;
  final List<String>? items;

  const InfoSection({this.subtitle, this.body, this.items});
}

/// 可复用的纯展示详情页 —— 替代原 _infoSheet / _sheet 底部弹层。
///
/// 样式遵循 Agro-Modernist Tech：利落方正（R.sm=8 圆角），
/// 无渐变、无大圆角胶囊、无半透明白浮层。
class InfoDetailPage extends StatelessWidget {
  final InfoDetailData data;

  const InfoDetailPage({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          data.title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
        ),
        backgroundColor: AppColors.surface,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          if (data.imageBytes != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(R.md),
              child: Image.memory(
                data.imageBytes!,
                height: 160,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (data.body != null)
            Text(
              data.body!,
              style: const TextStyle(
                fontSize: 14,
                height: 1.7,
                color: AppColors.onSurface,
              ),
            ),
          if (data.sections != null)
            for (final section in data.sections!) ...[
              if (section.subtitle != null) ...[
                const SizedBox(height: 16),
                Text(
                  section.subtitle!,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              if (section.body != null)
                Text(
                  section.body!,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: AppColors.onSurface,
                  ),
                ),
              if (section.items != null)
                for (final item in section.items!)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      '· $item',
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: AppColors.onSurface,
                      ),
                    ),
                  ),
            ],
        ],
      ),
    );
  }
}
