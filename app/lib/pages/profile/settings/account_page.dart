import 'package:flutter/material.dart';

import 'settings_widgets.dart';

class AccountPage extends StatelessWidget {
  const AccountPage({super.key});

  @override
  Widget build(BuildContext context) => const ComingSoonPage(
        title: '个人资料',
        message: '个人资料完整编辑\n功能完善中',
        detail: '农场名称、主要作物、性别等字段将在后续资料页统一补齐。',
      );
}
