import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/feature_catalog.dart';

class AllFeaturesPage extends StatefulWidget {
  const AllFeaturesPage({super.key});

  @override
  State<AllFeaturesPage> createState() => _AllFeaturesPageState();
}

class _AllFeaturesPageState extends State<AllFeaturesPage> {
  String _section = 'ALL';
  FeatureTier? _tier;

  List<FeatureItem> get _visible {
    final items = kFeatureCatalog.where((f) {
      final sectionMatched = _section == 'ALL' || f.section == _section;
      final tierMatched = _tier == null || f.tier == _tier;
      return sectionMatched && tierMatched;
    }).toList();
    items.sort((a, b) {
      final byTier = _tierRank(a.tier).compareTo(_tierRank(b.tier));
      if (byTier != 0) return byTier;
      return kFeatureCatalog.indexOf(a).compareTo(kFeatureCatalog.indexOf(b));
    });
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final sectionColor = <String, Color>{
      'agri': AppColors.primary,
      'market': AppColors.goldContainer,
      'machinery': AppColors.secondary,
      'disaster': AppColors.error,
      'policy': AppColors.primaryContainer,
      'life': AppColors.tertiary,
      'data': AppColors.onSurfaceVariant,
      'ai': AppColors.primary,
    };

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          tooltip: '返回',
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurface),
          onPressed: () {
            final router = GoRouter.of(context);
            if (router.canPop()) {
              router.pop();
            } else {
              router.go('/home');
            }
          },
        ),
        title: const Text(
          '全部服务',
          style: TextStyle(
            color: AppColors.onSurface,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                _tierChip(null, '全部'),
                _tierChip(FeatureTier.primary, '六条主路径'),
                _tierChip(FeatureTier.tool, '工具箱'),
                _tierChip(FeatureTier.experimental, '实验能力'),
                const SizedBox(width: 10),
                _sectionChip('ALL', '全板块'),
                for (final entry in kFeatureSections.entries)
                  _sectionChip(entry.key, entry.value),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.82,
              ),
              itemCount: _visible.length,
              itemBuilder: (_, index) {
                final feature = _visible[index];
                final color =
                    sectionColor[feature.section] ?? AppColors.primary;
                return InkWell(
                  borderRadius: BorderRadius.circular(R.md),
                  onTap: () => context.go(feature.route),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(R.md),
                        ),
                        child: Icon(feature.icon, color: color, size: 24),
                      ),
                      const SizedBox(height: 6),
                      if (feature.tier == FeatureTier.primary) ...[
                        const Text(
                          '主路径',
                          maxLines: 1,
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 10,
                            height: 1,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                      ],
                      Text(
                        feature.name,
                        maxLines: 2,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.onSurface,
                          fontSize: 11,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  int _tierRank(FeatureTier tier) {
    switch (tier) {
      case FeatureTier.primary:
        return 0;
      case FeatureTier.tool:
        return 1;
      case FeatureTier.experimental:
        return 2;
    }
  }

  Widget _tierChip(FeatureTier? tier, String label) {
    final selected = _tier == tier;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        selectedColor: AppColors.primaryContainer.withValues(alpha: 0.16),
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(R.sm),
        ),
        side: BorderSide(
          color: selected ? AppColors.primary : AppColors.outlineVariant,
        ),
        labelStyle: TextStyle(
          color: selected ? AppColors.primary : AppColors.onSurfaceVariant,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
        ),
        onSelected: (_) => setState(() => _tier = tier),
      ),
    );
  }

  Widget _sectionChip(String key, String label) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: _section == key,
          selectedColor: AppColors.primaryContainer.withValues(alpha: 0.16),
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.sm),
          ),
          side: BorderSide(
            color:
                _section == key ? AppColors.primary : AppColors.outlineVariant,
          ),
          labelStyle: TextStyle(
            color: _section == key
                ? AppColors.primary
                : AppColors.onSurfaceVariant,
            fontWeight: _section == key ? FontWeight.w700 : FontWeight.w600,
          ),
          onSelected: (_) => setState(() => _section = key),
        ),
      );
}
