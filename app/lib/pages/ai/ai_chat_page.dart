import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/tts_service.dart';
import '../../core/voice_input.dart';
import '../../widgets/common.dart';
import '../../widgets/markdown_text.dart';

class AiChatPage extends StatefulWidget {
  final int? threadId;
  final String initialScene;

  const AiChatPage({
    super.key,
    this.threadId,
    this.initialScene = 'GENERAL',
  });

  @override
  State<AiChatPage> createState() => _AiChatPageState();
}

class _AiChatPageState extends State<AiChatPage> {
  final _input = TextEditingController();
  final _inputFocus = FocusNode();
  final _picker = ImagePicker();
  final _scrollCtrl = ScrollController();

  final List<_ChatMessage> _messages = [];
  final Map<int, String> _feedbackSent = {};
  int? _threadId;
  late String _scene;
  bool _loadingHistory = true;
  bool _sending = false;
  bool _detecting = false;
  bool _hasDraft = false;
  bool _hasOutgoingMessage = false;
  bool _stickToBottom = true;
  String? _ttsPendingId;

  static const _thinkingText = '正在思考，请稍候...';
  static const _emptyAnswerText = 'AI 暂时没有返回内容，请换个问法再试。';

  @override
  void initState() {
    super.initState();
    _input.addListener(_handleInputChanged);
    _inputFocus.addListener(_handleInputFocusChanged);
    _scrollCtrl.addListener(_handleScroll);
    _threadId = widget.threadId;
    _scene = _normalizeScene(widget.initialScene);
    _loadHistory();
  }

  @override
  void dispose() {
    _input.removeListener(_handleInputChanged);
    _inputFocus.removeListener(_handleInputFocusChanged);
    _scrollCtrl.removeListener(_handleScroll);
    _input.dispose();
    _inputFocus.dispose();
    _scrollCtrl.dispose();
    TtsService.stop();
    super.dispose();
  }

  bool get _busy => _loadingHistory || _sending || _detecting;

  bool get _canSend => !_busy && _hasDraft;

  void _handleInputChanged() {
    final next = _input.text.trim().isNotEmpty;
    if (!mounted || next == _hasDraft) return;
    setState(() => _hasDraft = next);
  }

  void _handleInputFocusChanged() {
    if (!_inputFocus.hasFocus) return;
    _scrollToBottom(animate: true, force: true);
    Future<void>.delayed(const Duration(milliseconds: 260), () {
      if (mounted && _inputFocus.hasFocus) {
        _scrollToBottom(animate: true, force: true);
      }
    });
  }

  void _handleScroll() {
    if (!_scrollCtrl.hasClients) return;
    _stickToBottom = _isNearBottom();
  }

  bool _isNearBottom() {
    if (!_scrollCtrl.hasClients) return true;
    final position = _scrollCtrl.position;
    if (!position.hasContentDimensions) return true;
    return position.maxScrollExtent - position.pixels <= 96;
  }

