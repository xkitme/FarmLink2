import 'package:flutter/foundation.dart';

/// 麦克风占用协调器。
///
/// App 里有两类离线麦克风消费者共用同一个 `OfflineStt` 单例：
/// ① 语音助手的「唤醒常听」与正式聆听；② 各页面的「语音输入」弹层（AI 对话/发布/搜索）。
/// 它们不能同时占用麦克风，否则后启动者拿不到音频或抢走对方的回调。
///
/// 约定：任何「语音输入」类功能在用麦克风期间把 [busy] 置真，结束后置回假；
/// 唤醒常听监听该标志——别人占用时主动让路（停常听），释放后自动恢复。
class MicCoordinator {
  MicCoordinator._();

  /// 是否有「语音输入」等其它功能正在占用麦克风。
  static final ValueNotifier<bool> busy = ValueNotifier<bool>(false);

  static void acquire() => busy.value = true;
  static void release() => busy.value = false;
}
