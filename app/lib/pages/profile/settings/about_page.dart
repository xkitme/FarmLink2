import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../common/info_detail_page.dart';
import '../../../core/constants.dart';
import '../../../core/site_images.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

/// 关于田园通 —— 品牌名片（深绿面板 + 田垄等高线纹理 + 编辑式信息层次）
class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '关于田园通'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          _brandPanel(context),
          const SizedBox(height: 18),
          _missionBlock(),
          const SizedBox(height: 14),
          _scaleStrip(),
          const SizedBox(height: 22),
          _sectionLabel('条款与支持'),
          const SizedBox(height: 10),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SettingTile(
                  icon: Icons.description_outlined,
                  label: '服务协议',
                  onTap: () => _openTextDetail(context, '服务协议'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.privacy_tip_outlined,
                  label: '隐私政策',
                  onTap: () => _openTextDetail(context, '隐私政策'),
                ),
                const Divider(height: 1, indent: 56),
                SettingTile(
                  icon: Icons.public,
                  label: '官方网站',
                  trailingText: 'farmlink.example.com',
                  iconColor: AppColors.secondary,
                  onTap: () =>
                      toast(context, '请访问 https://farmlink.example.com'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 26),
          _footer(),
        ],
      ),
    );
  }

  // ── 品牌面板 ───────────────────────────────────────────
  Widget _brandPanel(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(R.md),
      child: Container(
        decoration: BoxDecoration(
          gradient: AppColors.heroGradient,
          boxShadow: AppColors.ambientShadow,
        ),
        child: Stack(
          children: [
            // 田垄等高线纹理（农业质感，替代平庸渐变块）
            Positioned.fill(
              child: CustomPaint(painter: _FurrowPainter()),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // 真实品牌标识（后端可换）
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(R.sm),
                          boxShadow: AppColors.ambientShadow,
                        ),
                        padding: const EdgeInsets.all(9),
                        child: const SiteImage(
                          'assets/images/farmlink-mark.png',
                          fit: BoxFit.contain,
                          filterQuality: FilterQuality.medium,
                        ),
                      ),
                      const Spacer(),
                      _versionPill(),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    '田园通',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                      height: 1.05,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'FARMLINK · 数字乡村助农平台',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.78),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.6,
                    ),
                  ),
                  const SizedBox(height: 18),
                  // 招牌能力标签
                  const Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _CapsuleTag('AI 识图'),
                      _CapsuleTag('产销直通'),
                      _CapsuleTag('智慧农机'),
                      _CapsuleTag('气象预警'),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(height: 1, color: Colors.white.withValues(alpha: 0.16)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _liveDot(),
                      const SizedBox(width: 8),
                      Text(
                        '云端服务运行中',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.82),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      _checkUpdateButton(context),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _versionPill() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
        ),
        child: const Text(
          'v1.0.0 稳定版',
          style: TextStyle(
            color: Colors.white,
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
      );

  Widget _liveDot() => Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: AppColors.primaryDim,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
                color: AppColors.primaryDim.withValues(alpha: 0.6),
                blurRadius: 6,
                spreadRadius: 1),
          ],
        ),
      );

  Widget _checkUpdateButton(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(R.sm),
        child: InkWell(
          borderRadius: BorderRadius.circular(R.sm),
          onTap: () => toast(context, '已是最新版本'),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.refresh_rounded, size: 16, color: AppColors.primary),
                SizedBox(width: 6),
                Text(
                  '检查更新',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      );

  // ── 品牌主张 ───────────────────────────────────────────
  Widget _missionBlock() => Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.md),
          boxShadow: AppColors.ambientShadow,
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                width: 3,
                decoration: BoxDecoration(
                  color: AppColors.secondary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '品牌主张',
                      style: TextStyle(
                        color: AppColors.secondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '以 AI 土壤分析、智能排灌与实时气候监测，为现代农业提供一体化数字解决方案，助力每一位耕耘者科技助农、丰收万家。',
                      style: TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 14.5,
                        height: 1.7,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  // ── 平台规模 ───────────────────────────────────────────
  Widget _scaleStrip() => Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.md),
          boxShadow: AppColors.ambientShadow,
        ),
        child: const IntrinsicHeight(
          child: Row(
            children: [
              Expanded(child: _ScaleStat(value: '8', label: '大业务板块')),
              _StatDivider(),
              Expanded(child: _ScaleStat(value: '76', label: '功能模块')),
              _StatDivider(),
              Expanded(child: _ScaleStat(value: '24', label: 'AI 融合模块')),
            ],
          ),
        ),
      );

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(left: 4),
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.onSurfaceVariant,
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.5,
          ),
        ),
      );

  Widget _footer() => const Center(
        child: Column(
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Opacity(
                  opacity: 0.5,
                  child: SiteImage(
                    'assets/images/farmlink-mark.png',
                    width: 18,
                    height: 18,
                    fit: BoxFit.contain,
                  ),
                ),
                SizedBox(width: 8),
                Text(
                  '田园通 · FarmLink',
                  style: TextStyle(
                    color: AppColors.outline,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            Text(
              '© 2026 WebClass 2 team 版权所有',
              style: TextStyle(fontSize: 11.5, color: AppColors.onSurfaceVariant),
            ),
            SizedBox(height: 3),
            Text(
              'All Rights Reserved · 粤 ICP 备 88888888 号',
              style: TextStyle(fontSize: 11.5, color: AppColors.outline),
            ),
          ],
        ),
      );

  void _openTextDetail(BuildContext context, String title) {
    context.push('/detail/info',
        extra: InfoDetailData(
          title: title,
          sections: [
            for (final text in _sheetParagraphs) InfoSection(body: text),
          ],
        ));
  }

  static const _sheetParagraphs = [
    '田园通为农业生产、流通销售、农机共享、政策服务与乡村生活提供一体化数字服务。',
    '平台会根据您提交的业务信息提供对应服务，并以必要、最小化原则处理相关数据。',
    '您可以在账号设置中管理通知、隐私偏好与反馈信息。',
    '平台将持续完善安全、稳定与可用性能力，保障生产经营过程中的关键数据。',
    '如需帮助，请通过帮助与反馈页面联系平台支持团队。',
  ];
}

