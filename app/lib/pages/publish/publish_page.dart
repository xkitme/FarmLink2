import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

/// 发布 · 乡村动态 — 1:1 复刻设计稿 _1
class PublishPage extends StatelessWidget {
  const PublishPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      floatingActionButton: FloatingActionButton(
        onPressed: () => toast(context, '发布动态将于后续分段实现'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md)),
        child: const Icon(Icons.edit),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _noticeCard(),
          const SizedBox(height: 24),
          const Text('乡村动态',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 16),
          _imagePost(context),
          const SizedBox(height: 16),
          _textPost(context),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  // 村委通知卡
  Widget _noticeCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.goldContainer,
        borderRadius: BorderRadius.circular(R.md),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Stack(
        children: [
          Positioned(
            right: -16,
            top: -16,
            child: Icon(Icons.campaign,
                size: 100, color: Colors.white.withValues(alpha: 0.10)),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.campaign, color: Color(0xFFFFEFDA), size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('村委紧急通知：明日停水',
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFFFEFDA))),
                    const SizedBox(height: 4),
                    Text('因南渠主干管维修，明日上午 8:00 至下午 6:00 全村暂停供水，请各位村民提前做好储水准备。',
                        style: TextStyle(
                            fontSize: 12,
                            height: 1.5,
                            color: const Color(0xFFFFEFDA)
                                .withValues(alpha: 0.9))),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('发布于 10 分钟前',
                            style: TextStyle(
                                fontSize: 10,
                                color: const Color(0xFFFFEFDA)
                                    .withValues(alpha: 0.75))),
                        Text('李村长',
                            style: TextStyle(
                                fontSize: 10,
                                color: const Color(0xFFFFEFDA)
                                    .withValues(alpha: 0.75))),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 图文动态
  Widget _imagePost(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.surfaceHigh),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _postHeader('王', '王大姐农场', '2小时前 · 幸福村', AppColors.secondary,
              avatarImage: 'assets/images/_1_1.jpg'),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text('今年的阳光玫瑰长势特别好！多亏了上周 AI 推荐的施肥方案。周末可以开放采摘了，欢迎乡亲们来玩！🍇✨',
                style: TextStyle(
                    fontSize: 16, height: 1.5, color: AppColors.onSurface)),
          ),
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Image.asset('assets/images/_1_2.jpg',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                      color: AppColors.surfaceContainer,
                      child: const Icon(Icons.local_florist,
                          size: 64, color: AppColors.primaryDim),
                    )),
          ),
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _action(Icons.favorite_border, '128'),
                const SizedBox(width: 20),
                _action(Icons.chat_bubble_outline, '34'),
                const SizedBox(width: 20),
                _action(Icons.share_outlined, null),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 文字 + 标签动态
  Widget _textPost(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.surfaceHigh),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _postHeader('赵', '老赵农机租赁', '昨天 15:30', AppColors.primary),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
                '新进两台大马力旋耕机，带 GPS 自动驾驶功能，效率提高 30%。现在预订秋耕享受 8 折优惠！有需要的乡亲直接电话联系。',
                style: TextStyle(
                    fontSize: 16, height: 1.5, color: AppColors.onSurface)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _tag('农机租赁'),
                const SizedBox(width: 8),
                _tag('秋耕特惠'),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _action(Icons.favorite_border, '45'),
                const SizedBox(width: 20),
                _action(Icons.chat_bubble_outline, '12'),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () => toast(context, '拨号功能将于后续分段实现'),
                  icon: const Icon(Icons.call, size: 16),
                  label: const Text('联系他'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(0, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    textStyle: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _postHeader(String avatar, String name, String meta, Color avatarColor,
      {String? avatarImage}) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          ClipOval(
            child: avatarImage != null
                ? Image.asset(avatarImage,
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        _initialAvatar(avatar, avatarColor))
                : _initialAvatar(avatar, avatarColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface)),
                Text(meta,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.onSurfaceVariant)),
              ],
            ),
          ),
          const Icon(Icons.more_horiz, color: AppColors.primary),
        ],
      ),
    );
  }

  Widget _initialAvatar(String text, Color color) => Container(
        width: 40,
        height: 40,
        color: color,
        alignment: Alignment.center,
        child: Text(text,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600)),
      );

  Widget _action(IconData icon, String? count) => Row(
        children: [
          Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
          if (count != null) ...[
            const SizedBox(width: 4),
            Text(count,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.onSurfaceVariant)),
          ],
        ],
      );

  Widget _tag(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.surfaceHigh,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Text(text,
            style: const TextStyle(
                fontSize: 12, color: AppColors.onSurfaceVariant)),
      );
}
