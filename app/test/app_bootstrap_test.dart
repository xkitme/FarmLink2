import 'dart:convert';

import 'package:farmlink/core/auth_credential_store.dart';
import 'package:farmlink/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fakes.dart';

/// 116h-A polish：AppBootstrap 装配顺序 + ElderModeState 三路径一致性核验。
///
/// 三条路径必须一致：
/// 1. 启动读 SharedPreferences（本地偏好优先）；
/// 2. 无本地偏好 → 回退用户 profile 默认（isElderMode）并立即持久化；
/// 3. 设置页切换 → setEnabled 持久化，重启后读取一致。
void main() {
  Map<String, Object> userPrefs({bool isElderMode = false}) => {
        'user': jsonEncode({
          'id': 1,
          'username': 'farmer1',
          'nickname': '老李',
          'role': 'FARMER',
          'isElderMode': isElderMode,
        }),
      };

  group('AppBootstrap 装配', () {
    test('init 顺序：认证 → 适老（读用户默认）→ 语音唤醒', () async {
      SharedPreferences.setMockInitialValues(userPrefs(isElderMode: true));
      final bootstrap = AppBootstrap(
        credentialStorage: InMemoryCredentialStorage(
          const AuthCredentials(accessToken: 't', refreshToken: 'r'),
        ),
      );
      await bootstrap.init();
      expect(bootstrap.auth.loading, isFalse, reason: '认证应先完成');
      expect(bootstrap.elderMode.initialized, isTrue, reason: '适老应已初始化');
      expect(bootstrap.elderMode.enabled, isTrue,
          reason: '无本地偏好时应回退用户 profile 默认并启用');
      expect(bootstrap.voiceWake.initialized, isTrue);
      expect(bootstrap.router, isNotNull);
      final sp = await SharedPreferences.getInstance();
      expect(sp.getBool('elder_mode'), isTrue,
          reason: 'profile 默认必须已持久化（路径 2）');
      bootstrap.auth.dispose();
      bootstrap.elderMode.dispose();
      bootstrap.voiceWake.dispose();
    });

    test('本地偏好优先于用户 profile 默认（路径 1 优先）', () async {
      SharedPreferences.setMockInitialValues({
        'elder_mode': false,
        ...userPrefs(isElderMode: true),
      });
      final bootstrap = AppBootstrap(
        credentialStorage: InMemoryCredentialStorage(
          const AuthCredentials(accessToken: 't', refreshToken: 'r'),
        ),
      );
      await bootstrap.init();
      expect(bootstrap.elderMode.enabled, isFalse,
          reason: '本地偏好 false 必须压过 profile 默认 true');
      bootstrap.auth.dispose();
      bootstrap.elderMode.dispose();
      bootstrap.voiceWake.dispose();
    });

    test('切换持久化后重启读取一致（路径 3 闭环）', () async {
      SharedPreferences.setMockInitialValues(userPrefs(isElderMode: true));
      final first = AppBootstrap(
        credentialStorage: InMemoryCredentialStorage(
          const AuthCredentials(accessToken: 't', refreshToken: 'r'),
        ),
      );
      await first.init();
      expect(first.elderMode.enabled, isTrue);
      await first.elderMode.setEnabled(false);
      var sp = await SharedPreferences.getInstance();
      expect(sp.getBool('elder_mode'), isFalse, reason: '切换必须持久化');

      // 重启：以持久化值为准，profile 默认 true 不再生效
      SharedPreferences.setMockInitialValues({
        'elder_mode': false,
        ...userPrefs(isElderMode: true),
      });
      final second = AppBootstrap(
        credentialStorage: InMemoryCredentialStorage(
          const AuthCredentials(accessToken: 't', refreshToken: 'r'),
        ),
      );
      await second.init();
      expect(second.elderMode.enabled, isFalse,
          reason: '重启后应读取持久化的 false');
      sp = await SharedPreferences.getInstance();
      expect(sp.getBool('elder_mode'), isFalse);
      first.auth.dispose();
      first.elderMode.dispose();
      first.voiceWake.dispose();
      second.auth.dispose();
      second.elderMode.dispose();
      second.voiceWake.dispose();
    });

    test('未登录用户无偏好时适老默认关闭且不误写 true', () async {
      SharedPreferences.setMockInitialValues({});
      final bootstrap = AppBootstrap(
        credentialStorage: InMemoryCredentialStorage(),
      );
      await bootstrap.init();
      expect(bootstrap.elderMode.enabled, isFalse);
      final sp = await SharedPreferences.getInstance();
      expect(sp.getBool('elder_mode'), isFalse,
          reason: '默认关闭也应持久化，保证三路径口径一致');
      bootstrap.auth.dispose();
      bootstrap.elderMode.dispose();
      bootstrap.voiceWake.dispose();
    });
  });
}
