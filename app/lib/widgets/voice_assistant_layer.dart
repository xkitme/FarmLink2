import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/tts_service.dart';
import 'common.dart';
import 'markdown_text.dart';

/// 跑马灯边框配色——从设计参考图（霓虹彩虹光带）提取的柔和高亮色，绕边顺时针流动。
const List<Color> _auroraColors = [
  Color(0xFF7CF0BD), // 薄荷绿
  Color(0xFF6FD3FF), // 青
  Color(0xFF7FA8FF), // 蓝
  Color(0xFFB89BFF), // 紫
  Color(0xFFFF9EC4), // 粉
  Color(0xFFFFD58A), // 暖琥珀
];

class VoiceAssistantController {
  VoiceAssistantController._();

  static final ValueNotifier<int> requests = ValueNotifier<int>(0);

  static void open() {
    requests.value++;
  }
}

class VoiceAssistantLayer extends StatefulWidget {
  final Widget child;
  final String location;
  final bool enabled;

  const VoiceAssistantLayer({
    super.key,
    required this.child,
    required this.location,
    required this.enabled,
  });

  @override
  State<VoiceAssistantLayer> createState() => _VoiceAssistantLayerState();
}

class _VoiceAssistantLayerState extends State<VoiceAssistantLayer>
    with SingleTickerProviderStateMixin {
  final SpeechToText _speech = SpeechToText();
  late final AnimationController _glow;
  Timer? _silenceTimer;
  bool _active = false;
  bool _initializingSpeech = false;
  bool _speechAvailable = false;
  bool _speechInitTried = false;
  String _initError = ''; // 诊断：保留 initialize 失败的真实原因（被吞前抓住）
  bool _listening = false;
  bool _sending = false;
  bool _hasReply = false; // 收到首轮 AI 回复后才显示回复气泡，纯聆听态保持图示的简洁
  int _commandResultDepth = 0;
  String _recognized = '';
  String _lastSubmitted = '';
  String _replyMarkdown = '您好，我是 AI 语音助手。说出想做的事，我会帮您打开页面、推荐商品或继续对话。';
  String _status = '正在准备语音助手';

  @override
  void initState() {
    super.initState();
    _glow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat(); // 不反向，0→1 循环驱动边框跑马灯绕圈
    VoiceAssistantController.requests.addListener(_handleOpenRequest);
  }

  @override
  void didUpdateWidget(covariant VoiceAssistantLayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_active && !widget.enabled && oldWidget.enabled) {
      _silenceTimer?.cancel();
    }
  }

  @override
  void dispose() {
    VoiceAssistantController.requests.removeListener(_handleOpenRequest);
    _silenceTimer?.cancel();
    _glow.dispose();
    _speech.cancel();
    super.dispose();
  }

  void _handleOpenRequest() {
    if (!mounted) return;
    _activate();
  }

  Future<void> _activate() async {
    if (_active) return;
    setState(() {
      _active = true;
      _recognized = '';
      _hasReply = false;
      _status = '正在准备语音识别';
    });
    await _startListening();
  }

  Future<void> _deactivate() async {
    _silenceTimer?.cancel();
    try {
      await _speech.cancel();
    } catch (_) {}
    await TtsService.stop();
    if (!mounted) return;
    setState(() {
      _active = false;
      _listening = false;
      _sending = false;
      _recognized = '';
      _hasReply = false;
      _lastSubmitted = '';
      _status = '已关闭语音助手';
      _commandResultDepth = 0;
    });
  }

  Future<bool> _ensureSpeech() async {
    if (_speechInitTried) return _speechAvailable;
    _speechInitTried = true;
    _initializingSpeech = true;
    try {
      _speechAvailable = await _speech.initialize(
        onError: (error) {
          _initError = '$error';
          debugPrint('[voice] speech error: $error'); // 原始错误供排查
          if (!mounted) return;
          setState(() {
            _listening = false;
            _status = _friendlySpeechError('$error');
          });
        },
        onStatus: (status) {
          if (!mounted) return;
          final listening = status == 'listening';
          setState(() {
            _listening = listening;
            if (!_sending) {
              _status = listening ? '聆听中，停顿 1 秒自动提交' : '语音已暂停，点击小球重试';
            }
          });
        },
      );
    } catch (e) {
      _speechAvailable = false;
      _initError = '$e'; // MissingPluginException = web 插件没注册（多半跑了旧 bundle）
    } finally {
      _initializingSpeech = false;
    }
    return _speechAvailable;
  }

  Future<void> _startListening() async {
    if (!_active || _sending || _initializingSpeech) return;
    final available = await _ensureSpeech();
    if (!mounted || !_active) return;
    if (!available) {
      setState(() {
        _listening = false;
        _status = _friendlySpeechError(_initError);
      });
      return;
    }
    try {
      await _speech.listen(
        onResult: (result) {
          if (!mounted || !_active) return;
          final next = result.recognizedWords.trim();
          if (next.isEmpty) return;
          setState(() {
            _recognized = next;
            _status = '聆听中，停顿 1 秒自动提交';
          });
          _scheduleAutoSubmit(result.finalResult);
        },
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: false,
          listenMode: ListenMode.dictation,
          localeId: 'zh_CN',
        ),
      );
      if (!mounted) return;
      setState(() {
        _listening = true;
        _status = '聆听中，停顿 1 秒自动提交';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _listening = false;
        _status = '语音识别启动失败，请稍后再试';
      });
    }
  }

  void _scheduleAutoSubmit(bool finalResult) {
    _silenceTimer?.cancel();
    _silenceTimer = Timer(
      finalResult
          ? const Duration(milliseconds: 600)
          : const Duration(seconds: 1),
      () => _submitRecognized(auto: true),
    );
  }

  Future<void> _submitRecognized({bool auto = false}) async {
    final text = _recognized.trim();
    if (!_active || _sending || text.isEmpty || text == _lastSubmitted) {
      if (!_sending && _active && !_listening) unawaited(_startListening());
      return;
    }
    _silenceTimer?.cancel();
    _lastSubmitted = text;
    try {
      await _speech.stop();
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _sending = true;
      _listening = false;
      _recognized = ''; // 提交后清空，底栏回到「正在理解…」而非停留在已提交文本
      _status = auto ? '已自动提交，正在理解' : '正在理解您的指令';
    });
    try {
      final data = await ApiClient.post('/ai/assistant/turn', body: {
        'text': text,
        'route': widget.location,
        'context': {'lastReply': _replyMarkdown},
      });
      if (!mounted || !_active) return;
      await _applyAssistantResponse(_mapOf(data));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _replyMarkdown = serviceErrorMessage(e);
        _status = '助手暂时不可用';
      });
    } finally {
      if (mounted && _active) {
        setState(() => _sending = false);
        unawaited(_startListening());
      }
    }
  }

  Future<void> _applyAssistantResponse(Map<String, dynamic> data) async {
    final reply = _text(data['replyMarkdown'], fallback: '我听到了，请继续说。');
    final speakText = _text(data['speakText'], fallback: reply);
    final statusText = _text(data['statusText']);
    final commands = _commandsOf(data['commands']);
    setState(() {
      _replyMarkdown = reply;
      _hasReply = true;
      if (statusText.isNotEmpty) _status = statusText;
    });
    if (speakText.isNotEmpty) {
      unawaited(TtsService.speak(speakText,
          id: 'assistant_${DateTime.now().millisecondsSinceEpoch}'));
    }
    await _executeCommands(commands);
  }

  Future<void> _executeCommands(List<Map<String, dynamic>> commands) async {
    if (commands.isEmpty) return;
    final results = <Map<String, dynamic>>[];
    for (final command in commands) {
      if (!_active) return;
      final type = _text(command['type']);
      final params = _mapOf(command['params']);
      try {
        final result = await _executeCommand(type, params);
        results.add({'command': type, 'ok': true, 'result': result});
      } catch (e) {
        results.add(
            {'command': type, 'ok': false, 'message': serviceErrorMessage(e)});
        if (mounted) setState(() => _status = serviceErrorMessage(e));
      }
    }
    if (results.isNotEmpty && _commandResultDepth < 1 && _active) {
      _commandResultDepth++;
      try {
        final data =
            await ApiClient.post('/ai/assistant/command-result', body: {
          'text': '命令执行结果',
          'route': widget.location,
          'context': {'lastReply': _replyMarkdown},
          'result': {'items': results},
        });
        if (mounted && _active) await _applyAssistantResponse(_mapOf(data));
      } catch (_) {
        // Command feedback is best effort; the user already saw the local state.
      } finally {
        _commandResultDepth--;
      }
    }
  }

  Future<Map<String, dynamic>> _executeCommand(
      String type, Map<String, dynamic> params) async {
    switch (type) {
      case 'open_page':
        final routeKey = _text(params['routeKey']);
        final path = _pathFor(routeKey);
        if (path == null) throw ApiException(40001, '暂不支持打开该页面');
        setState(
            () => _status = routeKey == 'orders' ? '订单页将在下一阶段接入' : '正在打开页面');
        context.go(path);
        return {'routeKey': routeKey, 'path': path};
      case 'show_products':
        setState(() => _status = '正在打开集市商品');
        context.go('/market');
        return {'productIds': params['productIds']};
      case 'open_product':
        final productId = _int(params['productId']);
        if (productId <= 0) throw ApiException(40001, '商品不存在');
        setState(() => _status = '正在打开商品');
        context.push('/market/product/$productId');
        return {'productId': productId};
      case 'show_order_confirm':
        final productId = _int(params['productId']);
        final quantity = _int(params['quantity'], fallback: 1);
        setState(() {
          _status = '正在确认订单';
          _replyMarkdown =
              '已为您准备订单确认：商品 $productId，数量 $quantity。P1 会接入收货地址确认页。';
        });
        return {'productId': productId, 'quantity': quantity};
      case 'create_order':
        setState(() => _status = '正在创建订单');
        final order = await ApiClient.post('/market/order', body: {
          'productId': params['productId'],
          'quantity': params['quantity'],
          'receiverInfo': params['receiverInfo'],
          'remark': 'AI 语音助手下单',
        });
        final orderMap = _mapOf(order);
        setState(() {
          _replyMarkdown =
              '订单已创建，订单号：${_text(orderMap['orderNo'], fallback: '待生成')}。';
          _status = '订单已创建';
        });
        return orderMap;
      case 'mock_pay':
        final orderId = _int(params['orderId']);
        if (orderId <= 0) throw ApiException(40001, '订单不存在');
        setState(() => _status = '正在完成支付');
        final paid = await ApiClient.put('/market/order/$orderId/status',
            body: {'status': 'PAID'});
        setState(() {
          _replyMarkdown = '支付已完成，订单已更新为已支付。';
          _status = '支付已完成';
        });
        return _mapOf(paid);
      case 'show_message':
        final markdown = _text(params['markdown']);
        if (markdown.isNotEmpty) setState(() => _replyMarkdown = markdown);
        if (params['speak'] == true && markdown.isNotEmpty) {
          unawaited(TtsService.speak(markdown,
              id: 'assistant_message_${DateTime.now().millisecondsSinceEpoch}'));
        }
        return {'shown': markdown.isNotEmpty};
      case 'end':
        await _deactivate();
        return {'ended': true};
      default:
        throw ApiException(40001, '暂不支持该操作');
    }
  }

  String? _pathFor(String routeKey) {
    switch (routeKey) {
      case 'home':
        return '/home';
      case 'ai':
        return '/ai';
      case 'market':
      case 'orders':
        return '/market';
      case 'publish':
        return '/publish';
      case 'messages':
        return '/messages';
      case 'profile':
        return '/profile';
      case 'search':
        return '/search';
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled && !_active) return widget.child;
    return Stack(
      children: [
        widget.child,
        if (widget.enabled && !_active) _smallOrb(),
        if (_active) _overlay(),
      ],
    );
  }

  Widget _smallOrb() {
    return Positioned(
      right: 18,
      bottom: 150, // 覆盖层已包住底部导航栏，抬高小球避免压在导航栏上
      child: SafeArea(
        minimum: EdgeInsets.zero,
        child: Semantics(
          button: true,
          label: '打开 AI 语音助手',
          child: GestureDetector(
            onTap: _activate,
            child: Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.secondary,
                    AppColors.gold
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(999),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.26),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child:
                  const Icon(Icons.graphic_eq, color: Colors.white, size: 28),
            ),
          ),
        ),
      ),
    );
  }

  Widget _overlay() {
    return Positioned.fill(
      child: Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            // 点击空白处关闭；底栏与按钮在更上层，自行吞掉点击。
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _deactivate,
              ),
            ),
            // 边框跑马灯（不拦截点击，让底层页面交互不受影响）。
            Positioned.fill(
              child: IgnorePointer(
                child: AnimatedBuilder(
                  animation: _glow,
                  builder: (context, _) => CustomPaint(
                    painter: _MarqueeBorderPainter(t: _glow.value),
                  ),
                ),
              ),
            ),
            if (_hasReply || _sending)
              Positioned(
                left: 16,
                right: 16,
                bottom: 132,
                child: SafeArea(top: false, child: _replyBubble()),
              ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _bottomBar(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bottomBar() {
    final transcript = _recognized.trim();
    final centerText = transcript.isNotEmpty
        ? transcript
        : _sending
            ? '正在理解…'
            : _listening
                ? '聆听中…'
                : _status;
    return GestureDetector(
      onTap: () {}, // 吸收点击，避免误触关闭
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x00000000), Color(0xE6000000)],
          ),
        ),
        padding: const EdgeInsets.fromLTRB(20, 26, 20, 12),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              _circleButton(
                icon: Icons.auto_awesome,
                label: '提交',
                onTap: () => _submitRecognized(auto: false),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: Text(
                      centerText,
                      key: ValueKey(centerText),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: transcript.isNotEmpty ? 17 : 18,
                        height: 1.3,
                        fontWeight: FontWeight.w600,
                        shadows: const [
                          Shadow(color: Colors.black54, blurRadius: 8),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              _circleButton(
                icon: Icons.keyboard_alt_outlined,
                label: '键盘输入',
                onTap: _promptKeyboardInput,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _circleButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 58,
          height: 58,
          padding: const EdgeInsets.all(2.5),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const SweepGradient(
                colors: [..._auroraColors, Color(0xFF7CF0BD)]),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFB89BFF).withValues(alpha: 0.45),
                blurRadius: 16,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFEDF1F6),
            ),
            child: Icon(icon, color: const Color(0xFF2A2A33), size: 26),
          ),
        ),
      ),
    );
  }

  // 键盘兜底输入：弹出文本框，提交后走与语音相同的指令管线。
  Future<void> _promptKeyboardInput() async {
    try {
      await _speech.stop();
    } catch (_) {}
    if (!mounted) return;
    final controller = TextEditingController();
    final text = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            16 + MediaQuery.of(sheetContext).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: controller,
                autofocus: true,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (v) => Navigator.of(sheetContext).pop(v),
                decoration: InputDecoration(
                  hintText: '输入想让助手做的事…',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(R.sm),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () =>
                    Navigator.of(sheetContext).pop(controller.text),
                child: const Text('发送'),
              ),
            ],
          ),
        );
      },
    );
    controller.dispose();
    if (!mounted || !_active) return;
    final next = (text ?? '').trim();
    if (next.isEmpty) {
      unawaited(_startListening());
      return;
    }
    setState(() => _recognized = next);
    await _submitRecognized(auto: false);
  }

  Widget _replyBubble() {
    return GestureDetector(
      onTap: () {},
      child: Container(
        constraints: const BoxConstraints(maxHeight: 220),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(R.md),
          border: Border.all(color: AppColors.outlineVariant),
          boxShadow: AppColors.ambientShadowUp,
        ),
        child: SingleChildScrollView(
          child: MarkdownText(
            _replyMarkdown,
            baseStyle: const TextStyle(
              fontSize: 14,
              height: 1.55,
              color: AppColors.onSurface,
            ),
          ),
        ),
      ),
    );
  }

  // 把底层语音识别错误码映射成口语化中文，并引导到键盘输入；原始错误打到 debug 控制台。
  static String _friendlySpeechError(String raw) {
    final e = raw.toLowerCase();
    if (e.contains('no_match') ||
        e.contains('no match') ||
        e.contains('speech_timeout') ||
        e.contains('timeout')) {
      return '没听清，请再说一次，或点小球重试。';
    }
    if (e.contains('permission')) {
      return '语音识别不可用：设备未授权麦克风或没有语音识别服务。可到「AI 农技」页用键盘提问。';
    }
    if (e.contains('network')) {
      return '语音识别需要网络，当前不可用。可到「AI 农技」页用键盘提问。';
    }
    if (e.contains('not supported') ||
        e.contains('not_supported') ||
        e.contains('speech_not_supported') ||
        e.contains('missingplugin')) {
      return '当前设备不支持语音输入。可到「AI 农技」页用键盘提问。';
    }
    return '语音识别暂时不可用。可到「AI 农技」页用键盘提问。';
  }

  static Map<String, dynamic> _mapOf(dynamic value) {
    if (value is Map) return value.map((key, val) => MapEntry('$key', val));
    return {};
  }

  static List<Map<String, dynamic>> _commandsOf(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => item.map((key, val) => MapEntry('$key', val)))
        .toList();
  }

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static int _int(dynamic value, {int fallback = 0}) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? fallback;
  }
}

/// 全屏圆角边框跑马灯：彩虹光带绕边顺时针流动，外发光模拟霓虹。
class _MarqueeBorderPainter extends CustomPainter {
  _MarqueeBorderPainter({required this.t});

  /// 0..1 的动画相位，驱动 SweepGradient 旋转。
  final double t;

  static const double _stroke = 7;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    // 全屏直角边框（无圆角），描边整条留在屏幕内。
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(_stroke / 2),
      Radius.zero,
    );
    final shader = SweepGradient(
      colors: const [..._auroraColors, Color(0xFF7CF0BD)],
      transform: GradientRotation(t * 2 * math.pi),
    ).createShader(rect);

    // 外发光层：更宽 + 模糊。
    final glow = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = _stroke * 2.4
      ..shader = shader
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 16);
    canvas.drawRRect(rrect, glow);

    // 清晰主描边。
    final line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = _stroke
      ..shader = shader;
    canvas.drawRRect(rrect, line);
  }

  @override
  bool shouldRepaint(covariant _MarqueeBorderPainter oldDelegate) =>
      oldDelegate.t != t;
}
