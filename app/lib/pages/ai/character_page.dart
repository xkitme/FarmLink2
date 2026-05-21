import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';

class CharacterPage extends StatefulWidget {
  final String characterKey;
  const CharacterPage({super.key, required this.characterKey});

  @override
  State<CharacterPage> createState() => _CharacterPageState();
}

class _CharacterPageState extends State<CharacterPage> {
  late Map<String, String> _char;
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_Msg> _messages = [];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _char = kCharacters.firstWhere(
      (c) => c['key'] == widget.characterKey,
      orElse: () => kCharacters.first,
    );
    _messages.add(_Msg(
      role: 'assistant',
      text: _getGreeting(_char['key']!),
    ));
  }

  String _getGreeting(String key) {
    switch (key) {
      case 'confucius':
        return '吾乃孔丘，字仲尼。学而时习之，不亦说乎？有朋自远方来，不亦乐乎？汝有何疑惑，但说无妨。';
      case 'libai':
        return '哈哈！某乃李太白是也！天生我材必有用，千金散尽还复来。今日有缘相聚，不知汝有何话与吾说？';
      case 'sushi':
        return '吾乃苏轼，东坡居士。人生如梦，一尊还酹江月。来，吾们聊聊这世间万象，如何？';
      default:
        return '有什么想聊的？';
    }
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _sending) return;
    _inputCtrl.clear();
    setState(() {
      _messages.add(_Msg(role: 'user', text: text));
      _messages.add(const _Msg(role: 'assistant', text: '', streaming: true));
      _sending = true;
    });
    _scrollToBottom();

    try {
      final history = _messages
          .where((m) => !m.streaming && m.text.isNotEmpty)
          .take(_messages.length - 1)
          .map((m) => {'role': m.role, 'content': m.text})
          .toList();

      final buf = StringBuffer();
      await for (final chunk in ApiClient.stream('/api/ai/character/chat', {
        'character': widget.characterKey,
        'message': text,
        'history': history,
      })) {
        buf.write(chunk);
        if (mounted) {
          setState(() {
            _messages.last = _Msg(role: 'assistant', text: buf.toString(), streaming: true);
          });
          _scrollToBottom();
        }
      }
      if (mounted) {
        setState(() {
          _messages.last = _Msg(role: 'assistant', text: buf.toString());
          _sending = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.last = _Msg(role: 'assistant', text: '请求失败：${e.toString()}');
          _sending = false;
        });
      }
    }
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Text(_char['emoji']!, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_char['name']!, style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                )),
                Text(_char['title']!, style: const TextStyle(
                  color: InkColors.gold,
                  fontSize: 11,
                )),
              ],
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          // 人物简介条
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: InkColors.gold.withOpacity(0.06),
            child: Text(
              _char['desc']!,
              style: const TextStyle(
                color: InkColors.textSecondary,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              itemCount: _messages.length,
              itemBuilder: (ctx, i) => _buildMessage(_messages[i], i),
            ),
          ),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildMessage(_Msg msg, int i) {
    final isUser = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: InkColors.gold.withOpacity(0.1),
                border: Border.all(color: InkColors.gold.withOpacity(0.4)),
              ),
              child: Center(
                child: Text(_char['emoji']!, style: const TextStyle(fontSize: 18)),
              ),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isUser ? InkColors.gold.withOpacity(0.12) : InkColors.surface,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(isUser ? 16 : 4),
                  topRight: Radius.circular(isUser ? 4 : 16),
                  bottomLeft: const Radius.circular(16),
                  bottomRight: const Radius.circular(16),
                ),
                border: Border.all(
                  color: isUser ? InkColors.gold.withOpacity(0.3) : InkColors.border,
                ),
              ),
              child: msg.streaming && msg.text.isEmpty
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(3, (j) => Container(
                        margin: EdgeInsets.only(left: j == 0 ? 0 : 4),
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: InkColors.goldDim,
                          shape: BoxShape.circle,
                        ),
                      ).animate(onPlay: (c) => c.repeat())
                        .fade(delay: (j * 200).ms, duration: 400.ms)
                        .then()
                        .fade(duration: 400.ms)),
                    )
                  : Text(
                      msg.text,
                      style: TextStyle(
                        color: InkColors.textPrimary,
                        fontSize: 14,
                        height: 1.8,
                        fontStyle: isUser ? FontStyle.normal : FontStyle.italic,
                      ),
                    ),
            ),
          ),
          if (isUser) const SizedBox(width: 10),
        ],
      ),
    ).animate(key: ValueKey(i)).fade(duration: 300.ms).slideY(begin: 0.05);
  }

  Widget _buildInput() => Container(
    padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
    decoration: const BoxDecoration(
      color: InkColors.surface,
      border: Border(top: BorderSide(color: InkColors.border)),
    ),
    child: SafeArea(
      top: false,
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _inputCtrl,
              style: const TextStyle(color: InkColors.textPrimary, fontSize: 14),
              maxLines: 3,
              minLines: 1,
              decoration: InputDecoration(
                hintText: '与${_char['name']}对话...',
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              ),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _send,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _sending ? InkColors.goldDim : InkColors.gold,
              ),
              child: _sending
                  ? const Center(
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(InkColors.background),
                        ),
                      ),
                    )
                  : const Icon(Icons.send, color: InkColors.background, size: 18),
            ),
          ),
        ],
      ),
    ),
  );
}

class _Msg {
  final String role, text;
  final bool streaming;
  const _Msg({required this.role, required this.text, this.streaming = false});
}
