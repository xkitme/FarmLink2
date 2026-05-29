import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

/// 个人资料：展示账号/手机号/角色，可编辑昵称与所属村，保存走 PUT /user/profile
class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  late final TextEditingController _nickname;
  late final TextEditingController _village;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthState>().user;
    _nickname = TextEditingController(text: user?.nickname ?? '');
    _village = TextEditingController(text: user?.villageName ?? '');
  }

  @override
  void dispose() {
    _nickname.dispose();
    _village.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final nickname = _nickname.text.trim();
    if (nickname.isEmpty) {
      toast(context, '昵称不能为空', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ApiClient.put('/user/profile', body: {
        'nickname': nickname,
        'villageName': _village.text.trim(),
      });
      if (!mounted) return;
      await context.read<AuthState>().refreshProfile();
      if (!mounted) return;
      toast(context, '资料已更新');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('保存', e), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '个人资料'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          const SettingsImageBanner(
            image: 'assets/images/_6_1.jpg',
            title: '个人资料',
            subtitle: '完善昵称与所属村，让村委与农技服务更好地联系到你。',
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _readonlyRow('账号', user?.username ?? '-'),
                const Divider(height: 20),
                _readonlyRow('手机号', _phoneText(user?.phone)),
                const Divider(height: 20),
                _readonlyRow('角色', kRoleLabels[user?.role] ?? '普通农户'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              children: [
                TextField(
                  controller: _nickname,
                  enabled: !_saving,
                  maxLength: 20,
                  decoration: const InputDecoration(
                    labelText: '昵称',
                    filled: true,
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _village,
                  enabled: !_saving,
                  maxLength: 40,
                  decoration: const InputDecoration(
                    labelText: '所属村',
                    hintText: '如：青禾村',
                    filled: true,
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('保存修改'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              '账号与手机号如需变更，请联系村委或管理员',
              style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }

  String _phoneText(String? phone) =>
      (phone == null || phone.isEmpty) ? '未绑定' : phone;

  Widget _readonlyRow(String label, String value) => Row(
        children: [
          Text(label,
              style: const TextStyle(
                  color: AppColors.onSurfaceVariant, fontSize: 14)),
          const Spacer(),
          Text(value,
              style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 15,
                  fontWeight: FontWeight.w600)),
        ],
      );
}
