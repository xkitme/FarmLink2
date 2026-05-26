import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class AiPage extends StatefulWidget {
  const AiPage({super.key});

  @override
  State<AiPage> createState() => _AiPageState();
}

class _AiPageState extends State<AiPage> {
  final _input = TextEditingController();
  final _picker = ImagePicker();
  final _scrollCtrl = ScrollController();

  final List<_ChatMessage> _messages = [];
  String _scene = 'GENERAL';
  bool _loadingHistory = true;
  bool _sending = false;
  bool _detecting = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _input.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final data = await ApiClient.get('/ai/qa/records',
          query: {'pageNum': 1, 'pageSize': 20});
      final page = _map(data);
      final records = _list(page['records']);
      final list = <_ChatMessage>[];
      for (final record in records.reversed) {
        final scene = _normalizeScene(record['scene']);
        final createdAt = _date(record['createdAt']);
        final question = _text(record['question']);
        final answer = _text(record['answer']);
        if (question.isNotEmpty) {
          list.add(_ChatMessage(
            fromUser: true,
            text: question,
            scene: scene,
            createdAt: createdAt,
          ));
        }
        if (answer.isNotEmpty) {
          list.add(_ChatMessage(
            fromUser: false,
            text: answer,
            scene: scene,
            createdAt: createdAt,
          ));
        }
      }
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(list);
        _loadingHistory = false;
      });
      _scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingHistory = false;
        if (_messages.isEmpty) {
          _messages.add(_ChatMessage(
            fromUser: false,
            text: '您好，我是您的智能农技助手。可以问我政策、农技、病虫害、行情等问题，也可以点击「+」上传图片让我识别。',
            scene: _scene,
          ));
        }
      });
      _scrollToBottom();
    }
  }

  Future<void> _send() async {
    final question = _input.text.trim();
    if (question.isEmpty || _sending) return;
    _input.clear();
    setState(() {
      _messages.add(_ChatMessage(
        fromUser: true,
        text: question,
        scene: _scene,
      ));
      _messages.add(_ChatMessage(
        fromUser: false,
        text: '',
        scene: _scene,
        streaming: true,
      ));
      _sending = true;
    });
    _scrollToBottom();

    var buffer = '';
    try {
      final stream = ApiClient.stream('/ai/chat', {
        'scene': _scene.toLowerCase(),
        'question': question,
        'stream': true,
      });
      await for (final chunk in stream) {
        final delta = _deltaOf(chunk);
        if (delta.isEmpty) continue;
        buffer += delta;
        if (!mounted) return;
        setState(() {
          _messages[_messages.length - 1] =
              _messages.last.copyWith(text: buffer);
        });
        _scrollToBottom();
      }
      if (!mounted) return;
      setState(() {
        _messages[_messages.length - 1] =
            _messages.last.copyWith(streaming: false);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages[_messages.length - 1] = _ChatMessage(
          fromUser: false,
          text: serviceUnavailableMessage,
          scene: _scene,
        );
      });
      toast(context, actionErrorMessage('问答', e), error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _openPlusSheet() {
    showModalBottomSheet<void>(
      context: context,
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
            const ListTile(
              enabled: false,
              leading: Icon(Icons.mic_none_outlined, color: AppColors.outline),
              title: Text('语音输入'),
              subtitle: Text('准备中'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndDetect(ImageSource source) async {
    if (_detecting || _sending) return;
    try {
      final image = await _picker.pickImage(
          source: source, imageQuality: 82, maxWidth: 1600);
      if (image == null) return;
      final bytes = await image.readAsBytes();
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(
          fromUser: true,
          text: '请识别这张图片',
          scene: _scene,
          image: bytes,
        ));
        _messages.add(_ChatMessage(
          fromUser: false,
          text: '识别中...',
          scene: _scene,
          streaming: true,
        ));
        _detecting = true;
      });
      _scrollToBottom();

      final data = await ApiClient.upload('/ai/image/detect', bytes, image.name)
          as Map<String, dynamic>;
      final result = _detectResultOf(data);
      if (!mounted) return;
      setState(() {
        _messages[_messages.length - 1] = _ChatMessage(
          fromUser: false,
          text: result.summaryText,
          scene: _scene,
          detect: result,
        );
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages[_messages.length - 1] = _ChatMessage(
          fromUser: false,
          text: '识别失败，请稍后再试。',
          scene: _scene,
        );
      });
      toast(context, actionErrorMessage('识别', e), error: true);
    } finally {
      if (mounted) setState(() => _detecting = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOut,
      );
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
        title: const Text(
          'AI 农技助手',
          style: TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            tooltip: '清空对话',
            icon: const Icon(Icons.delete_sweep_outlined,
                color: AppColors.onSurfaceVariant),
            onPressed: _messages.isEmpty
                ? null
                : () => setState(() => _messages.clear()),
          ),
        ],
      ),
      body: Column(
        children: [
          _sceneBar(),
          Expanded(
            child: _loadingHistory
                ? const Loading(text: '加载对话历史')
                : _messages.isEmpty
                    ? const EmptyView('和 AI 农技助手聊聊吧',
                        icon: Icons.smart_toy_outlined)
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _messages[i].fromUser
                              ? _userBubble(_messages[i])
                              : _botBubble(_messages[i]),
                        ),
                      ),
          ),
          _inputBar(),
        ],
      ),
    );
  }

  Widget _sceneBar() {
    const scenes = [
      ('GENERAL', '综合'),
      ('AGRI', '农技'),
      ('POLICY', '政策'),
      ('LEGAL', '法律'),
    ];
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final scene in scenes)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(scene.$2),
                  selected: _scene == scene.$1,
                  selectedColor:
                      AppColors.primaryContainer.withValues(alpha: 0.16),
                  onSelected: (_) => setState(() => _scene = scene.$1),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _inputBar() {
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
              onPressed: _detecting || _sending ? null : _openPlusSheet,
              icon: const Icon(Icons.add, size: 20),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.surfaceLow,
                foregroundColor: AppColors.onSurfaceVariant,
                fixedSize: const Size(36, 36),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _input,
                minLines: 1,
                maxLines: 4,
                enabled: !_sending,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: _scene == 'GENERAL'
                      ? '向 AI 助手提问...'
                      : '在「${_sceneLabel(_scene)}」场景下提问...',
                  isDense: true,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: AppColors.surfaceLow,
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
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 40,
              height: 40,
              child: IconButton.filled(
                padding: EdgeInsets.zero,
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                icon: _sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.send_rounded, size: 19),
                onPressed: _sending ? null : _send,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _botBubble(_ChatMessage msg) {
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
          child: Container(
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
                      child: Text(
                        msg.text.isEmpty ? ' ' : msg.text,
                        style: const TextStyle(
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
                if (msg.detect != null) ...[
                  const SizedBox(height: 10),
                  _resultChip(
                    '${msg.detect!.mode} · 可信度 ${(msg.detect!.confidence * 100).round()}%',
                    AppColors.primary,
                    AppColors.primaryContainer.withValues(alpha: 0.14),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  _time(msg.createdAt),
                  style:
                      const TextStyle(color: AppColors.outline, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      ],
    );
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
                if (msg.image != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(R.sm),
                    child: Image.memory(
                      msg.image!,
                      width: 160,
                      height: 160,
                      fit: BoxFit.cover,
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

  Widget _resultChip(String text, Color fg, Color bg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 12, color: fg),
        ),
      );

  _DetectResult _detectResultOf(Map<String, dynamic> data) {
    final nested = data['result'];
    final result = nested is Map ? nested.cast<String, dynamic>() : data;
    final name = _text(
      result['resultLabel'] ?? result['name'],
      fallback: '未识别',
    );
    final confidence = _double(result['confidence']);
    final advice = _text(result['adviceText'] ?? result['advice']);
    final mode = _text(data['serviceMode'] ?? result['mode'], fallback: '智能识别');
    return _DetectResult(
      name: name,
      confidence: confidence <= 0 ? 0.8 : confidence,
      advice: advice,
      mode: mode,
    );
  }

  String _deltaOf(String chunk) {
    try {
      final parsed = jsonDecode(chunk);
      if (parsed is Map && parsed['delta'] is String) {
        return parsed['delta'] as String;
      }
      return '';
    } catch (_) {
      return chunk;
    }
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

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map) return value.map((k, v) => MapEntry('$k', v));
    return {};
  }

  static List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map((item) => _map(item)).toList();
    }
    return [];
  }

  static DateTime _date(dynamic value) {
    return DateTime.tryParse(_text(value)) ?? DateTime.now();
  }

  static double _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse('$value') ?? 0;
  }

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
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
  final String? scene;
  final Uint8List? image;
  final _DetectResult? detect;
  final bool streaming;
  final DateTime createdAt;

  _ChatMessage({
    required this.fromUser,
    required this.text,
    this.scene,
    this.image,
    this.detect,
    this.streaming = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  _ChatMessage copyWith({String? text, bool? streaming}) => _ChatMessage(
        fromUser: fromUser,
        text: text ?? this.text,
        scene: scene,
        image: image,
        detect: detect,
        streaming: streaming ?? this.streaming,
        createdAt: createdAt,
      );
}

class _DetectResult {
  final String name;
  final double confidence;
  final String advice;
  final String mode;

  const _DetectResult({
    required this.name,
    required this.confidence,
    required this.advice,
    required this.mode,
  });

  String get summaryText {
    final confidenceText = '可信度 ${(confidence * 100).round()}%';
    if (advice.isEmpty) return '识别结果：$name（$confidenceText）';
    return '识别结果：$name（$confidenceText）\n\n$advice';
  }
}
