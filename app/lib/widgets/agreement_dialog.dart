import 'package:flutter/material.dart';

import '../core/constants.dart';
import '../core/legal_documents.dart';
import '../core/site_images.dart';

/// 弹出带「老式电视开机」CRT 动效的协议弹窗。
///
/// - [consentMode] = true：底部为「退出 / 同意并继续」，需滚动读到底才可同意，
///   不可点遮罩关闭；返回用户是否同意（true/false）。开屏引导页使用。
/// - [consentMode] = false：查看模式，右上角 X 关闭、无需读到底、可点遮罩关闭；
///   返回 null。登录页查看《用户协议》《隐私政策》时使用。
Future<bool?> showAgreementDialog(
  BuildContext context, {
  required String title,
  required List<LegalSection> sections,
  bool consentMode = false,
}) {
  return showGeneralDialog<bool>(
    context: context,
    barrierDismissible: !consentMode,
    barrierLabel: title,
    barrierColor: Colors.black.withValues(alpha: 0.62),
    // 入场交给 CRT 开机动效自行驱动（本体不淡入/缩放，让白线"突然闪出"）；
    // 关闭(reverse)时补一段淡出 + 轻微缩小，避免"啪"一下消失的生硬感。
    transitionDuration: const Duration(milliseconds: 260),
    pageBuilder: (_, __, ___) => AgreementDialog(
      title: title,
      sections: sections,
      consentMode: consentMode,
    ),
    transitionBuilder: (_, animation, __, child) {
      if (animation.status != AnimationStatus.reverse) return child;
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOut);
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.94, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}

class AgreementDialog extends StatefulWidget {
  final String title;
  final List<LegalSection> sections;
  final bool consentMode;

  const AgreementDialog({
    super.key,
    required this.title,
    required this.sections,
    this.consentMode = false,
  });

  @override
  State<AgreementDialog> createState() => _AgreementDialogState();
}

class _AgreementDialogState extends State<AgreementDialog>
    with SingleTickerProviderStateMixin {
  final _scrollController = ScrollController();
  bool _hasReadToEnd = false;

  // 老式电视开机时序：白线闪现 → 纵向拉开成盒子 → 大 logo 居中弹出 →
  // 上移缩小到 header → 内容浮现。
  late final AnimationController _crt;

  @override
  void initState() {
    super.initState();
    // 查看模式无需读到底，直接放开同意/关闭。
    _hasReadToEnd = !widget.consentMode;
    _scrollController.addListener(_checkReadToEnd);
    _crt = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    // 推迟到首帧布局之后再启动：条款全文的全量布局发生在 t=0（白线静止）
    // 那一帧，动画起跑时布局已缓存，避免首帧掉帧。
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _checkReadToEnd();
      _crt.forward();
    });
  }

  void _checkReadToEnd() {
    if (!mounted || !widget.consentMode || _hasReadToEnd) return;
    if (!_scrollController.hasClients) return;
    if (_scrollController.position.extentAfter <= 8) {
      setState(() => _hasReadToEnd = true);
    }
  }

  @override
  void dispose() {
    _crt.dispose();
    _scrollController
      ..removeListener(_checkReadToEnd)
      ..dispose();
    super.dispose();
  }

  /// 区间映射小工具：把 t∈[a,b] 线性映射到 [0,1] 并套用曲线。
  double _seg(double t, double a, double b, [Curve curve = Curves.linear]) {
    if (t <= a) return 0;
    if (t >= b) return 1;
    return curve.transform((t - a) / (b - a));
  }

  double _lerp(double a, double b, double t) => a + (b - a) * t;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return PopScope(
      // 同意模式必须二选一，不允许返回手势关闭；查看模式可关。
      canPop: !widget.consentMode,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: 560,
                maxHeight: size.height * 0.86,
              ),
              // LayoutBuilder 拿到盒子真实高度，用于计算大 logo 的居中起点。
              child: LayoutBuilder(
                builder: (context, constraints) {
                  // 条款全文只构建一次，动画帧间复用同一实例：Flutter 检测到
                  // child 为 identical 时会跳过整棵文字子树的更新与重布局。
                  final scrollContent = _scrollContent();
                  return AnimatedBuilder(
                    animation: _crt,
                    builder: (context, _) {
                      final boxHeight = constraints.maxHeight;
                      // 动画播完即卸掉 CRT 脚手架（Stack/白蒙层/Align），
                      // 回到干净的普通模态框，避免滚动时整盒连蒙层重绘。
                      if (_crt.isCompleted) {
                        return _finalShell(context, boxHeight, scrollContent);
                      }
                      return _buildCrt(context, boxHeight, scrollContent);
                    },
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// CRT 开机外壳：纵向从中线拉开 + 白屏过曝 + 边缘辉光。
  Widget _buildCrt(
      BuildContext context, double boxHeight, Widget scrollContent) {
    final t = _crt.value;

    // ① 白屏过曝：0→1 快速点亮（闪线），稳一拍，再 1→0 退去露出内容。
    double white;
    if (t < 0.06) {
      white = t / 0.06;
    } else if (t < 0.28) {
      white = 1;
    } else {
      white = 1 - _seg(t, 0.28, 0.42);
    }
    white = white.clamp(0.0, 1.0);

    // ② 纵向展开：先把白线稳住一拍（0~0.09），再从细线拉成整盒。
    final expand = _seg(t, 0.09, 0.40, Curves.easeOutCubic);
    const lineFrac = 0.006; // 起始即一条细白线（占全高 0.6%）
    final heightFactor =
        (lineFrac + (1 - lineFrac) * expand).clamp(0.0001, 1.0);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(R.sm),
        boxShadow: [
          // CRT 辉光：白屏越亮，外溢辉光越强（细线阶段最像电视亮线）。
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.5 * white),
            blurRadius: 28,
            spreadRadius: 1.5,
          ),
          ...AppColors.ambientShadow,
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(R.sm),
        child: Align(
          heightFactor: heightFactor,
          child: Stack(
            children: [
              _dialogBody(context, boxHeight, scrollContent),
              // 过曝白层覆盖在内容之上，随展开退去。
              Positioned.fill(
                child: IgnorePointer(
                  child: ColoredBox(
                    color: Colors.white.withValues(alpha: white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 终态：干净的普通模态框（无 Stack / 白蒙层 / Align），滚动不卡。
  Widget _finalShell(
    BuildContext context,
    double boxHeight,
    Widget scrollContent,
  ) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(R.sm),
        boxShadow: AppColors.ambientShadow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(R.sm),
        child: _dialogBody(context, boxHeight, scrollContent),
      ),
    );
  }

  /// 大 logo 飞抵 header 后，其余内容整体浮现。
  Widget _reveal(Widget child) {
    if (_crt.isCompleted) return child; // 终态去掉 Opacity/Transform 包裹
    final c = _seg(_crt.value, 0.80, 1.0, Curves.easeOut);
    return Opacity(
      opacity: c,
      child: Transform.translate(offset: Offset(0, (1 - c) * 10), child: child),
    );
  }

  /// 大 logo：盒子中央淡入放大 → 上移并缩小到 header 的小 logo 槽位。
  Widget _logo(double boxHeight) {
    if (_crt.isCompleted) {
      return const BrandLogo(width: 56, height: 56, borderRadius: R.sm);
    }
    final t = _crt.value;
    final appear = _seg(t, 0.42, 0.56, Curves.easeOutBack); // 居中淡入放大
    final fly = _seg(t, 0.56, 0.78, Curves.easeInOutCubic); // 上移 + 缩小
    final opacity = _seg(t, 0.42, 0.52).clamp(0.0, 1.0);

    const bigScale = 2.4; // 56 → ~134px 的大 logo
    final scale = fly == 0 ? bigScale * appear : _lerp(bigScale, 1.0, fly);

    const headerLogoCenterY = 20.0 + 28.0; // 顶部内边距 + 半个 logo
    final startDy = boxHeight / 2 - headerLogoCenterY; // 槽位 → 盒子中线的位移
    final dy = (1 - fly) * startDy;

    return Transform.translate(
      offset: Offset(0, dy),
      child: Transform.scale(
        scale: scale.clamp(0.0, bigScale + 0.4),
        child: Opacity(
          opacity: opacity,
          child: const BrandLogo(width: 56, height: 56, borderRadius: R.sm),
        ),
      ),
    );
  }

  /// 条款全文滚动区。只构建一次，由 [build] 持有并跨动画帧复用。
  Widget _scrollContent() {
    return Scrollbar(
      controller: _scrollController,
      // 全量布局，总高度精确恒定：滚动条不乱跳、不每帧重估，滚动顺滑。
      child: SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              '请审慎阅读并充分理解以下全部条款，特别是涉及个人信息、账号处置、农业与交易风险、AI 服务、责任限制及争议解决的内容。',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 14,
                height: 1.65,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 18),
            for (final section in widget.sections) ...[
              Text(
                section.title,
                style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                section.body,
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 13,
                  height: 1.7,
                ),
              ),
              const SizedBox(height: 18),
            ],
          ],
        ),
      ),
    );
  }

  Widget _dialogBody(
    BuildContext context,
    double boxHeight,
    Widget scrollContent,
  ) {
    return Stack(
      children: [
        Material(
          color: AppColors.surface,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _logo(boxHeight),
                    const SizedBox(height: 10),
                    _reveal(
                      Text(
                        widget.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              _reveal(const Divider(height: 1)),
              Expanded(child: _reveal(scrollContent)),
              // 同意模式才有底部「退出 / 同意并继续」操作条。
              if (widget.consentMode) ...[
                _reveal(const Divider(height: 1)),
                _reveal(
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(50),
                              foregroundColor: AppColors.onSurfaceVariant,
                            ),
                            child: const Text('退出'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: _hasReadToEnd
                                ? () => Navigator.of(context).pop(true)
                                : null,
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size.fromHeight(50),
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: AppColors.outlineVariant,
                              disabledForegroundColor:
                                  AppColors.onSurfaceVariant,
                              elevation: 0,
                            ),
                            child: const Text(
                              '同意并继续',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        // 查看模式：右上角紧贴盒角的关闭按钮。
        if (!widget.consentMode)
          Positioned(
            top: 6,
            right: 6,
            child: _reveal(
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close, size: 22),
                color: AppColors.onSurfaceVariant,
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                tooltip: '关闭',
              ),
            ),
          ),
      ],
    );
  }
}