  Future<void> _loadHistory() async {
    if (_threadId == null) {
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(
          fromUser: false,
          text: '您好，我是您的智能农技助手。可以问我政策、农技、病虫害、行情等问题，也可以点击「+」上传图片让我识别。',
          scene: _scene,
        ));
        _loadingHistory = false;
      });
      _requestInputFocus();
      return;
    }

    try {
      final data = await ApiClient.get('/ai/qa/threads/$_threadId');
      final records = _recordsOf(data);
      if (!mounted) return;
      if (records.isEmpty) {
        setState(() {
          _loadingHistory = false;
          _messages.add(_ChatMessage(
            fromUser: false,
            text: '这条对话暂时不可用，请返回列表重新选择。',
            scene: _scene,
          ));
        });
        _requestInputFocus();
        return;
      }

      final list = <_ChatMessage>[];
      for (final record in records) {
        final scene = _normalizeScene(record['scene']);
        final question = _text(record['question']);
        final answer = _text(record['answer']);
        final createdAt = _date(record['createdAt']);
        final detect = _detectResultFromRecord(record);
        final imageUrl = _detectImageUrlFromRecord(record);
        if (question.isNotEmpty) {
          list.add(_ChatMessage(
            fromUser: true,
            text: question,
            scene: scene,
            createdAt: createdAt,
            imageUrl: imageUrl,
          ));
        }
        if (answer.isNotEmpty || detect != null) {
          list.add(_ChatMessage(
            fromUser: false,
            text: detect?.summaryText ?? answer,
            scene: scene,
            detect: detect,
            createdAt: createdAt,
          ));
        }
      }
      if (list.isEmpty) {
        list.add(_ChatMessage(
          fromUser: false,
          text: '这条对话暂无可展示内容，可以继续提问。',
          scene: _scene,
        ));
      }
      final first = records.first;
      setState(() {
        _scene = _normalizeScene(first['scene']);
        _messages
          ..clear()
          ..addAll(list);
        _loadingHistory = false;
      });
      _scrollToBottom(animate: false, force: true);
      _requestInputFocus();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingHistory = false;
        _messages.add(_ChatMessage(
          fromUser: false,
          text: '您好，我是您的智能农技助手。可以问我政策、农技、病虫害、行情等问题，也可以点击「+」上传图片让我识别。',
          scene: _scene,
        ));
      });
      _scrollToBottom(animate: false, force: true);
      _requestInputFocus();
    }
  }

  Future<void> _send() async {
    final question = _input.text.trim();
    if (question.isEmpty || _busy) return;
    final animateScroll = _animateNextOutgoingScroll();
    _input.clear();
    setState(() {
      _messages.add(_ChatMessage(
        fromUser: true,
        text: question,
        scene: _scene,
      ));
      _messages.add(_ChatMessage(
        fromUser: false,
        text: _thinkingText,
        scene: _scene,
        streaming: true,
      ));
      _sending = true;
      _stickToBottom = true;
    });
    _scrollToBottom(animate: animateScroll, force: true);

    var buffer = '';
    int? newThreadId;
    try {
      final body = {
        'scene': _scene.toLowerCase(),
        'question': question,
        if (_threadId != null) 'threadId': _threadId,
        'stream': true,
      };
      await for (final event in ApiClient.streamEvents('/ai/chat', body)) {
        if (event.type == 'done') {
          final data = event.data;
          if (data is Map) newThreadId = _int(data['threadId']);
          break;
        }
        if (event.type != 'message') continue;
        final data = event.data;
        final delta = data is Map && data['delta'] is String
            ? data['delta'] as String
            : data is String
                ? data
                : '';
        if (delta.isEmpty) continue;
        buffer += delta;
        if (!mounted) return;
        setState(() {
          _messages[_messages.length - 1] =
              _messages.last.copyWith(text: buffer);
        });
        _scrollToBottom(animate: animateScroll);
      }
      if (!mounted) return;
      setState(() {
        final finalText = buffer.trim().isEmpty ? _emptyAnswerText : buffer;
        _messages[_messages.length - 1] =
            _messages.last.copyWith(text: finalText, streaming: false);
        // 首次发送后服务端返回 threadId：仅在内部记录，供后续消息复用。
        // 不调 context.go('/ai/chat/:id') 重新导航——那会重建本页、重放
        // 进入转场并重新拉取历史（表现为「第一次发消息后页面又滑入一次」）。
        if (_threadId == null && newThreadId != null && newThreadId > 0) {
          _threadId = newThreadId;
        }
      });
      _scrollToBottom(animate: animateScroll);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (_messages.isNotEmpty) {
          _messages[_messages.length - 1] = _ChatMessage(
            fromUser: false,
            text: serviceUnavailableMessage,
            scene: _scene,
          );
        }
      });
      toast(context, actionErrorMessage('问答', e), error: true);
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _requestInputFocus();
      }
    }
  }

  Future<void> _deleteCurrentThread() async {
    // 用 _threadId 而非 widget.threadId：新建会话首次发送后线程在本页内
    // 建立（不再重新导航），此时 widget.threadId 仍为 null。
    final id = _threadId;
    if (id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除此对话'),
        content: const Text('确定删除这条 AI 对话吗？此操作不可恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              '删除',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiClient.delete('/ai/qa/threads/$id');
      if (!mounted) return;
      toast(context, '已删除此对话');
      context.go('/ai');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('删除', e), error: true);
    }
  }

  void _openPlusSheet() {
    if (_busy) return;
    _inputFocus.unfocus();
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.outlineVariant,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 10),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined,
                  color: AppColors.primary),
              title: const Text('拍照识别'),
              subtitle: const Text('叶片 / 茎秆 / 果实病害实时识别'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndDetect(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppColors.secondary),
              title: const Text('从相册上传'),
              subtitle: const Text('选择已有田间照片进行智能诊断'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndDetect(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.mic_none_outlined,
                  color: AppColors.tertiary),
              title: const Text('语音输入'),
              subtitle: const Text('说出问题，自动转写到输入框'),
              onTap: () {
                Navigator.pop(ctx);
                _startVoiceInput();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _startVoiceInput() async {
    if (_busy) return;
    final text = await VoiceInput.listen(context);
    if (text == null || text.isEmpty || !mounted) return;
    // 回填到输入框，由用户确认后再发送（不自动发送）。
    final existing = _input.text.trimRight();
    final next = existing.isEmpty ? text : '$existing $text';
    _input.text = next;
    _input.selection = TextSelection.collapsed(offset: next.length);
    _requestInputFocus();
  }

  Future<void> _toggleSpeak(String id, String text) async {
    if (TtsService.speakingId == id || _ttsPendingId == id) {
      await TtsService.stop();
      if (mounted) setState(() => _ttsPendingId = null);
      return;
    }
    setState(() => _ttsPendingId = id);
    final started = await TtsService.speak(text, id: id);
    if (!mounted) return;
    setState(() {
      if (_ttsPendingId == id) _ttsPendingId = null;
    });
    if (!started) {
      toast(context, '语音播报暂时不可用，请稍后重试', error: true);
    }
  }

  Future<void> _pickAndDetect(ImageSource source) async {
    if (_busy) return;
    Timer? waitTimer;
    int? botMessageIndex;
    setState(() => _detecting = true);
    _inputFocus.unfocus();
    try {
      final image = await _picker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 1600,
      );
      if (image == null) return;
      final bytes = await image.readAsBytes();
      if (!mounted) return;
      final animateScroll = _animateNextOutgoingScroll();
      setState(() {
        _messages.add(_ChatMessage(
          fromUser: true,
          text: '请识别这张图片',
          scene: _scene,
          image: bytes,
        ));
        _messages.add(_ChatMessage(
          fromUser: false,
          text: '正在识别图片内容...',
          subText: _detectWaitingText(0),
          scene: _scene,
          streaming: true,
        ));
        botMessageIndex = _messages.length - 1;
        _stickToBottom = true;
      });
      _scrollToBottom(animate: animateScroll, force: true);

      final startedAt = DateTime.now();
      waitTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted || botMessageIndex == null) return;
        final index = botMessageIndex!;
        if (index < 0 || index >= _messages.length) return;
        final elapsed = DateTime.now().difference(startedAt).inSeconds;
        setState(() {
          final current = _messages[index];
          if (!current.streaming) return;
          _messages[index] = current.copyWith(
            subText: _detectWaitingText(elapsed),
          );
        });
      });

      final data = await ApiClient.upload('/ai/image/detect', bytes, image.name)
          as Map<String, dynamic>;
      final result = _detectResultOf(data);
      final imageUrl = _text(data['imageUrl']);
      final saved = await ApiClient.post('/ai/qa/records/detect', body: {
        if (_threadId != null) 'threadId': _threadId,
        'question': '请识别这张图片',
        'answer': result.summaryText,
        'imageUrl': imageUrl,
        'modelUsed': _text(data['modelUsed'], fallback: 'platform-vision'),
        'detect': {
          ...result.toJson(),
          if (imageUrl.isNotEmpty) 'imageUrl': imageUrl,
        },
      }) as Map<String, dynamic>;
      final savedThreadId = _int(saved['threadId']);
      if (!mounted) return;
      setState(() {
        final index = botMessageIndex ?? _messages.length - 1;
        if (index >= 0 && index < _messages.length) {
          _messages[index] = _ChatMessage(
            fromUser: false,
            text: result.summaryText,
            scene: _scene,
            detect: result,
          );
        }
        // 同 _send：首次识别后服务端返回 threadId 仅在页内记录、不再导航，
        // 避免重建本页、重放进入转场并重新拉取历史。
        if (_threadId == null && savedThreadId > 0) {
          _threadId = savedThreadId;
        }
      });
      _scrollToBottom(animate: animateScroll);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        final index = botMessageIndex;
        if (index != null && index >= 0 && index < _messages.length) {
          _messages[index] = _ChatMessage(
            fromUser: false,
            text: '识别失败，请稍后再试。',
            scene: _scene,
          );
        }
      });
      toast(context, actionErrorMessage('识别', e), error: true);
    } finally {
      waitTimer?.cancel();
      if (mounted) {
        setState(() => _detecting = false);
        _requestInputFocus();
      }
    }
  }

  String _detectWaitingText(int seconds) {
    if (seconds >= 12) {
      return '已等待 ${seconds}s，本机视觉模型冷启动中，首次识图可能需要 2-3 分钟。';
    }
    return '已等待 ${seconds}s，视觉模型正在分析图片。';
  }

  void _askFollowUp(String question) {
    if (_busy) {
      toast(context, '请等待当前任务完成后再继续提问');
      return;
    }
    _input.text = question;
    _send();
  }

  bool _animateNextOutgoingScroll() {
    final animate = widget.threadId == null || _hasOutgoingMessage;
    _hasOutgoingMessage = true;
    return animate;
  }

  void _scrollToBottom({bool animate = true, bool force = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollCtrl.hasClients) return;
      if (!force && !_stickToBottom) return;
      final position = _scrollCtrl.position;
      if (!position.hasContentDimensions) return;
      final bottom = position.maxScrollExtent;
      if ((position.pixels - bottom).abs() < 1) return;
      if (animate) {
        _scrollCtrl.animateTo(
          bottom,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      } else {
        _scrollCtrl.jumpTo(bottom);
      }
    });
  }

  void _requestInputFocus() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_busy) _inputFocus.requestFocus();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => context.canPop() ? context.pop() : context.go('/ai'),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'AI 农技助手',
              style: TextStyle(
                color: AppColors.onSurface,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(height: 2),
            Row(
              children: [
                Icon(Icons.circle, size: 9, color: AppColors.primary),
                SizedBox(width: 6),
                Text(
                  '专家在线诊断',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: '历史记录',
            icon: const Icon(Icons.history, color: AppColors.onSurfaceVariant),
            onPressed: () => context.go('/ai'),
          ),
          IconButton(
            tooltip: '设置',
            icon: const Icon(Icons.tune_rounded,
                color: AppColors.onSurfaceVariant),
            onPressed: () => toast(context, 'AI 服务偏好已采用默认配置'),
          ),
          if (_threadId != null)
            IconButton(
              tooltip: '删除此对话',
              icon: const Icon(Icons.delete_outline, color: AppColors.error),
              onPressed: _deleteCurrentThread,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loadingHistory
                ? const Loading(text: '加载对话历史')
                : _messages.isEmpty
                    ? const EmptyView(
                        '和 AI 农技助手聊聊吧',
                        icon: Icons.smart_toy_outlined,
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _messages[i].fromUser
                              ? _userBubble(_messages[i])
                              : _botBubble(_messages[i], i),
                        ),
                      ),
          ),
          _inputBar(),
        ],
      ),
    );
  }

  Widget _inputBar() {
    final busy = _busy;
    final canSend = _canSend;
    return SafeArea(
      top: false,
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
        ),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            IconButton.filledTonal(
              onPressed: busy ? null : _openPlusSheet,
              icon: const Icon(Icons.add, size: 20),
              style: ButtonStyle(
                fixedSize: WidgetStateProperty.all(const Size(36, 36)),
                backgroundColor: WidgetStateProperty.resolveWith(
                  (states) => states.contains(WidgetState.disabled)
                      ? AppColors.surfaceHigh
                      : AppColors.surfaceLow,
                ),
                foregroundColor: WidgetStateProperty.resolveWith(
                  (states) => states.contains(WidgetState.disabled)
                      ? AppColors.outline
                      : AppColors.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _input,
                focusNode: _inputFocus,
                minLines: 1,
                maxLines: 4,
                enabled: !busy,
                textInputAction: TextInputAction.send,
                onTap: () => _scrollToBottom(animate: true, force: true),
                onSubmitted: (_) {
                  if (canSend) _send();
                },
                decoration: InputDecoration(
                  hintText: _inputHintText(),
                  isDense: true,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: AppColors.surfaceLow,
                  suffixIcon: IconButton(
                    tooltip: '语音输入',
                    onPressed: busy ? null : _startVoiceInput,
                    icon: Icon(
                      Icons.mic_none_outlined,
                      color:
                          busy ? AppColors.outlineVariant : AppColors.outline,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(999),
                    borderSide:
                        const BorderSide(color: AppColors.outlineVariant),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(999),
                    borderSide:
                        const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  disabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(999),
                    borderSide:
                        const BorderSide(color: AppColors.outlineVariant),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 40,
              height: 40,
              child: IconButton.filled(
                padding: EdgeInsets.zero,
                style: ButtonStyle(
                  backgroundColor: WidgetStateProperty.resolveWith(
                    (states) => states.contains(WidgetState.disabled)
                        ? AppColors.outlineVariant
                        : AppColors.primary,
                  ),
                  foregroundColor: WidgetStateProperty.all(Colors.white),
                ),
                icon: busy && (_sending || _detecting)
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.send_rounded, size: 19),
                onPressed: canSend ? _send : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _inputHintText() {
    if (_loadingHistory) return '正在加载对话...';
    if (_sending) return 'AI 正在回复中...';
    if (_detecting) return '正在处理图片识别...';
    if (_scene == 'GENERAL') return '描述问题或症状...';
    return '在「${_sceneLabel(_scene)}」场景下提问...';
  }

  Widget _botBubble(_ChatMessage msg, int index) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            color: AppColors.primaryContainer,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.smart_toy, color: Colors.white, size: 18),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: msg.detect == null
              ? _textBotBubble(msg, index)
              : _detectReportCard(msg.detect!),
        ),
      ],
    );
  }

  Widget _textBotBubble(_ChatMessage msg, int index) {
    // 点击 AI 文本回答气泡朗读，再次点击停止（不限适老模式，任何情况都可朗读）。
    final speakable = !msg.streaming && msg.text.trim().isNotEmpty;
    final ttsId = 'bot_$index';
    final bubble = _textBotBubbleBody(msg, speakable, ttsId);
    if (!speakable) return bubble;
    return GestureDetector(
      onTap: () => _toggleSpeak(ttsId, msg.text),
      child: bubble,
    );
  }

  Widget _textBotBubbleBody(_ChatMessage msg, bool speakable, String ttsId) {
    final speaking = speakable && TtsService.speakingId == ttsId;
    final preparing = speakable && _ttsPendingId == ttsId;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(4),
          topRight: Radius.circular(16),
          bottomLeft: Radius.circular(16),
          bottomRight: Radius.circular(16),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Flexible(
                child: MarkdownText(
                  msg.text.isEmpty ? ' ' : msg.text,
                  baseStyle: const TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
              if (msg.streaming) ...[
                const SizedBox(width: 4),
                const _StreamingCursor(),
              ],
            ],
          ),
          if (msg.subText != null && msg.subText!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              msg.subText!,
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
                height: 1.45,
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                _time(msg.createdAt),
                style: const TextStyle(color: AppColors.outline, fontSize: 11),
              ),
              if (speakable) ...[
                const Spacer(),
                Icon(
                  preparing
                      ? Icons.hourglass_empty_rounded
                      : speaking
                          ? Icons.stop_circle_outlined
                          : Icons.volume_up_outlined,
                  size: 15,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 4),
                Text(
                  preparing
                      ? '正在生成'
                      : speaking
                          ? '点按停止'
                          : '点按朗读',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _detectReportCard(_DetectResult result) {
    // 「无法识别」分支：去掉 VERIFIED 徽章 / 置信度 / 施药 CTA，避免「确信地说错」。
    if (!result.recognized) {
      return Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.md),
          border: Border.all(color: AppColors.outlineVariant, width: 1),
          boxShadow: AppColors.ambientShadow,
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Row(
              children: [
                Icon(Icons.help_outline,
                    color: AppColors.onSurfaceVariant, size: 18),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '智能识别 · 未能识别',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              result.advice.isEmpty
                  ? '当前未能从这张图中识别出明确的农作物病害特征。建议拍摄叶片正反面、茎秆和整株清晰照片后重试，或联系周边植保服务现场诊断。'
                  : result.advice,
              style: const TextStyle(
                fontSize: 13,
                height: 1.5,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _openPlusSheet(),
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('重新拍照识别'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.push('/machinery/service'),
                icon: const Icon(Icons.local_phone_outlined, size: 16),
                label: const Text('呼叫周边植保服务'),
              ),
            ),
          ],
        ),
      );
    }
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.primary, width: 1.5),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Row(
            children: [
              Icon(Icons.verified, color: AppColors.primary, size: 18),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  '智能植保诊断报告',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
              StatusChip('VERIFIED', color: AppColors.primary),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(R.sm),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    result.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      '诊断置信度',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      '${(result.confidence * 100).toStringAsFixed(1)}%',
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            result.advice.isEmpty
                ? '基于深度学习模型分析，识别完成。建议结合田间情况复核。'
                : '基于深度学习模型分析，${result.advice}',
            style: const TextStyle(
              fontSize: 13,
              height: 1.5,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          _detectFeedbackRow(result),
          const SizedBox(height: 12),
          const Row(
            children: [
              Icon(Icons.checklist_rounded,
                  color: AppColors.tertiary, size: 18),
              SizedBox(width: 6),
              Text(
                '推荐防治方案',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _askFollowUp(
                '请为「${result.name}」生成定制化的施药建议，包括剂量、时机和注意事项。',
              ),
              icon: const Icon(Icons.water_drop_outlined, size: 16),
              label: const Text('生成定制化施药建议'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.push('/machinery/service'),
              icon: const Icon(Icons.local_phone_outlined, size: 16),
              label: const Text('呼叫周边植保服务'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _detectFeedbackRow(_DetectResult result) => Row(
        children: [
          Expanded(
            child: _feedbackButton(
              result: result,
              feedback: 'correct',
              label: '准',
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _feedbackButton(
              result: result,
              feedback: 'incorrect',
              label: '不准',
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _feedbackButton(
              result: result,
              feedback: 'unsure',
              label: '? 不确定',
            ),
          ),
        ],
      );

  Widget _feedbackButton({
    required _DetectResult result,
    required String feedback,
    required String label,
  }) {
    final recordId = result.recordId;
    final sent = recordId == null ? null : _feedbackSent[recordId];
    final selected = sent == feedback;
    final enabled = recordId != null && sent == null;
    return SizedBox(
      height: 32,
      child: OutlinedButton(
        onPressed: enabled ? () => _sendDetectFeedback(result, feedback) : null,
        style: ButtonStyle(
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(horizontal: 8),
          ),
          minimumSize: WidgetStateProperty.all(const Size(0, 32)),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          ),
          side: WidgetStateProperty.resolveWith(
            (_) => BorderSide(
              color: selected ? AppColors.primary : AppColors.outlineVariant,
              width: selected ? 1.4 : 1,
            ),
          ),
          backgroundColor: WidgetStateProperty.all(
            selected
                ? AppColors.primaryContainer.withValues(alpha: 0.12)
                : AppColors.surface,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (_) => selected ? AppColors.primary : AppColors.onSurfaceVariant,
          ),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Future<void> _sendDetectFeedback(
    _DetectResult result,
    String feedback,
  ) async {
    final recordId = result.recordId;
    if (recordId == null || _feedbackSent.containsKey(recordId)) return;
    setState(() => _feedbackSent[recordId] = feedback);
    try {
      await ApiClient.post('/ai/detect-feedback', body: {
        'recordId': recordId,
        'feedback': feedback,
      });
      if (!mounted) return;
      toast(context, '感谢反馈：${_feedbackLabel(feedback)}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedbackSent.remove(recordId));
      toast(context, actionErrorMessage('反馈', e), error: true);
    }
  }

  String _feedbackLabel(String feedback) {
    switch (feedback) {
      case 'correct':
        return '准';
      case 'incorrect':
        return '不准';
      case 'unsure':
        return '不确定';
      default:
        return feedback;
    }
  }

  Widget _userBubble(_ChatMessage msg) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Flexible(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(4),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_bubbleImageProvider(msg) != null) ...[
                  GestureDetector(
                    onTap: () => _showImagePreview(_bubbleImageProvider(msg)!),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(R.sm),
                      child: Image(
                        image: _bubbleImageProvider(msg)!,
                        width: 160,
                        height: 160,
                        fit: BoxFit.cover,
                        loadingBuilder: (context, child, progress) {
                          if (progress == null) return child;
                          return _imagePlaceholder(
                            const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            ),
                          );
                        },
                        errorBuilder: (_, __, ___) => _imagePlaceholder(
                          const Icon(Icons.broken_image_outlined,
                              color: Colors.white70, size: 28),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  msg.text,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _time(msg.createdAt),
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.secondary.withValues(alpha: 0.2),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.person, color: AppColors.secondary, size: 18),
        ),
      ],
    );
  }

  /// 用户气泡里的图片来源：实时发送用内存字节（Image.memory），
  /// 历史回显用后端 URL（Image.network）。
  ImageProvider? _bubbleImageProvider(_ChatMessage msg) {
    if (msg.image != null) return MemoryImage(msg.image!);
    final url = msg.imageUrl;
    if (url != null && url.isNotEmpty) return NetworkImage(url);
    return null;
  }

  Widget _imagePlaceholder(Widget child) => Container(
        width: 160,
        height: 160,
        color: Colors.black.withValues(alpha: 0.18),
        alignment: Alignment.center,
        child: child,
      );

  void _showImagePreview(ImageProvider provider) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      barrierDismissible: true,
      builder: (dialogContext) => Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            Positioned.fill(
              child: InteractiveViewer(
                minScale: 0.8,
                maxScale: 5,
                child: Center(
                  child: Image(image: provider, fit: BoxFit.contain),
                ),
              ),
            ),
            Positioned(
              top: 40,
              right: 16,
              child: IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: Colors.black.withValues(alpha: 0.45),
                ),
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(dialogContext),
              ),
            ),
          ],
        ),
      ),
    );
  }

  _DetectResult _detectResultOf(Map<String, dynamic> data) {
    final nested = data['result'];
    final result =
        nested is Map ? nested.map((k, v) => MapEntry('$k', v)) : data;
    final recordId = _int(data['recordId'] ?? result['recordId']);
    final name = _text(
      result['resultLabel'] ?? result['name'],
      fallback: '无法识别',
    );
    final confidence = _double(result['confidence']);
    final advice = _text(result['adviceText'] ?? result['advice']);
    final mode = _text(data['serviceMode'] ?? result['mode'], fallback: '智能识别');
    // 是否「真识别出来了」：后端 recognized 字段优先；缺省时根据 name/confidence 推断。
    // 不再无脑把 0 置信度兜到 0.8——那会让「无法识别」也披着 80% 的 VERIFIED 外衣（导致香蕉→番茄缺镁症 81% 的 bug）。
    final recognizedFlag = result['recognized'];
    final recognized = recognizedFlag is bool
        ? recognizedFlag
        : (name != '无法识别' && name != '未识别' && confidence > 0);
    return _DetectResult(
      recordId: recordId > 0 ? recordId : null,
      name: name,
      confidence: recognized ? (confidence <= 0 ? 0.8 : confidence) : 0,
      advice: advice,
      mode: mode,
      recognized: recognized,
    );
  }

  _DetectResult? _detectResultFromRecord(Map<String, dynamic> record) {
    final refs = _jsonMap(record['referencesJson']);
    final detect = refs['detect'];
    if (detect is Map) {
      return _detectResultOf(detect.map((k, v) => MapEntry('$k', v)));
    }
    return null;
  }

  /// 从历史记录里取出识图时上传的图片 URL（与 ai_threads_page 列表页同口径）：
  /// referencesJson.imageUrl → referencesJson.detect.imageUrl → record.imageUrl，
  /// 解析为绝对地址供 Image.network 加载。无图返回 null。
  String? _detectImageUrlFromRecord(Map<String, dynamic> record) {
    final refs = _jsonMap(record['referencesJson']);
    var url = _text(refs['imageUrl']);
    final detect = refs['detect'];
    if (url.isEmpty && detect is Map) {
      url = _text(detect['imageUrl']);
    }
    if (url.isEmpty) url = _text(record['imageUrl']);
    if (url.isEmpty) return null;
    return ApiClient.resolveImageUrl(url);
  }

  String _sceneLabel(String scene) {
    switch (scene) {
      case 'AGRI':
        return '农技';
      case 'POLICY':
        return '政策';
      case 'LEGAL':
        return '法律';
      default:
        return '综合';
    }
  }

  String _normalizeScene(dynamic value) {
    final scene = _text(value, fallback: 'GENERAL').toUpperCase();
    if (scene == 'AGRI' || scene == 'POLICY' || scene == 'LEGAL') return scene;
    return 'GENERAL';
  }

  static List<Map<String, dynamic>> _recordsOf(dynamic value) {
    final map = value is Map ? value.map((k, v) => MapEntry('$k', v)) : {};
    final records = map['records'];
    if (records is List) {
      return records
          .whereType<Map>()
          .map((item) => item.map((k, v) => MapEntry('$k', v)))
          .toList();
    }
    return [];
  }

  static DateTime _date(dynamic value) =>
      DateTime.tryParse(_text(value)) ?? DateTime.now();

  static int _int(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  static double _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse('$value') ?? 0;
  }

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static Map<String, dynamic> _jsonMap(dynamic value) {
    if (value is Map) return value.map((k, v) => MapEntry('$k', v));
    if (value is String && value.trim().isNotEmpty) {
      try {
        final parsed = jsonDecode(value);
        if (parsed is Map) return parsed.map((k, v) => MapEntry('$k', v));
      } catch (_) {}
    }
    return {};
  }

  static String _time(DateTime value) => DateFormat('HH:mm').format(value);
}

class _StreamingCursor extends StatefulWidget {
  const _StreamingCursor();

  @override
  State<_StreamingCursor> createState() => _StreamingCursorState();
}

class _StreamingCursorState extends State<_StreamingCursor>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _controller,
      child: Container(
        width: 6,
        height: 14,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }
}

class _ChatMessage {
  final bool fromUser;
  final String text;
  final String? subText;
  final String? scene;
  final Uint8List? image;
  final String? imageUrl;
  final _DetectResult? detect;
  final bool streaming;
  final DateTime createdAt;

  _ChatMessage({
    required this.fromUser,
    required this.text,
    this.subText,
    this.scene,
    this.image,
    this.imageUrl,
    this.detect,
    this.streaming = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  _ChatMessage copyWith({String? text, String? subText, bool? streaming}) =>
      _ChatMessage(
        fromUser: fromUser,
        text: text ?? this.text,
        subText: subText ?? this.subText,
        scene: scene,
        image: image,
        imageUrl: imageUrl,
        detect: detect,
        streaming: streaming ?? this.streaming,
        createdAt: createdAt,
      );
}

class _DetectResult {
  final int? recordId;
  final String name;
  final double confidence;
  final String advice;
  final String mode;
  final bool recognized;

  const _DetectResult({
    this.recordId,
    required this.name,
    required this.confidence,
    required this.advice,
    required this.mode,
    this.recognized = true,
  });

  Map<String, dynamic> toJson() => {
        if (recordId != null) 'recordId': recordId,
        'name': name,
        'confidence': confidence,
        'advice': advice,
        'mode': mode,
        'recognized': recognized,
      };

  String get summaryText {
    if (!recognized) {
      return advice.isEmpty
          ? '识别结果：无法识别。建议重新拍摄清晰照片后再试。'
          : '识别结果：无法识别。\n\n$advice';
    }
    final confidenceText = '可信度 ${(confidence * 100).round()}%';
    if (advice.isEmpty) return '识别结果：$name（$confidenceText）';
    return '识别结果：$name（$confidenceText）\n\n$advice';
  }
}
