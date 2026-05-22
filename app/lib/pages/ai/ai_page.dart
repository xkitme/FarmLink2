import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

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
  final List<_ChatMessage> _messages = [
    const _ChatMessage(
      fromUser: false,
      text:
          '您好，我是您的本地农技助手。离线环境下，我会优先使用 SQLite 知识库和本地规则兜底；如果 Ollama 已启动，就会调用本地模型增强回答。',
    ),
    const _ChatMessage(
      fromUser: true,
      text: '最近几天要暴雨，玉米地刚施完肥，需要做防护吗？',
    ),
    const _ChatMessage(
      fromUser: false,
      text: '建议先疏通田间排水沟，雨后及时查苗。如果肥料被冲刷，可根据苗情少量追施速效肥，并留意雨后高温潮湿引发的病害。',
    ),
  ];

  bool _asking = false;
  bool _detecting = false;
  Uint8List? _pickedImage;
  _DetectResult? _detectResult;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _chooseImageSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined,
                    color: AppColors.primary),
                title: const Text('拍照识别'),
                subtitle: const Text('适合现场叶片、茎秆、果实病害'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined,
                    color: AppColors.secondary),
                title: const Text('上传图片'),
                subtitle: const Text('选择已有田间照片进行本地诊断'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) return;
    await _pickAndDetect(source);
  }

  Future<void> _pickAndDetect(ImageSource source) async {
    try {
      final image = await _picker.pickImage(
          source: source, imageQuality: 82, maxWidth: 1600);
      if (image == null) return;
      final bytes = await image.readAsBytes();
      if (!mounted) return;
      setState(() {
        _pickedImage = bytes;
        _detecting = true;
        _detectResult = null;
      });

      final data = await ApiClient.upload(
        '/agri/disease/detect',
        bytes,
        image.name,
        fields: const {'cropType': '苹果'},
      ) as Map<String, dynamic>;

      final disease = data['disease'];
      final diseaseMap = disease is Map
          ? disease.cast<String, dynamic>()
          : <String, dynamic>{};
      final confidence = (data['confidence'] as num?)?.toDouble() ?? 0.0;
      final name =
          '${diseaseMap['diseaseName'] ?? data['resultLabel'] ?? '疑似病害'}';
      final advice =
          '${diseaseMap['prevention'] ?? diseaseMap['medicineAdvice'] ?? '建议结合田间湿度、叶片正反面和近期用药情况复核。'}';

      if (!mounted) return;
      setState(() {
        _detectResult = _DetectResult(
          name: name,
          confidence: confidence,
          advice: advice,
          mode: '本地离线规则识别',
        );
      });
    } catch (e) {
      if (!mounted) return;
      toast(context, '识别失败：$e', error: true);
    } finally {
      if (mounted) setState(() => _detecting = false);
    }
  }

  Future<void> _ask() async {
    final question = _input.text.trim();
    if (question.isEmpty || _asking) return;
    setState(() {
      _messages.add(_ChatMessage(fromUser: true, text: question));
      _asking = true;
    });
    _input.clear();

    try {
      final data = await ApiClient.post('/ai/chat', body: {
        'scene': 'AGRI',
        'question': question,
      }) as Map<String, dynamic>;
      final answer = '${data['answer'] ?? '本地知识库已收到问题，但暂无更完整答案。'}';
      final mode = '${data['mode'] ?? 'local'}';
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(
          fromUser: false,
          text: '$answer\n\n来源：$mode',
        ));
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add(const _ChatMessage(
          fromUser: false,
          text:
              '当前问答接口不可用。离线运行时请确认后端已启动，并已登录账号；Ollama 未启动时后端仍会用 SQLite RAG 和本地规则兜底。',
        ));
      });
      toast(context, '问答失败：$e', error: true);
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        children: [
          _diagnosisCard(),
          const SizedBox(height: 24),
          _chatCard(),
        ],
      ),
    );
  }

  Widget _diagnosisCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.gold),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.center_focus_strong,
                  color: AppColors.primary, size: 22),
              SizedBox(width: 8),
              Text(
                '智能识病',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            '拍照或上传作物叶片，后端会在本机完成识别记录、知识库匹配与防治建议生成。',
            style: TextStyle(fontSize: 16, color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _detecting ? null : _chooseImageSource,
            borderRadius: BorderRadius.circular(R.md),
            child: Container(
              height: 132,
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(R.md),
                border: Border.all(color: AppColors.outlineVariant, width: 2),
              ),
              child: _pickedImage == null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _detecting
                              ? Icons.hourglass_top_rounded
                              : Icons.add_a_photo_outlined,
                          size: 30,
                          color: AppColors.outline,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _detecting ? '正在本地识别...' : '点击拍照或上传图片',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    )
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(R.md - 2),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.memory(_pickedImage!, fit: BoxFit.cover),
                          if (_detecting)
                            Container(
                              color: Colors.black.withValues(alpha: 0.25),
                              child: const Center(
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 16),
          _diagnosisResultCard(),
        ],
      ),
    );
  }

  Widget _diagnosisResultCard() {
    final result = _detectResult;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.surfaceHigh),
      ),
      padding: const EdgeInsets.all(8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(R.sm),
            child: _pickedImage == null
                ? Image.asset(
                    'assets/images/ai_1.jpg',
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 80,
                      height: 80,
                      color: AppColors.surfaceHigh,
                      child: const Icon(Icons.eco,
                          color: AppColors.primary, size: 32),
                    ),
                  )
                : Image.memory(_pickedImage!,
                    width: 80, height: 80, fit: BoxFit.cover),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const SizedBox(
                      width: 8,
                      height: 8,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      result == null ? '示例诊断结果' : result.mode,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  result?.name ?? '苹果白粉病',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _resultChip(
                      result == null ? '建议喷洒三唑酮' : result.shortAdvice,
                      AppColors.primary,
                      AppColors.primaryContainer.withValues(alpha: 0.18),
                    ),
                    _resultChip(
                      result == null
                          ? '可信度 96%'
                          : '可信度 ${(result.confidence * 100).round()}%',
                      AppColors.onSurfaceVariant,
                      AppColors.surfaceHigh,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
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

  Widget _chatCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        children: [
          Container(
            decoration: const BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.vertical(top: Radius.circular(R.md)),
              border: Border(bottom: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: const Row(
              children: [
                Icon(Icons.smart_toy, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text(
                  '农技专家 AI',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                ),
                Spacer(),
                StatusChip('离线优先'),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                for (var i = 0; i < _messages.length; i++) ...[
                  _messages[i].fromUser
                      ? _userBubble(_messages[i].text)
                      : _botBubble(_messages[i].text),
                  if (i != _messages.length - 1) const SizedBox(height: 16),
                ],
                if (_asking) ...[
                  const SizedBox(height: 16),
                  _botBubble('正在调用本地后端知识库，请稍等...'),
                ],
              ],
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            child: Row(
              children: [
                IconButton.filledTonal(
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.surfaceLow,
                    foregroundColor: AppColors.onSurfaceVariant,
                    fixedSize: const Size(36, 36),
                  ),
                  onPressed: () =>
                      toast(context, '语音问答接口已保留，Flutter 语音输入将在后续分段接入'),
                  icon: const Icon(Icons.add, size: 20),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _input,
                    minLines: 1,
                    maxLines: 3,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _ask(),
                    decoration: const InputDecoration(
                      hintText: '向农技助手提问...',
                      isDense: true,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      filled: true,
                      fillColor: AppColors.surfaceLow,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(999)),
                        borderSide: BorderSide(color: AppColors.outlineVariant),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(999)),
                        borderSide:
                            BorderSide(color: AppColors.primary, width: 1.5),
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
                    icon: _asking
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.send_rounded, size: 19),
                    onPressed: _asking ? null : _ask,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _botBubble(String text) => Row(
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
              child: Text(
                text,
                style: const TextStyle(
                    fontSize: 14, height: 1.6, color: AppColors.onSurface),
              ),
            ),
          ),
        ],
      );

  Widget _userBubble(String text) => Row(
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
              child: Text(
                text,
                style: const TextStyle(
                    fontSize: 14, height: 1.6, color: Colors.white),
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
            child:
                const Icon(Icons.person, color: AppColors.secondary, size: 18),
          ),
        ],
      );
}

class _ChatMessage {
  final bool fromUser;
  final String text;

  const _ChatMessage({required this.fromUser, required this.text});
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

  String get shortAdvice {
    final normalized = advice.replaceAll('\n', ' ').trim();
    if (normalized.length <= 12) return normalized;
    return '${normalized.substring(0, 12)}...';
  }
}
