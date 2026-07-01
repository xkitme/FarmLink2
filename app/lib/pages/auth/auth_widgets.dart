import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';

const _authBackgroundAsset = 'assets/images/generated/auth-hero.jpg';

Future<String?>? _authBackgroundFuture;

Future<String?> _loadAuthBackgroundUrl() async {
  try {
    final data = await ApiClient.get('/site/auth-background');
    if (data is Map) {
      final raw = data['imageUrl'];
      if (raw is String && raw.trim().isNotEmpty) {
        return ApiClient.resolveImageUrl(raw);
      }
    }
  } catch (_) {
    // 兼容旧后端或暂时不可达时，继续走站点图直连与 bundled 兜底。
  }
  return SiteImages.remoteUrl(_authBackgroundAsset);
}

class AuthBackgroundImage extends StatelessWidget {
  const AuthBackgroundImage({super.key});

  static Future<String?> get _future =>
      _authBackgroundFuture ??= _loadAuthBackgroundUrl();

  Widget _fallback() => Image.asset(
        _authBackgroundAsset,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.low,
        errorBuilder: (_, __, ___) =>
            const ColoredBox(color: Color(0xFF12391F)),
      );

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: _future,
      builder: (context, snapshot) {
        final url = snapshot.data;
        if (url == null || url.trim().isEmpty) return _fallback();
        return Image.network(
          url,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.low,
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) => _fallback(),
          frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
            if (wasSynchronouslyLoaded || frame != null) return child;
            return _fallback();
          },
        );
      },
    );
  }
}

class AuthScreenScaffold extends StatelessWidget {
  const AuthScreenScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.showBack = false,
    this.backEnabled = true,
    this.onBack,
    this.brandTopGap = 112,
    this.compactBrandTopGap = 72,
    this.brandFormGap = 36,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final bool showBack;
  final bool backEnabled;
  final VoidCallback? onBack;
  final double brandTopGap;
  final double compactBrandTopGap;
  final double brandFormGap;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFF07160F),
      resizeToAvoidBottomInset: true,
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const AuthBackgroundImage(),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0, 0.44, 1],
                  colors: [
                    Color(0x8A061A0E),
                    Color(0x9907150D),
                    Color(0xE604160D),
                  ],
                ),
              ),
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                final compact = constraints.maxHeight < 760;
                final horizontal = constraints.maxWidth < 380 ? 22.0 : 30.0;
                final maxWidth = constraints.maxWidth - horizontal * 2;
                final topGap = compact ? compactBrandTopGap : brandTopGap;
                final bottom = media.viewInsets.bottom +
                    media.viewPadding.bottom +
                    (compact ? 22 : 30);

                return SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: EdgeInsets.fromLTRB(
                    horizontal,
                    media.viewPadding.top,
                    horizontal,
                    bottom,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight -
                          media.viewPadding.top -
                          bottom,
                    ),
                    child: Align(
                      alignment: Alignment.topCenter,
                      child: SizedBox(
                        width: maxWidth.clamp(0.0, 390.0).toDouble(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            SizedBox(height: topGap),
                            _AuthBrand(title: title, subtitle: subtitle),
                            SizedBox(height: compact ? 28 : brandFormGap),
                            child,
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            if (showBack)
              SafeArea(
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(left: 8, top: 2),
                    child: Tooltip(
                      message: '返回登录',
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: backEnabled
                            ? (onBack ?? () => context.go('/auth/login'))
                            : null,
                        child: SizedBox(
                          width: 64,
                          height: 60,
                          child: Align(
                            alignment: Alignment.topLeft,
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Opacity(
                                opacity: backEnabled ? 1 : 0.38,
                                child: const Icon(
                                  Icons.arrow_back,
                                  color: Colors.white,
                                  size: 27,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AuthBrand extends StatelessWidget {
  const _AuthBrand({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Icon(Icons.eco, color: Color(0xFFD8FFE0), size: 42),
        const SizedBox(height: 22),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 30,
            fontWeight: FontWeight.w800,
            letterSpacing: 0,
            shadows: [
              Shadow(
                color: Color(0x7A000000),
                blurRadius: 14,
                offset: Offset(0, 2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xE6FFFFFF),
            fontSize: 13,
            fontWeight: FontWeight.w600,
            letterSpacing: 0,
            height: 1.3,
          ),
        ),
      ],
    );
  }
}

class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.suffix,
    this.enabled = true,
    this.action = TextInputAction.next,
    this.keyboardType,
    this.autofillHints,
    this.inputFormatters,
    this.validator,
    this.onSubmit,
    this.onChanged,
    this.autovalidateMode = AutovalidateMode.onUserInteraction,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final bool enabled;
  final TextInputAction action;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final VoidCallback? onSubmit;
  final ValueChanged<String>? onChanged;

  /// 每个字段独立校验（默认仅在自己被输入后校验自己），
  /// 避免把 autovalidate 挂在 Form 级导致「填一个框、其它框全飘红」。
  final AutovalidateMode autovalidateMode;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      autovalidateMode: autovalidateMode,
      obscureText: obscure,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      inputFormatters: inputFormatters,
      enableSuggestions: !obscure,
      autocorrect: !obscure,
      textInputAction: action,
      onFieldSubmitted: onSubmit == null ? null : (_) => onSubmit!(),
      onChanged: onChanged,
      validator: validator,
      style: const TextStyle(
        color: AppColors.onSurface,
        fontSize: 15,
        fontWeight: FontWeight.w600,
      ),
      decoration: InputDecoration(
        filled: true,
        fillColor: const Color(0xF1FFFFFF),
        hintText: hint,
        hintStyle: const TextStyle(
          color: Color(0xFF9BAEA3),
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 17),
        errorMaxLines: 2,
        errorStyle: const TextStyle(
          color: Color(0xFFFFD9D9),
          fontWeight: FontWeight.w600,
        ),
        prefixIcon: Icon(icon, color: const Color(0xFF6E9080), size: 21),
        suffixIcon: suffix,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: Color(0xE6FFFFFF), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: Color(0xFFD6FFE1), width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: Color(0xBFFFFFFF), width: 1),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: Color(0xFFFFD9D9), width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: Color(0xFFFFD9D9), width: 1.5),
        ),
      ),
    );
  }
}

class AuthPrimaryButton extends StatelessWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return SizedBox(
      height: 54,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(R.md),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.md),
            gradient: LinearGradient(
              colors: enabled
                  ? const [Color(0xFF5ED09B), Color(0xFF1E7F61)]
                  : const [Color(0x995ED09B), Color(0x991E7F61)],
            ),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(R.md),
            onTap: enabled ? onPressed : null,
            child: Center(
              child: loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class AuthInlineAction extends StatelessWidget {
  const AuthInlineAction({
    super.key,
    required this.prefix,
    required this.action,
    required this.onTap,
    this.enabled = true,
  });

  final String prefix;
  final String action;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          prefix,
          style: const TextStyle(
            color: Color(0xD9FFFFFF),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        TextButton(
          onPressed: enabled ? onTap : null,
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFFD3FFE0),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
            minimumSize: const Size(0, 34),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            textStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          child: Text(action),
        ),
      ],
    );
  }
}
