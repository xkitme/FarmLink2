import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/tts_service.dart';
import 'common.dart';
import 'markdown_text.dart';

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
  bool _listening = false;
  bool _sending = false;
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
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
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
        onError: (_) {
          if (!mounted) return;
          setState(() {
            _listening = false;
            _status = '语音识别暂时不可用，请稍后再试';
          });
        },
        onStatus: (status) {
          if (!mounted) return;
          final listening = status == 'listening';
          setState(() {
            _listening = listening;
            if (!_sending) {
              _status = listening ? '聆听中，停顿 3 秒自动提交' : '语音已暂停，点击小球重试';
            }
          });
        },
      );
    } catch (_) {
      _speechAvailable = false;
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
        _status = '当前环境暂不支持语音输入，请使用 AI 聊天页键盘输入';
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
            _status = '聆听中，停顿 3 秒自动提交';
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
        _status = '聆听中，停顿 3 秒自动提交';
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
          : const Duration(seconds: 3),
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
      bottom: 92,
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
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _deactivate,
        child: Material(
          color: Colors.black.withValues(alpha: 0.34),
          child: Stack(
            children: [
              _edgeGlow(),
              Center(
                child: GestureDetector(
                  onTap: () => _submitRecognized(auto: false),
                  child: _largeOrb(),
                ),
              ),
              Positioned(
                top: 52,
                left: 18,
                right: 18,
                child: _statusBar(),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 28,
                child: SafeArea(top: false, child: _replyBubble()),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _edgeGlow() {
    return AnimatedBuilder(
      animation: _glow,
      builder: (context, _) {
        final opacity = 0.38 + _glow.value * 0.34;
        final gradient = LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: opacity),
            AppColors.secondary.withValues(alpha: opacity * 0.82),
            AppColors.gold.withValues(alpha: opacity * 0.74),
          ],
        );
        return Stack(
          children: [
            Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                child: DecoratedBox(
                    decoration: BoxDecoration(gradient: gradient))),
            Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: 5,
                child: DecoratedBox(
                    decoration: BoxDecoration(gradient: gradient))),
            Positioned(
                top: 0,
                bottom: 0,
                left: 0,
                width: 5,
                child: DecoratedBox(
                    decoration: BoxDecoration(gradient: gradient))),
            Positioned(
                top: 0,
                bottom: 0,
                right: 0,
                width: 5,
                child: DecoratedBox(
                    decoration: BoxDecoration(gradient: gradient))),
          ],
        );
      },
    );
  }

  Widget _largeOrb() {
    return AnimatedBuilder(
      animation: _glow,
      builder: (context, _) {
        final size = 154.0 + _glow.value * 12;
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const RadialGradient(
              colors: [
                Colors.white,
                AppColors.primaryDim,
                AppColors.primary,
                AppColors.secondary,
              ],
              stops: [0.0, 0.28, 0.66, 1.0],
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.45),
                blurRadius: 36 + _glow.value * 18,
                spreadRadius: 5 + _glow.value * 4,
              ),
            ],
          ),
          child: Icon(
            _sending
                ? Icons.auto_awesome
                : _listening
                    ? Icons.mic
                    : Icons.graphic_eq,
            color: Colors.white,
            size: 48,
          ),
        );
      },
    );
  }

  Widget _statusBar() {
    final transcript = _recognized.trim();
    return GestureDetector(
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.94),
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.outlineVariant),
        ),
        child: Row(
          children: [
            Icon(
              _sending
                  ? Icons.sync
                  : _listening
                      ? Icons.hearing
                      : Icons.mic_off_outlined,
              color: AppColors.primary,
              size: 18,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                transcript.isEmpty ? _status : '$transcript  ·  $_status',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 13,
                  height: 1.35,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            IconButton(
              tooltip: '关闭',
              visualDensity: VisualDensity.compact,
              onPressed: _deactivate,
              icon: const Icon(Icons.close,
                  size: 18, color: AppColors.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
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
