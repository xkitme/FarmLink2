import 'package:flutter/material.dart';
import '../../widgets/common.dart';

class AgriPage extends StatelessWidget {
  const AgriPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('农事'), automaticallyImplyLeading: false),
        body: const PlaceholderPanel(title: 'AI 农业生产', icon: Icons.eco),
      );
}
