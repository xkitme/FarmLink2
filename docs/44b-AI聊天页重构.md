# 分段 44b — AI 聊天页重构（去演示 / 真聊天界面）

> 工作单（Codex 实施）。本段把 `app/lib/pages/ai/ai_page.dart` 从「演示卡 + 简易问答」
> 重构成一个真正的聊天界面：sticky 输入区、消息列表自动滚动、SSE 流式打字、
> scene 切换、历史拉取、图片消息。完成后跑 `flutter analyze` 并把进度总览改 ✅。

## 一、背景

AI 页现状问题（已确认）：

- 「智能识病」上半卡是**演示**：初始显示「苹果白粉病 / 建议喷洒三唑酮 / 可信度 96%」，
  cropType 写死为「苹果」，未交互前看起来像真有诊断结果
- 整页装在 `ListView` 里（聊天卡是 ListView 内一项），**没有 sticky 输入框**，
  键盘弹出时布局直接错乱
- 3 条 hardcoded 示例消息（自我介绍 + 玉米问题 + 答），看起来像示例
- 单 scene（AGRI）写死，用户提政策、法律问题也走农技 prompt
- 非流式，回答整段一次性返回 —— 用户体验远不如「打字机」
- 没有历史会话拉取（后端 `/ai/qa/records` 接口已有）
- 「+」按钮 toast「语音问答正在准备中」—— 真的有 `/ai/voice/recognize` 接口但没接

## 二、目标

做一个**像主流聊天 App 一样**的 AI 助手页：

1. Scaffold 真分屏：上是消息列表（Expanded），下是 sticky 输入区
2. 进入页拉历史 `/ai/qa/records`（一并展示用户提问 + AI 答），按时间倒序
3. 顶部 scene chips 切换：综合 / 农技 / 政策 / 法律
4. 发送走 **SSE 流式**（`ApiClient.stream`），AI 气泡按 token 增量出现
5. 「+」按钮打开 sheet：拍照识病 / 图片识别 / 语音输入（语音可暂留 toast）
6. 图片识别走 `/ai/image/detect`，结果作为 bot 气泡显示（含识别名 + 可信度 + 建议）
7. 演示卡完全删除

## 三、版式

```
┌──────────────────────────────────────┐
│ AppBar  「AI 农技助手」 [清空]        │
├──────────────────────────────────────┤
│ [综合][农技][政策][法律]              │  scene chips, 横滑
├──────────────────────────────────────┤
│                                       │
│   bot:  您好，我是您的智能农技助手...  │
│         （历史 / 流式）                │
│                                       │
│   user: 最近暴雨玉米地刚施完肥...      │  ← 自动滚到底
│                                       │
│   bot:  建议先疏通排水沟▍              │  ← 打字机 cursor
│                                       │
├──────────────────────────────────────┤
│ [+]  [输入框..............]  [发送]   │  sticky bottom，键盘弹出顶上来
└──────────────────────────────────────┘
```

## 四、改动清单

### 1. `app/lib/pages/ai/ai_page.dart`

完整重写。**不复用现有 `_diagnosisCard` / `_diagnosisResultCard` / `_chatCard` 函数**——
这些是演示卡，删掉。bubble 函数 `_botBubble` / `_userBubble` 可以保留小调整。

#### 4.1 State 字段

```dart
class _AiPageState extends State<AiPage> {
  final _input = TextEditingController();
  final _picker = ImagePicker();
  final _scrollCtrl = ScrollController();

  String _scene = 'GENERAL';           // GENERAL / AGRI / POLICY / LEGAL
  final List<_ChatMessage> _messages = [];
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
}
```

#### 4.2 `_ChatMessage` 改造

```dart
class _ChatMessage {
  final bool fromUser;
  final String text;
  final String? scene;              // GENERAL / AGRI / POLICY / LEGAL
  final Uint8List? image;           // user 发的图（识别请求）
  final _DetectResult? detect;      // bot 返回的识别结果（图片消息）
  final bool streaming;             // 是否在流式输出中（光标动画）
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

  _ChatMessage copyWith({String? text, bool? streaming}) =>
      _ChatMessage(
        fromUser: fromUser,
        text: text ?? this.text,
        scene: scene,
        image: image,
        detect: detect,
        streaming: streaming ?? this.streaming,
        createdAt: createdAt,
      );
}
```

#### 4.3 历史拉取

