import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class PolicyPage extends StatefulWidget {
  const PolicyPage({super.key});

  @override
  State<PolicyPage> createState() => _PolicyPageState();
}

class _PolicyItem {
  final String tab;
  final String image;
  final String title;
  final String summary;
  final String time;
  final String tag;
  final Color tagColor;

  const _PolicyItem({
    required this.tab,
    required this.image,
    required this.title,
    required this.summary,
    required this.time,
    required this.tag,
    required this.tagColor,
  });
}

class _PolicyPageState extends State<PolicyPage> {
  static const _tabs = ['惠农政策', '党建学习', '文明乡风'];
  var _active = 0;

  static const _items = [
    _PolicyItem(
      tab: '惠农政策',
      image: 'assets/images/_3_1.jpg',
      title: '2024年中央一号文件发布：推进乡村全面振兴',
      summary: '关注国家最新涉农政策导向',
      time: '今天 10:00',
      tag: '政策解读',
      tagColor: Color(0xFFFDCDBC),
    ),
    _PolicyItem(
      tab: '惠农政策',
      image: 'assets/images/_3_2.jpg',
      title: '农业农村部部署春耕备耕工作，确保粮食丰收',
      summary: '保障农资供应，加强技术指导',
      time: '昨天 14:30',
      tag: '春耕春管',
      tagColor: AppColors.goldContainer,
    ),
    _PolicyItem(
      tab: '惠农政策',
      image: 'assets/images/_3_3.jpg',
      title: '关于发放2024年实际种粮农民一次性补贴的通知',
      summary: '资金直达基层，惠及广大农户',
      time: '3天前',
      tag: '补贴资金',
      tagColor: AppColors.primaryContainer,
    ),
    _PolicyItem(
      tab: '党建学习',
      image: 'assets/images/_3_1.jpg',
      title: '基层党组织带头推进高标准农田建设',
      summary: '学习乡村振兴一线实践案例',
      time: '今天',
      tag: '学习打卡',
      tagColor: AppColors.primaryContainer,
    ),
    _PolicyItem(
      tab: '文明乡风',
      image: 'assets/images/_1_2.jpg',
      title: '文明积分兑换启动，志愿服务可累计积分',
      summary: '共建共享，推动移风易俗',
      time: '本周',
      tag: '积分激励',
      tagColor: AppColors.goldContainer,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final activeTab = _tabs[_active];
    final list = _items.where((item) => item.tab == activeTab).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: Column(
        children: [
          _tabsBar(),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) =>
                  _policyCard(context, list[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabsBar() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Row(
        children: [
          for (var i = 0; i < _tabs.length; i++)
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _active = i),
                borderRadius: BorderRadius.circular(R.sm),
                child: Column(
                  children: [
                    Text(
                      _tabs[i],
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: _active == i
                            ? AppColors.primary
                            : AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 14),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      height: 3,
                      decoration: BoxDecoration(
                        color: _active == i
                            ? AppColors.primary
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _policyCard(BuildContext context, _PolicyItem item) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => toast(context, '${item.tag}详情将于后续分段接入'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(R.md),
            child: Image.asset(
              item.image,
              width: 104,
              height: 104,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 104,
                height: 104,
                color: AppColors.surfaceContainer,
                child: const Icon(Icons.account_balance,
                    color: AppColors.primary, size: 34),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 19,
                    height: 1.25,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item.summary,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.time,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.outline,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    _tag(item.tag, item.tagColor),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tag(String text, Color color) {
    final darkText =
        color == const Color(0xFFFDCDBC) ? AppColors.secondary : Colors.white;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: darkText,
        ),
      ),
    );
  }
}
