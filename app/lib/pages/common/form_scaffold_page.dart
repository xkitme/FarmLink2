import 'package:flutter/material.dart';

import '../../core/constants.dart';

/// 整页录入表单 —— 替代各页原 `_formSheet` 的底部弹层（issue #16：所有卡片/弹层改独立页面）。
///
/// 调用方仍用自己的 `TextEditingController` 构建 `fields`，`await` 本页返回的 `bool?`：
/// 用户点「提交」返回 `true`，返回键/左上返回箭头返回 `false`。语义与原 `_formSheet` 完全一致，
/// 调用点无需改动。样式遵循 Agro-Modernist Tech：利落方正、`R.sm` 圆角、无浮层。
class FormScaffoldPage extends StatelessWidget {
  final String title;
  final List<Widget> fields;
  final String submitLabel;

  const FormScaffoldPage({
    super.key,
    required this.title,
    required this.fields,
    this.submitLabel = '提交',
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.of(context).pop(false),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          ...fields,
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(submitLabel),
            ),
          ),
        ],
      ),
    );
  }
}