```dart
Future<void> _loadHistory() async {
  try {
    final data = await ApiClient.get('/ai/qa/records',
        query: {'pageNum': 1, 'pageSize': 20});
    final records = (data is Map ? (data['records'] as List? ?? []) : [])
        .whereType<Map>()
        .map((m) => m.cast<String, dynamic>())
        .toList();
    // 后端按 createdAt desc 返回；要展示成从早到晚，所以反转
    final list = <_ChatMessage>[];
    for (final r in records.reversed) {
      list.add(_ChatMessage(
        fromUser: true,
        text: '${r['question'] ?? ''}',
        scene: '${r['scene'] ?? 'GENERAL'}',
        createdAt: DateTime.tryParse('${r['createdAt'] ?? ''}') ?? DateTime.now(),
      ));
      list.add(_ChatMessage(
        fromUser: false,
        text: '${r['answer'] ?? ''}',
        scene: '${r['scene'] ?? 'GENERAL'}',
        createdAt: DateTime.tryParse('${r['createdAt'] ?? ''}') ?? DateTime.now(),
      ));
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
          text: '您好，我是您的智能农技助手。可以问我政策、农技、病虫害、行情等问题，'
              '也可以「+」按钮上传图片让我识别。',
        ));
      }
    });
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
```

#### 4.4 SSE 流式发送

```dart
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

  try {
    final stream = ApiClient.stream('/ai/chat', {
      'scene': _scene.toLowerCase(),
      'question': question,
      'stream': true,
    });
    var buffer = '';
    await for (final chunk in stream) {
      // 后端 SSE 每条 `data: { ... }`；ApiClient.stream 已解析为字符串
      // 兼容两种形态：纯 delta 字符串 / JSON {delta: '...'}
      String delta;
      try {
        final parsed = jsonDecode(chunk);
        if (parsed is Map && parsed['delta'] is String) {
          delta = parsed['delta'] as String;
        } else {
          delta = chunk;
        }
      } catch (_) {
        delta = chunk;
      }
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
        text: '当前服务暂时不可用。请确认账号已登录，稍后再试。',
        scene: _scene,
      );
    });
    toast(context, actionErrorMessage('问答', e), error: true);
  } finally {
    if (mounted) setState(() => _sending = false);
  }
}
```

> SSE 不可用时降级：捕获到第一次 stream 抛错 → 退到 `ApiClient.post('/ai/chat')`
> 非流式调用，把整段答案塞回最后一个 bot 气泡。可以放二期，先按 stream 主路径实现。

#### 4.5 「+」按钮 sheet

```dart
void _openPlusSheet() {
  showModalBottomSheet(
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
          Container(width: 42, height: 4, decoration: ...),
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined, color: AppColors.primary),
            title: const Text('拍照识别'),
            subtitle: const Text('叶片 / 茎秆 / 果实病害实时识别'),
            onTap: () { Navigator.pop(ctx); _pickAndDetect(ImageSource.camera); },
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: AppColors.secondary),
            title: const Text('从相册上传'),
            onTap: () { Navigator.pop(ctx); _pickAndDetect(ImageSource.gallery); },
          ),
          ListTile(
            leading: const Icon(Icons.mic_none_outlined, color: AppColors.outline),
            title: const Text('语音输入'),
            subtitle: const Text('准备中'),
            enabled: false,
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
```

#### 4.6 图片识别走聊天气泡

```dart
Future<void> _pickAndDetect(ImageSource source) async {
  final image = await _picker.pickImage(
      source: source, imageQuality: 82, maxWidth: 1600);
  if (image == null) return;
  final bytes = await image.readAsBytes();
  if (!mounted) return;

  // 1. 先 push 用户图片消息 + bot 「正在识别」占位
  setState(() {
    _messages.add(_ChatMessage(
      fromUser: true,
      text: '请识别这张图片',
      image: bytes,
      scene: _scene,
    ));
    _messages.add(_ChatMessage(
      fromUser: false,
      text: '识别中...',
      streaming: true,
      scene: _scene,
    ));
    _detecting = true;
  });
  _scrollToBottom();

  try {
    final data = await ApiClient.upload(
      '/ai/image/detect',
      bytes,
      image.name,
    ) as Map<String, dynamic>;
    final result = _DetectResult(
      name: '${data['resultLabel'] ?? data['name'] ?? '未识别'}',
      confidence: (data['confidence'] as num?)?.toDouble() ?? 0,
      advice: '${data['adviceText'] ?? data['advice'] ?? ''}',
      mode: '${data['mode'] ?? '智能识别'}',
    );
    if (!mounted) return;
    setState(() {
      _messages[_messages.length - 1] = _ChatMessage(
        fromUser: false,
        text: result.advice.isEmpty
            ? '识别结果：${result.name}（可信度 ${(result.confidence * 100).round()}%）'
            : '识别结果：${result.name}（可信度 ${(result.confidence * 100).round()}%）\n\n${result.advice}',
        detect: result,
        scene: _scene,
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
```

#### 4.7 build()

```dart
@override
Widget build(BuildContext context) {
  return Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      title: const Text('AI 农技助手',
          style: TextStyle(
              color: AppColors.primary, fontWeight: FontWeight.w700)),
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
          for (final s in scenes)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(s.$2),
                selected: _scene == s.$1,
                onSelected: (_) => setState(() => _scene = s.$1),
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
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 10),
                filled: true,
                fillColor: AppColors.surfaceLow,
                enabledBorder: ... 999 圆角,
                focusedBorder: ... 999 圆角 primary,
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
                      width: 18, height: 18,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.send_rounded, size: 19),
              onPressed: _sending ? null : _send,
            ),
          ),
        ],
      ),
    ),
  );
}
```

