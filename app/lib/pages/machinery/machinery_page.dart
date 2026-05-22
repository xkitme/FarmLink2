import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class MachineryPage extends StatelessWidget {
  const MachineryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/_5_1.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                const ColoredBox(color: Color(0xFF315A35)),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x552E7D32), Color(0xAA1A1C1C)],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
              child: Column(
                children: [
                  _searchBar(),
                  const SizedBox(height: 14),
                  _filterRow(),
                  Expanded(
                    child: Stack(
                      children: [
                        Positioned(
                          left: 90,
                          top: 170,
                          child: _mapMarker(
                            active: true,
                            label: '￥150/h',
                          ),
                        ),
                        Positioned(
                          right: 95,
                          top: 270,
                          child: _mapMarker(
                            active: false,
                            label: null,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _machineCard(context),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _searchBar() {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Row(
        children: [
          const Icon(Icons.search, color: AppColors.outline, size: 28),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              '搜索农机类型 (如: 收割机, 拖拉机)',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                color: AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            width: 46,
            height: 46,
            decoration: const BoxDecoration(
              color: AppColors.surfaceContainer,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.tune, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _filterRow() {
    const filters = ['附近可用', '大型拖拉机', '联合收割机', '无人机'];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, index) {
          final active = index == 0;
          return Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: active ? AppColors.primary : AppColors.surface,
              borderRadius: BorderRadius.circular(R.sm),
              border: active
                  ? null
                  : Border.all(color: AppColors.outlineVariant, width: 1.5),
              boxShadow: active ? null : AppColors.ambientShadow,
            ),
            child: Text(
              filters[index],
              style: TextStyle(
                color: active ? Colors.white : AppColors.onSurface,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _mapMarker({required bool active, String? label}) {
    return Column(
      children: [
        Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary
                : AppColors.secondary.withValues(alpha: 0.65),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: AppColors.ambientShadow,
          ),
          child: const Icon(Icons.agriculture, color: Colors.white, size: 26),
        ),
        if (label != null) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(R.sm),
              boxShadow: AppColors.ambientShadow,
            ),
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _machineCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.outlineVariant),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(R.md),
                child: Image.asset(
                  'assets/images/_5_2.jpg',
                  width: 112,
                  height: 112,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 112,
                    height: 112,
                    color: AppColors.surfaceContainer,
                    child: const Icon(Icons.agriculture,
                        color: AppColors.primary, size: 44),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            '雷沃欧豹 M1004',
                            style: TextStyle(
                              fontSize: 23,
                              height: 1.15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ),
                        Icon(Icons.verified,
                            color: AppColors.primary, size: 28),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '100马力 轮式拖拉机',
                      style: TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(Icons.star, color: AppColors.gold, size: 18),
                        SizedBox(width: 4),
                        Text(
                          '4.9 (128次作业)',
                          style: TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    RichText(
                      text: const TextSpan(
                        children: [
                          TextSpan(
                            text: '￥150',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 30,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          TextSpan(
                            text: ' /小时',
                            style: TextStyle(
                              color: AppColors.onSurface,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 14),
          Row(
            children: [
              const CircleAvatar(
                radius: 22,
                backgroundColor: Color(0xFFFDCDBC),
                child: Text(
                  '李',
                  style: TextStyle(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '李师傅',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(Icons.place_outlined,
                            size: 16, color: AppColors.onSurfaceVariant),
                        SizedBox(width: 2),
                        Text(
                          '距您 2.5 km',
                          style: TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                width: 54,
                height: 54,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceContainer,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: const Icon(Icons.call, color: AppColors.primary),
                  onPressed: () => toast(context, '电话联系将在后续分段接入'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLow,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.surfaceHigh),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: const Row(
                    children: [
                      Icon(Icons.calendar_month,
                          color: AppColors.onSurfaceVariant),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '今天 14:00 - 18:00',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.onSurface,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              ElevatedButton(
                onPressed: () => toast(context, '预约农机将在后续分段接入'),
                child: const Text('立即预约'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
