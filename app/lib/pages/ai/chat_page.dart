import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/ink_card.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_Msg> _messages = [];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _messages.add(const _Msg(
      role: 'assistant',
      text: '你好！我是 InkFlow 的 AI 文化向导，可以为你讲解诗词歌赋、古典文学、传统节日、书法艺术等。有什么想了解的？',
    ));
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
      await for (final chunk in ApiClient.stream('/api/ai/chat', {
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
        title: const Text('AI 文化向导'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              itemCount: _messages.length,
              itemBuilder: (ctx, i) {
                final msg = _messages[i];
                return _buildMessage(msg, i);
              },
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
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: InkColors.gold.withOpacity(0.1),
                border: Border.all(color: InkColors.gold.withOpacity(0.4)),
              ),
              child: const Center(
                child: Text('墨', style: TextStyle(
                  color: InkColors.gold,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                )),
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
                  ? _buildTyping()
                  : Text(
                      msg.text,
                      style: const TextStyle(
                        color: InkColors.textPrimary,
                        fontSize: 14,
                        height: 1.7,
                      ),
                    ),
            ),
          ),
          if (isUser) const SizedBox(width: 10),
        ],
      ),
    )
    .animate(key: ValueKey(i))
    .fade(duration: 300.ms)
    .slideY(begin: 0.05, duration: 300.ms);
  }

  Widget _buildTyping() => Row(
    mainAxisSize: MainAxisSize.min,
    children: List.generate(3, (i) => Container(
      margin: EdgeInsets.only(left: i == 0 ? 0 : 4),
      width: 6,
      height: 6,
      decoration: const BoxDecoration(
        color: InkColors.goldDim,
        shape: BoxShape.circle,
      ),
    ).animate(onPlay: (c) => c.repeat())
      .fade(delay: (i * 200).ms, duration: 400.ms)
      .then()
      .fade(duration: 400.ms)),
  );

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
              decoration: const InputDecoration(
                hintText: '问我关于传统文化的任何问题...',
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
  final String role;
  final String text;
  final bool streaming;
  const _Msg({required this.role, required this.text, this.streaming = false});
}
