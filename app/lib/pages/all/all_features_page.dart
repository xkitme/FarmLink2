import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/feature_catalog.dart';
import '../../widgets/common.dart';

class AllFeaturesPage extends StatefulWidget {
  const AllFeaturesPage({super.key});

  @override
  State<AllFeaturesPage> createState() => _AllFeaturesPageState();
}

class _AllFeaturesPageState extends State<AllFeaturesPage> {
  String _section = 'ALL';

  List<FeatureItem> get _visible => _section == 'ALL'
      ? kFeatureCatalog
      : kFeatureCatalog.where((f) => f.section == _section).toList();

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
        title: Row(
          children: [
            const Text(
              '全部服务',
              style: TextStyle(
                color: AppColors.onSurface,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: 8),
            StatusChip('${kFeatureCatalog.length} 项', color: AppColors.primary),
          ],
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
                _chip('ALL', '全部'),
                for (final entry in kFeatureSections.entries)
                  _chip(entry.key, entry.value),
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

  Widget _chip(String key, String label) => Padding(
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