// ── 招牌能力标签（深绿面板上的描边胶囊）──────────────────
class _CapsuleTag extends StatelessWidget {
  final String text;
  const _CapsuleTag(this.text);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: Colors.white.withValues(alpha: 0.20)),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
}

// ── 平台规模数字 ───────────────────────────────────────
class _ScaleStat extends StatelessWidget {
  final String value, label;
  const _ScaleStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              height: 1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
        ],
      );
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();
  @override
  Widget build(BuildContext context) => Container(
        width: 1,
        margin: const EdgeInsets.symmetric(vertical: 4),
        color: AppColors.outlineVariant,
      );
}

// ── 田垄等高线纹理 ──────────────────────────────────────
class _FurrowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round;

    // 自上而下渐密的弧线，模拟受光的田垄/等高线
    const lines = 9;
    for (var i = 0; i < lines; i++) {
      final t = i / (lines - 1);
      final baseY = size.height * (0.30 + t * 0.78);
      paint.color = Colors.white.withValues(alpha: 0.05 + t * 0.05);
      final path = Path();
      final amp = 10 + t * 14;
      for (var x = 0.0; x <= size.width; x += 6) {
        final y = baseY + math.sin((x / size.width) * math.pi * 2 + t * 1.4) * amp;
        if (x == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(path, paint);
    }

    // 右上角一枚柔光圆，提亮品牌标识区
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.white.withValues(alpha: 0.12),
          Colors.white.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromCircle(
          center: Offset(size.width * 0.86, size.height * 0.12), radius: 90));
    canvas.drawRect(Offset.zero & size, glow);
  }

  @override
  bool shouldRepaint(covariant _FurrowPainter oldDelegate) => false;
}
