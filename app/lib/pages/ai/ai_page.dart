import 'package:flutter/material.dart';
import '../../widgets/common.dart';

class AiPage extends StatelessWidget {
  const AiPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('AI 助手'), automaticallyImplyLeading: false),
        body: const PlaceholderPanel(title: 'AI 智能助手', icon: Icons.smart_toy),
      );
}
