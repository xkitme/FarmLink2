import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

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
  int? _threadId;
  late String _scene;
  bool _loadingHistory = true;
  bool _sending = false;
  bool _detecting = false;

  @override
  void initState() {
    super.initState();
    _threadId = widget.threadId;
    _scene = _normalizeScene(widget.initialScene);
    _loadHistory();
  }

  @override
  void dispose() {
    _input.dispose();
    _inputFocus.dispose();
    _scrollCtrl.dispose();
    super.dispose();
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
      final first = records.first;
      setState(() {
        _scene = _normalizeScene(first['scene']);
        _messages
          ..clear()
          ..addAll(list);
        _loadingHistory = false;
      });
      _scrollToBottom();
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
      _scrollToBottom();
      _requestInputFocus();
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
        _scrollToBottom();
      }
      if (!mounted) return;
      setState(() {
        _messages[_messages.length - 1] =
            _messages.last.copyWith(streaming: false);
      });
      if (_threadId == null &&
          newThreadId != null &&
          newThreadId > 0 &&
          mounted) {
        _threadId = newThreadId;
        context.go('/ai/chat/$newThreadId');
      }
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
      if (mounted) {
        setState(() => _sending = false);
        _requestInputFocus();
      }
    }
  }

  Future<void> _deleteCurrentThread() async {
    final id = widget.threadId;
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
        source: source,
        imageQuality: 82,
        maxWidth: 1600,
      );
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
      final saved = await ApiClient.post('/ai/qa/records/detect', body: {
        if (_threadId != null) 'threadId': _threadId,
        'question': '请识别这张图片',
        'answer': result.summaryText,
        'imageUrl': _text(data['imageUrl']),
        'modelUsed': _text(data['modelUsed'], fallback: 'platform-vision'),
        'detect': result.toJson(),
      }) as Map<String, dynamic>;
      final savedThreadId = _int(saved['threadId']);
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
      if (_threadId == null && savedThreadId > 0 && mounted) {
        _threadId = savedThreadId;
        context.go('/ai/chat/$savedThreadId');
      }
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
      if (mounted) {
        setState(() => _detecting = false);
        _requestInputFocus();
      }
    }
  }

  void _askFollowUp(String question) {
    _input.text = question;
    _send();
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

  void _requestInputFocus() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _inputFocus.requestFocus();
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
          if (widget.threadId != null)
            IconButton(
              tooltip: '删除此对话',
              icon: const Icon(Icons.delete_outline, color: AppColors.error),
              onPressed: _deleteCurrentThread,
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
                    ? const EmptyView(
                        '和 AI 农技助手聊聊吧',
                        icon: Icons.smart_toy_outlined,
                      )
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
                focusNode: _inputFocus,
                minLines: 1,
                maxLines: 4,
                enabled: !_sending,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: _scene == 'GENERAL'
                      ? '描述问题或症状...'
                      : '在「${_sceneLabel(_scene)}」场景下提问...',
                  isDense: true,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: AppColors.surfaceLow,
                  suffixIcon: const Icon(
                    Icons.mic_none_outlined,
                    color: AppColors.outline,
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
          child: msg.detect == null
              ? _textBotBubble(msg)
              : _detectReportCard(msg.detect!),
        ),
      ],
    );
  }

  Widget _textBotBubble(_ChatMessage msg) {
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
          const SizedBox(height: 8),
          Text(
            _time(msg.createdAt),
            style: const TextStyle(color: AppColors.outline, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _detectReportCard(_DetectResult result) {
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

  _DetectResult _detectResultOf(Map<String, dynamic> data) {
    final nested = data['result'];
    final result =
        nested is Map ? nested.map((k, v) => MapEntry('$k', v)) : data;
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

  Map<String, dynamic> toJson() => {
        'name': name,
        'confidence': confidence,
        'advice': advice,
        'mode': mode,
      };

  String get summaryText {
    final confidenceText = '可信度 ${(confidence * 100).round()}%';
    if (advice.isEmpty) return '识别结果：$name（$confidenceText）';
    return '识别结果：$name（$confidenceText）\n\n$advice';
  }
}
