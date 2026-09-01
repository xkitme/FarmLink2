import 'package:farmlink/core/elder_mode.dart';
import 'package:farmlink/models/user.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('ElderModeState 从偏好读取适老开关（true）', () async {
    SharedPreferences.setMockInitialValues({'elder_mode': true});
    final state = ElderModeState();
    await state.init();
    expect(state.initialized, isTrue);
    expect(state.enabled, isTrue);
  });

  test('ElderModeState 默认关闭', () async {
    SharedPreferences.setMockInitialValues({});
    final state = ElderModeState();
    await state.init();
    expect(state.initialized, isTrue);
    expect(state.enabled, isFalse);
  });

  test('ElderModeState 切换并持久化', () async {
    SharedPreferences.setMockInitialValues({});
    final state = ElderModeState();
    await state.init();
    await state.setEnabled(true);
    expect(state.enabled, isTrue);

    final sp = await SharedPreferences.getInstance();
    expect(sp.getBool('elder_mode'), isTrue);
  });

  // ── 116h-A polish：profile 默认 / 本地优先 / 重启闭环（三路径一致） ──

  test('无本地偏好时回退用户 profile 默认并持久化', () async {
    SharedPreferences.setMockInitialValues({});
    final state = ElderModeState();
    await state.init(user: const AppUser(id: 1, username: 'farmer', isElderMode: true));
    expect(state.enabled, isTrue);
    final sp = await SharedPreferences.getInstance();
    expect(sp.getBool('elder_mode'), isTrue,
        reason: 'profile 默认必须立即持久化，避免每次启动重复回退');
  });

  test('本地偏好优先于用户 profile 默认', () async {
    SharedPreferences.setMockInitialValues({'elder_mode': false});
    final state = ElderModeState();
    await state.init(user: const AppUser(id: 1, username: 'farmer', isElderMode: true));
    expect(state.enabled, isFalse,
        reason: '用户已在设置页关闭，不得被 profile 默认重新打开');
  });

  test('切换持久化 → 重启读取一致（三路径闭环）', () async {
    SharedPreferences.setMockInitialValues({});
    final state = ElderModeState();
    await state.init(user: const AppUser(id: 1, username: 'farmer', isElderMode: true));
    expect(state.enabled, isTrue);
    await state.setEnabled(false);
    final sp = await SharedPreferences.getInstance();
    expect(sp.getBool('elder_mode'), isFalse);

    // 模拟重启：只带持久化值，不带 profile 默认
    SharedPreferences.setMockInitialValues({'elder_mode': false});
    final restarted = ElderModeState();
    await restarted.init();
    expect(restarted.enabled, isFalse);
  });
}
