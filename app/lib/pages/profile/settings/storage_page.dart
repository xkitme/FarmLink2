import 'package:flutter/material.dart';

import 'settings_widgets.dart';

class StoragePage extends StatelessWidget {
  const StoragePage({super.key});

  @override
  Widget build(BuildContext context) => const ComingSoonPage(
        title: '存储空间管理',
        message: '存储空间管理\n功能完善中',
        detail: '后续将展示图片、缓存与业务数据占用，当前可在设置首页先执行缓存清理。',
      );
}
