import 'package:farmlink/core/elder_mode.dart';
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
}
