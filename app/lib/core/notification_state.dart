import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'api_client.dart';

/// App 内共享的通知未读数。
///
/// Shell 底栏和消息中心共用这个状态，避免消息页已读后底栏仍显示旧数字。
class NotificationState {
  NotificationState._();

  static final ValueNotifier<int> unread = ValueNotifier<int>(0);

  static Future<void> refresh() async {
    if (ApiClient.token == null) {
      setUnread(0);
      return;
    }
    try {
      final data = await ApiClient.get('/notification/unread');
      if (data is Map) setUnread(_int(data['unread']));
    } catch (_) {
      // 保持上一次可用数字，避免底栏因一次请求失败闪成 0。
    }
  }

  static void setUnread(int count) {
    unread.value = math.max(0, count);
  }

  static int _int(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }
}
