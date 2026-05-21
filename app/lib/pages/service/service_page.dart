import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class ServicePage extends StatelessWidget {
  const ServicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('服务大厅'), automaticallyImplyLeading: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SectionTitle('八大板块'),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              for (final s in kSections)
                AppCard(
                  padding: const EdgeInsets.all(14),
                  onTap: () => toast(context, '${s['label']} 功能页将于后续分段实现'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: (s['color'] as Color).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(s['icon'] as IconData,
                            color: s['color'] as Color, size: 22),
                      ),
                      Text(s['label'] as String,
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