#### 4.8 气泡升级

`_botBubble(_ChatMessage msg)` 接受整条消息：

- 流式中（`msg.streaming == true`）→ 末尾追加一个闪烁光标（用 `Container width 6 height 14 color primary` + `AnimatedOpacity` 半秒切换）
- 有 `msg.detect` → 在文本下方展示一行胶囊：「`mode` · 可信度 N%」（沿用原 `_resultChip` 风格）
- 时间戳：每条气泡最底显示 `HH:mm`，小字 11px outline

`_userBubble(_ChatMessage msg)`：

- 如果 `msg.image != null`：气泡内先显示 `Image.memory` 缩略图（max 160×160），下面再带文本
- 时间戳同上

### 2. 后端

无改动。`/ai/chat` SSE / `/ai/qa/records` / `/ai/image/detect` 都已就绪。

> 验证 SSE 协议：后端 `sse(res, 'message', { delta })`，ApiClient.stream 会
> 截 `data: ` 行返回原始 JSON 字符串。本工作单的 `jsonDecode` + `delta` 提取
> 已经匹配。

### 3. 不动其它文件

底栏 `/ai` 路由不动；ShellPage 不动；NotificationState 不动；router.dart 不动。

## 五、验收

1. `flutter analyze lib/pages/ai` → `No issues found!`
2. 启动后端 + Web，访问 `/ai`：
   - 首屏：scene chips + 历史会话（如果账号有历史）+ 底部输入栏
   - **没有「示例诊断结果 / 苹果白粉病 / 96%」演示卡**
   - 键盘弹出，输入栏顶上来，消息列表区域被压缩但能滚动
   - 切换 scene chips，hint 文案变化
   - 发送问题：用户气泡立即显示 → bot 气泡从空白开始逐字增长 → 完成后光标消失
   - 点「+」选拍照/相册 → 用户气泡（带缩略图）+ bot 气泡「识别中...」 → 替换为结果
   - 点「清空对话」AppBar 按钮 → 列表清空，input 仍然可用
3. SSE 异常模拟：发送中服务不可用 → bot 气泡显示「服务暂时不可用」+ toast，sending 状态自动解除
4. 历史无数据账号：进入页面显示 EmptyView「和 AI 农技助手聊聊吧」

## 六、不在范围内

- 语音输入（按钮显示「准备中」+ disabled，**不实现**）
- 多会话管理（切换历史聊天 thread）—— 当前后端是单维度 qaRecord，没有 thread 概念
- 富文本 / Markdown 渲染（先纯文本，后续视觉走查再加）
- 「相关参考来源」展示（后端有 references 字段但暂不展示）
- 不要重构 `ApiClient.stream` —— 直接用，能跑就行

## 七、关联

- 上一段：[42-代码审查与修复清单.md](42-代码审查与修复清单.md)
- 同批次姊妹：[44a-主页重排.md](44a-主页重排.md)
- 后端 SSE：`backend/src/modules/ai/ai.controller.js` 的 `askScene`
- 协作约定：[协作约定.md](协作约定.md)

## 八、实施备注（Codex 完成后填写）

- 2026-05-26 Codex 已完成。本段按工作单重写 `app/lib/pages/ai/ai_page.dart`，移除原有演示诊断卡、示例对话和固定 AGRI 场景，改为真实聊天结构：顶部 AppBar + scene chips，中间消息列表，底部 sticky 输入栏。
- 已接入 `/ai/qa/records` 历史拉取并按时间从旧到新展开为用户/AI 气泡；发送问题改走 `ApiClient.stream('/ai/chat')`，兼容 SSE `data: {"delta":"..."}`、meta/done 等非 delta chunk，AI 气泡支持流式追加和光标动画。
- 已接入 `+` 操作 sheet：拍照识别、相册上传、语音输入占位禁用；图片识别走 `/ai/image/detect`，用户图片以缩略图气泡展示，识别结果以 bot 气泡展示标签、可信度和建议。
- 验证：已执行 `dart format app/lib/pages/ai/ai_page.dart`；已执行 `flutter analyze lib/pages/ai`，结果 `No issues found!`。
- 联调验证：已执行 `.\scripts\start-local.ps1 -SkipAdmin` 启动后端与移动 Web，in-app browser 登录 `admin / 123456` 后打开 `http://localhost:5000/#/ai`，确认 scene chips、消息列表、sticky 输入栏和 `+` sheet 正常渲染；浏览器无 error 日志，仅有 Flutter Web service worker 超时 warning，不影响页面渲染。
- 偏离说明：未新增后端、路由或全局 ApiClient 改造；语音输入按工作单保持“准备中”禁用态。
