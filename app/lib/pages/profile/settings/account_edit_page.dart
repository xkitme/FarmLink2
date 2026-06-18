import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/auth_state.dart';
import '../../../core/constants.dart';
import '../../../widgets/common.dart';
import 'profile_media.dart';

/// 编辑资料 —— 全部字段可改：封面 banner、头像、账号、昵称、真实姓名、手机号、所属村。
/// 图片选取后即上传拿回 URL，保存走 PUT /user/profile 一次性提交。
class AccountEditPage extends StatefulWidget {
  const AccountEditPage({super.key});

  @override
  State<AccountEditPage> createState() => _AccountEditPageState();
}

class _AccountEditPageState extends State<AccountEditPage> {
  static const String _bannerFallback =
      'assets/images/generated/smart-farming.jpg';

  final _picker = ImagePicker();
  late final TextEditingController _username;
  late final TextEditingController _nickname;
  late final TextEditingController _realName;
  late final TextEditingController _phone;
  late final TextEditingController _village;
  late final TextEditingController _address;

  String? _avatarUrl;
  String? _bannerUrl;
  bool _uploadingAvatar = false;
  bool _uploadingBanner = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthState>().user;
    _username = TextEditingController(text: user?.username ?? '');
    _nickname = TextEditingController(text: user?.nickname ?? '');
    _realName = TextEditingController(text: user?.realName ?? '');
    _phone = TextEditingController(text: user?.phone ?? '');
    _village = TextEditingController(text: user?.villageName ?? '');
    _address = TextEditingController(text: user?.shippingAddress ?? '');
    _avatarUrl = user?.avatarUrl;
    _bannerUrl = user?.bannerUrl;
  }

  @override
  void dispose() {
    _username.dispose();
    _nickname.dispose();
    _realName.dispose();
    _phone.dispose();
    _village.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pick({required bool banner}) async {
    if (_uploadingAvatar || _uploadingBanner) return;
    final XFile? img = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: banner ? 1600 : 800,
    );
    if (img == null) return;
    final bytes = await img.readAsBytes();
    if (!mounted) return;
    setState(() {
      if (banner) {
        _uploadingBanner = true;
      } else {
        _uploadingAvatar = true;
      }
    });
    try {
      final r = await ApiClient.upload('/upload/image', bytes, img.name);
      final url = (r is Map) ? r['url'] as String? : null;
      if (!mounted) return;
      if (url == null || url.isEmpty) {
        toast(context, '上传失败，请重试', error: true);
        return;
      }
      setState(() {
        if (banner) {
          _bannerUrl = url;
        } else {
          _avatarUrl = url;
        }
      });
      toast(context, banner ? '封面已更新，点「保存」生效' : '头像已更新，点「保存」生效');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('上传', e), error: true);
    } finally {
      if (mounted) {
        setState(() {
          _uploadingBanner = false;
          _uploadingAvatar = false;
        });
      }
    }
  }

  Future<void> _save() async {
    final username = _username.text.trim();
    final nickname = _nickname.text.trim();
    final phone = _phone.text.trim();
    if (username.length < 3) {
      toast(context, '账号至少 3 个字符', error: true);
      return;
    }
    if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(username)) {
      toast(context, '账号仅支持字母、数字、下划线', error: true);
      return;
    }
    if (nickname.isEmpty) {
      toast(context, '昵称不能为空', error: true);
      return;
    }
    if (phone.isNotEmpty && !RegExp(r'^1\d{10}$').hasMatch(phone)) {
      toast(context, '请输入有效的 11 位手机号', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ApiClient.put('/user/profile', body: {
        'username': username,
        'nickname': nickname,
        'realName': _realName.text.trim(),
        'phone': phone,
        'villageName': _village.text.trim(),
        'shippingAddress': _address.text.trim(),
        'avatarUrl': _avatarUrl ?? '',
        'bannerUrl': _bannerUrl ?? '',
      });
      if (!mounted) return;
      await context.read<AuthState>().refreshProfile();
      if (!mounted) return;
      toast(context, '资料已更新');
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/profile/settings/account');
      }
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('保存', e), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final dn = user?.displayName;
    final initial = _nickname.text.trim().isNotEmpty
        ? _nickname.text.trim().substring(0, 1)
        : (dn != null && dn.isNotEmpty)
            ? dn.substring(0, 1)
            : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.canPop()
              ? context.pop()
              : context.go('/profile/settings/account'),
        ),
        title: const Text('编辑资料',
            style: TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w700)),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          _mediaHeader(initial),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _field(
                  controller: _username,
                  label: '账号',
                  hint: '字母 / 数字 / 下划线，至少 3 位（登录用）',
                  maxLength: 24,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9_]')),
                  ],
                ),
                _field(controller: _nickname, label: '昵称', maxLength: 20),
                _field(
                  controller: _realName,
                  label: '真实姓名',
                  hint: '便于村委核验身份',
                  maxLength: 20,
                ),
                _field(
                  controller: _phone,
                  label: '手机号',
                  hint: '11 位手机号，便于接收通知',
                  maxLength: 11,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
                _field(
                  controller: _village,
                  label: '所属村',
                  hint: '如：青禾村',
                  maxLength: 40,
                ),
                _field(
                  controller: _address,
                  label: '收货地址',
                  hint: '集市下单与语音助手下单的默认收货地址',
                  maxLength: 80,
                ),
                const SizedBox(height: 12),
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
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('保存修改'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 封面 + 头像编辑区（带相机覆盖与上传中态）──────────────────
  Widget _mediaHeader(String? initial) {
    const bannerH = 150.0;
    const avatar = 84.0;
    const overhang = 44.0;
    return SizedBox(
      height: bannerH + (avatar - overhang),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // 封面
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: bannerH,
            child: GestureDetector(
              onTap: () => _pick(banner: true),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ProfileBanner(
                      url: _bannerUrl, fallbackAsset: _bannerFallback),
                  Container(color: Colors.black.withValues(alpha: 0.28)),
                  Center(
                    child: _uploadingBanner
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.photo_camera_outlined,
                                  color: Colors.white, size: 26),
                              SizedBox(height: 4),
                              Text('更换封面',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600)),
                            ],
                          ),
                  ),
                ],
              ),
            ),
          ),
          // 头像
          Positioned(
            left: 16,
            top: bannerH - overhang,
            child: GestureDetector(
              onTap: () => _pick(banner: false),
              child: Stack(
                children: [
                  ProfileAvatar(
                      url: _avatarUrl, initial: initial, size: avatar),
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.32),
                        ),
                        alignment: Alignment.center,
                        child: _uploadingAvatar
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.photo_camera_outlined,
                                color: Colors.white, size: 22),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    String? hint,
    int? maxLength,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
  }) {
    OutlineInputBorder border(Color color, double width) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.sm),
          borderSide: BorderSide(color: color, width: width),
        );
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        enabled: !_saving,
        maxLength: maxLength,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          counterText: '',
          filled: true,
          fillColor: AppColors.surface,
          enabledBorder: border(AppColors.outlineVariant, 1),
          focusedBorder: border(AppColors.primary, 1.5),
          disabledBorder: border(AppColors.outlineVariant, 1),
        ),
      ),
    );
  }
}
