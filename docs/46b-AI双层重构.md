# 分段 46b — AI 双层重构（按新设计稿）

> 工作单（Codex 实施）。所属批次：[46-用户反馈批次](46-用户反馈批次.md)。
> 解决反馈 2（清空之后历史又回来）+ 反馈 6（按 `design_ref/ai页/ai_1` + `ai_2` 新设计稿重做）。
>
> **本段推翻分段 44b 的单页 chat 结构**，改为 ChatGPT 式「会话列表外页 + 单会话内页」双层。

## 一、设计稿解读

**`design_ref/ai页/ai_2/screen.png` —— AI 会话列表外页**

```
┌──────────────────────────────────────┐
│ FarmAppBar  FarmLink 田园通  [🔔]    │
├──────────────────────────────────────┤
│ [🔍 搜索话题或关键词...]              │  搜索栏，圆角，灰底
├──────────────────────────────────────┤
│ AI 历史记录              [清空全部]   │  红字按钮
├──────────────────────────────────────┤
│ 今天                                  │  小灰字分组标签
│ ┌─────────────────────────────────┐  │
│ │ 水稻病虫害识别分析     10:45 AM  │  │  ← 绿色左边框（今天）
│ │ 根据您上传的照片，这看起来像...   │  │
│ └─────────────────────────────────┘  │
│ ┌─────────────────────────────────┐  │
│ │ 下周天气对播种的影响    08:20 AM │  │
│ │ 下周二有降雨，土壤湿度将增加...   │  │
│ └─────────────────────────────────┘  │
│                                       │
│ 昨天                                  │
│ ┌─────────────────────────────────┐  │
│ │ 智能灌溉方案优化     昨天 16:30  │  │  ← 灰边框（过去）
│ │ 您的 3 号田块目前的含水量较低... │  │
│ └─────────────────────────────────┘  │
│ ...                                   │
│                                       │
│ 上周                                  │
│ ┌─────────────────────────────────┐  │
│ │ ✦ 月度生产力总结报告     周二    │  │  ← 带 ✨ 星标，AI 主动生成
│ │ 您上个月的化肥使用效率提升了...   │  │
│ └─────────────────────────────────┘  │
│ ┌─────────────────────────────────┐  │
│ │ 土壤 pH 值分析报告       周一    │  │
│ │ 分析结果显示，北侧田地的酸碱...   │  │
│ └─────────────────────────────────┘  │
│                              [+]     │  ← FAB 绿色加号
│ [底栏 5 tab]                          │
└──────────────────────────────────────┘
```

**`design_ref/ai页/ai_1/screen.png` —— AI 单会话内页**

```
┌──────────────────────────────────────┐
│ [←] AI 农技助手  [↻历史] [⚙ 设置]    │  返回 + 标题 + 操作图标
├──────────────────────────────────────┤
│ (历史聊天气泡区域 ...)                │
│                                       │
│ user: [叶片图片，圆角]                │  用户气泡（图片消息）
│       是这个病吗                      │
│                                       │
│ bot:  ┌─────────────────────────┐   │
│       │ ✅ 智能植保诊断报告  V  │   │  ← 绿框，VERIFIED 徽章
│       │                          │   │
│       │ 苹果黑星病（早期）94.8% │   │  ← 标题 + 可信度
│       │                          │   │
│       │ 基于深度学习模型分析     │   │
│       │ 中发现...不属于放射状    │   │  ← 详细说明
│       │ 病变...                  │   │
│       │                          │   │
│       │ 推荐防治方案             │   │
│       │ ┌──────────────────────┐│   │
│       │ │💧 生成定制化施药建议 ││   │  ← 主 CTA 按钮
│       │ └──────────────────────┘│   │
│       │ ┌──────────────────────┐│   │
│       │ │🔧 呼叫周边植保服务   ││   │  ← 次 CTA 按钮
│       │ └──────────────────────┘│   │
│       └─────────────────────────┘   │
│                                       │
├──────────────────────────────────────┤
│ [+]  [描述其他症状...] [🎤] [➤]      │  sticky 输入区
│ [底栏 5 tab]                          │
└──────────────────────────────────────┘
```

## 二、目标

1. **路由双层**
   - `/ai` 改为会话列表 (AiThreadsPage)
   - `/ai/chat/:id` 进入单条会话 (AiChatPage)
   - `/ai/chat/new?scene=AGRI` 进入新建空白会话

2. **会话列表（外页）**
   - 搜索 / 时间分组 / 「清空全部」/ FAB「+」
   - 把 AI 主动生成的报告（年度报告）混入列表，带 ✨ 星标徽章

3. **单会话内页**
   - 沿用 44b 的 SSE 流式 + scene + 图片消息
   - 新增「智能植保诊断报告卡」展示形态：图片识别完成后 bot 气泡升级为绿框诊断卡 + 推荐方案 CTA 按钮
   - 「清空对话」改为「删除这条会话」，**真删服务端**

4. **清空真生效**
   - 后端新增 `DELETE /ai/qa/records`（清当前用户全部）
   - 后端新增 `DELETE /ai/qa/records/:id`（删单条）
   - 列表「清空全部」与单会话「删除会话」分别调

## 三、数据模型简化

后端 schema **不动**（不加 thread 表）。

约定：

- **一个 `aiQaRecord` = 一个 thread**
- threadId = qaRecord.id
- thread.title = question 截前 24 字
- thread.preview = answer 截前 60 字
- thread.scene = qaRecord.scene
- thread.icon：图片识别 → 相机图标；REPORT → 星标；其它 → AI 图标
- thread.kind：CHAT / DETECT / REPORT
  - DETECT 判定：`referencesJson` 含 `detect` 字段，或 `scene='DETECT'`，或 `imageUrl != null`
  - REPORT 判定：从 `/data/annual-report/list` 拉的数据，独立类别

在单会话页内可以追问，但**追问会创建新的 qaRecord**（新 thread）—— 简化版。如果用户要"在同一会话内追问"留给后续 thread 化分段处理。本工作单写明这是已知简化。

## 四、改动清单

### 1. 后端

#### 1.1 `backend/src/modules/ai/ai.controller.js` 新增两个 handler

```js
/** 清空当前用户所有 AI 问答记录 */
export async function qaClearAll(req, res) {
  const result = await prisma.aiQaRecord.deleteMany({
    where: { userId: req.user.id },
  })
  ok(res, { deleted: result.count }, '已清空 AI 对话历史')
}

/** 删除单条 AI 问答记录 */
export async function qaRemove(req, res) {
  const id = Number(req.params.id)
  if (!id) throw errors.param('记录 ID 不合法')
  const exist = await prisma.aiQaRecord.findUnique({ where: { id } })
  if (!exist) throw errors.notFound('记录不存在')
  if (exist.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw errors.forbidden('无权删除他人的对话')
  }
  await prisma.aiQaRecord.delete({ where: { id } })
  ok(res, { id }, '已删除')
}
```

#### 1.2 `backend/src/modules/ai/ai.routes.js` 注册

```js
router.delete('/ai/qa/records',     wrap(ai.qaClearAll))
router.delete('/ai/qa/records/:id', wrap(ai.qaRemove))
```

### 2. 前端 · 重命名 + 拆分

#### 2.1 重命名

```
app/lib/pages/ai/ai_page.dart  →  app/lib/pages/ai/ai_chat_page.dart
```

**class 名同步改**：`AiPage / _AiPageState` → `AiChatPage / _AiChatPageState`

#### 2.2 `AiChatPage` 改造为「单会话」

构造：

```dart
class AiChatPage extends StatefulWidget {
  /// threadId == null：新建会话（场景由 query 传）
  final int? threadId;
  /// 新建会话时的初始 scene
  final String initialScene;
  const AiChatPage({super.key, this.threadId, this.initialScene = 'GENERAL'});
  ...
}
```

`_loadHistory()` 改造：

- 若 `widget.threadId != null` → 调 `/ai/qa/records?id=widget.threadId`（或 list 后 filter）拿单条，渲染 user question + bot answer（两个气泡）
- 若为 DETECT 类型 → bot 气泡渲染为「智能植保诊断报告」绿框卡（见 2.4）
- 若 `widget.threadId == null` → 空对话，显示欢迎语，等用户输入

`AppBar` 改造：

- leading 加返回按钮（`context.canPop() ? context.pop() : context.go('/ai')`）
- 右上「清空对话」改为「删除此会话」，调 `DELETE /ai/qa/records/:id`，成功后 `context.go('/ai')` 返回列表
- 标题：若 threadId 非空显示 thread.title，否则显示「新对话 · {sceneLabel}」

`_send()` 行为：

- 当前 thread 没有 id（新建态）→ 第一次发送时 POST `/ai/chat` 返回会带 recordId（看 SSE done 事件的 `recordId` 字段）→ 接到后用 `context.go('/ai/chat/$recordId')` 替换路由（**用 `pushReplacement` 而非 push**，避免返回栈累积）
- 已有 threadId → 追问也走 `/ai/chat`（会创建新 qaRecord），追问完后**仍跳到新 record id**？
  - **简化决定**：追问后**不跳路由**，新 qaRecord 仅在本地 _messages 累加显示；返回列表时新 record 自然出现
  - 这是为了避免列表里出现一堆碎片化「追问」条目变得拥挤；用户期望「同一会话内可以继续聊」
  - 限制：刷新 App 后无法看到追问历史（因为它们 record id 都不一样）。**列表项的 preview 仍用最初的 question；追问全是新 thread**。这是已知简化，写在「七、不在范围内」

#### 2.3 新建 `app/lib/pages/ai/ai_threads_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class AiThreadsPage extends StatefulWidget {
  const AiThreadsPage({super.key});
  @override
  State<AiThreadsPage> createState() => _AiThreadsPageState();
}

class _Thread {
  final int id;
  final String title;
  final String preview;
  final String scene;          // GENERAL / AGRI / POLICY / LEGAL
  final String kind;           // CHAT / DETECT / REPORT
  final DateTime createdAt;
  _Thread({
    required this.id,
    required this.title,
    required this.preview,
    required this.scene,
    required this.kind,
    required this.createdAt,
  });
}

class _AiThreadsPageState extends State<AiThreadsPage> {
  final _searchCtrl = TextEditingController();
  bool _loading = true;
  String _query = '';
  List<_Thread> _all = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = <_Thread>[];

    // 1. 拉 AI 问答记录
    try {
      final data = await ApiClient.get('/ai/qa/records',
          query: {'pageNum': 1, 'pageSize': 100});
      final records = ((data as Map)['records'] as List? ?? [])
          .whereType<Map>()
          .map((m) => m.cast<String, dynamic>())
          .toList();
      for (final r in records) {
        final question = '${r['question'] ?? ''}';
        final answer = '${r['answer'] ?? ''}';
        // DETECT 判定：question 含 [图片] 标识，或 referencesJson 内有 detect
        final kind = _detectKind(r);
        list.add(_Thread(
          id: (r['id'] as num).toInt(),
          title: _truncate(question.isEmpty ? '图像识别' : question, 24),
          preview: _truncate(answer, 60),
          scene: '${r['scene'] ?? 'GENERAL'}',
          kind: kind,
          createdAt: DateTime.tryParse('${r['createdAt'] ?? ''}') ??
              DateTime.now(),
        ));
      }
    } catch (_) {}

    // 2. 拉年度报告作为 REPORT 类型 thread
    try {
      final data = await ApiClient.get('/data/annual-report/list',
          query: {'pageNum': 1, 'pageSize': 20});
      final records = ((data as Map)['records'] as List? ?? [])
          .whereType<Map>()
          .map((m) => m.cast<String, dynamic>())
          .toList();
      for (final r in records) {
        // 用负数 id 区分（避免和 qaRecord id 冲突）—— 单会话页路由进来用 ?report=true 标识
        // 简化做法：列表点击直接跳数据服务页 /data/service
        list.add(_Thread(
          id: -((r['id'] as num).toInt()),
          title: '${r['year']} 年度农事报告',
          preview: _truncate('${r['summary'] ?? '点击查看完整报告'}', 60),
          scene: 'REPORT',
          kind: 'REPORT',
          createdAt: DateTime.tryParse('${r['createdAt'] ?? ''}') ??
              DateTime.now(),
        ));
      }
    } catch (_) {}

    // 按时间倒序
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (!mounted) return;
    setState(() {
      _all = list;
      _loading = false;
    });
  }

  String _detectKind(Map<String, dynamic> r) {
    final refs = r['referencesJson'];
    if (refs is List) {
      for (final ref in refs) {
        if (ref is Map && (ref['type'] == 'DETECT' || ref['detect'] != null)) {
          return 'DETECT';
        }
      }
    }
    if (r['scene'] == 'DETECT' || r['imageUrl'] != null) return 'DETECT';
    return 'CHAT';
  }

  String _truncate(String s, int n) =>
      s.length <= n ? s : '${s.substring(0, n)}...';

  Future<void> _clearAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('清空全部对话'),
        content: const Text('确定清空所有 AI 对话历史吗？此操作不可恢复。'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('清空', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiClient.delete('/ai/qa/records');
      if (!mounted) return;
      toast(context, '已清空 AI 对话历史');
      await _load();
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('清空', e), error: true);
    }
  }

  List<_Thread> get _filtered {
    if (_query.isEmpty) return _all;
    final q = _query.toLowerCase();
    return _all
        .where((t) =>
            t.title.toLowerCase().contains(q) ||
            t.preview.toLowerCase().contains(q))
        .toList();
  }

  Map<String, List<_Thread>> _grouped(List<_Thread> list) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final lastWeek = today.subtract(const Duration(days: 7));
    final map = <String, List<_Thread>>{'今天': [], '昨天': [], '上周': [], '更早': []};
    for (final t in list) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      if (!d.isBefore(today)) {
        map['今天']!.add(t);
      } else if (!d.isBefore(yesterday)) {
        map['昨天']!.add(t);
      } else if (!d.isBefore(lastWeek)) {
        map['上周']!.add(t);
      } else {
        map['更早']!.add(t);
      }
    }
    map.removeWhere((k, v) => v.isEmpty);
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final grouped = _grouped(_filtered);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/ai/chat/new'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Loading(text: '加载对话历史')
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                children: [
                  _searchBar(),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Text('AI 历史记录',
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface)),
                      const Spacer(),
                      if (_all.isNotEmpty)
                        TextButton.icon(
                          onPressed: _clearAll,
                          icon: const Icon(Icons.delete_outline,
                              color: AppColors.error, size: 16),
                          label: const Text('清空全部',
                              style: TextStyle(color: AppColors.error)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_filtered.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: EmptyView('暂无对话，点 + 开始新对话',
                          icon: Icons.smart_toy_outlined),
                    )
                  else
                    for (final entry in grouped.entries) ...[
                      _groupLabel(entry.key),
                      for (final t in entry.value)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _threadCard(t),
                        ),
                    ],
                ],
              ),
            ),
    );
  }

  Widget _searchBar() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.md),
        ),
        child: Row(
          children: [
            const Icon(Icons.search, color: AppColors.outline),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _searchCtrl,
                decoration: const InputDecoration(
                  hintText: '搜索话题或关键词...',
                  border: InputBorder.none,
                  isDense: true,
                ),
                onChanged: (v) => setState(() => _query = v.trim()),
              ),
            ),
          ],
        ),
      );

  Widget _groupLabel(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 14, 4, 8),
        child: Text(text,
            style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant)),
      );

  Widget _threadCard(_Thread t) {
    final isToday = !DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day)
        .isBefore(DateTime.now().subtract(const Duration(days: 1)));
    final isReport = t.kind == 'REPORT';
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(R.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.md),
        onTap: () {
          if (t.kind == 'REPORT') {
            context.go('/data/service');
          } else {
            context.go('/ai/chat/${t.id}');
          }
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.md),
            border: Border(
              left: BorderSide(
                color: isToday
                    ? AppColors.primary
                    : AppColors.outlineVariant,
                width: 3,
              ),
            ),
            boxShadow: AppColors.ambientShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (isReport) ...[
                    const Icon(Icons.auto_awesome, color: AppColors.gold, size: 16),
                    const SizedBox(width: 6),
                  ],
                  Expanded(
                    child: Text(t.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                  ),
                  const SizedBox(width: 8),
                  Text(_friendlyTime(t.createdAt),
                      style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.onSurfaceVariant)),
                ],
              ),
              const SizedBox(height: 6),
              Text(t.preview,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, height: 1.4,
                      color: AppColors.onSurfaceVariant)),
            ],
          ),
        ),
      ),
    );
  }

  String _friendlyTime(DateTime t) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(t.year, t.month, t.day);
    if (d == today) return DateFormat('HH:mm').format(t);
    if (d == today.subtract(const Duration(days: 1))) {
      return '昨天 ${DateFormat('HH:mm').format(t)}';
    }
    final diff = today.difference(d).inDays;
    if (diff < 7) {
      const w = ['日', '一', '二', '三', '四', '五', '六'];
      return '周${w[t.weekday % 7]}';
    }
    return DateFormat('MM-dd').format(t);
  }
}
```

#### 2.4 单会话页 · 智能植保诊断报告卡

`AiChatPage` 内，bot 气泡渲染时检测 `msg.detect != null`：

```dart
Widget _detectReportCard(_DetectResult d) {
  return Container(
    margin: const EdgeInsets.only(top: 4),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(R.md),
      border: Border.all(color: AppColors.primary, width: 1.5),
    ),
    padding: const EdgeInsets.all(14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.verified, color: AppColors.primary, size: 18),
            const SizedBox(width: 6),
            const Text('智能植保诊断报告',
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
            const Spacer(),
            const StatusChip('VERIFIED', color: AppColors.primary),
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
                child: Text(d.name,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700,
                        color: AppColors.onSurface)),
              ),
              Text('${(d.confidence * 100).toStringAsFixed(1)}%',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800,
                      color: AppColors.primary)),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(d.advice.isEmpty ? '识别完成，建议结合田间情况复核' : d.advice,
            style: const TextStyle(
                fontSize: 13, height: 1.5,
                color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 12),
        const Text('推荐防治方案',
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700,
                color: AppColors.onSurface)),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => _askFollowUp('请为「${d.name}」生成定制化的施药建议（剂量、时机、注意事项）'),
            icon: const Icon(Icons.water_drop_outlined, size: 16),
            label: const Text('生成定制化施药建议'),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => context.go('/machinery/service'),
            icon: const Icon(Icons.local_phone_outlined, size: 16),
            label: const Text('呼叫周边植保服务'),
          ),
        ),
      ],
    ),
  );
}

void _askFollowUp(String question) {
  _input.text = question;
  _send();
}
```

bot 气泡 build 时：

```dart
Widget _botBubble(_ChatMessage msg) {
  // ...原 bot 气泡布局...
  if (msg.detect != null) {
    // 整个气泡用诊断报告卡代替文本
    return _detectReportCard(msg.detect!);
  }
  // ...原文本气泡...
}
```

### 3. `app/lib/core/router.dart`

```dart
import '../pages/ai/ai_threads_page.dart';
import '../pages/ai/ai_chat_page.dart';

// ShellRoute.routes 内的原 /ai 改为：
GoRoute(
  path: '/ai',
  builder: (_, __) => const AiThreadsPage(),
),
GoRoute(
  path: '/ai/chat/new',
  builder: (_, state) => AiChatPage(
    initialScene: state.uri.queryParameters['scene'] ?? 'GENERAL',
  ),
),
GoRoute(
  path: '/ai/chat/:id',
  builder: (_, state) {
    final id = int.tryParse(state.pathParameters['id'] ?? '');
    return AiChatPage(threadId: id);
  },
),
```

底栏「AI 农技」tab 路径仍为 `/ai`，进入即列表页。

### 4. 主页 / 我的快讯三联卡跳转

`home_page.dart` 内 `_serviceGrid` 的 `_openSection('ai')` 仍跳 `/ai`，无需改。

如果有任何地方写死了 `/ai`（比如 ShellPage 底栏判断 `loc.startsWith('/ai')` 高亮），同步检查并保持。已确认 ShellPage 的 `_index(loc)` 用 `startsWith` 判断，能匹配 `/ai` `/ai/chat/...`，**无需改**。

## 五、接口契约

### 已有

- `GET /ai/qa/records?pageNum=1&pageSize=100` —— 拉历史
- `GET /data/annual-report/list?pageSize=20` —— 拉报告
- `POST /ai/chat`（SSE 流式）—— 发起对话，已有
- `POST /ai/image/detect` —— 图片识别，已有

### 新增

- `DELETE /ai/qa/records` —— 清当前用户全部 qaRecord
- `DELETE /ai/qa/records/:id` —— 删单条

### 响应字段约定

`GET /ai/qa/records` 单条记录字段：

```json
{
  "id": 12,
  "userId": 1,
  "scene": "AGRI",
  "question": "玉米叶片发黄是什么原因？",
  "answer": "可能是缺氮 / 涝渍 / ...",
  "modelUsed": "qwen2.5",
  "referencesJson": [...],
  "createdAt": "2026-05-27T10:32:01.000Z"
}
```

`POST /ai/chat` SSE 完成事件（已有，沿用）：

```
event: done
data: {"recordId": 13, "serviceMode": "智能问答", "modelUsed": "qwen2.5"}
```

`recordId` 用于新建会话首次发送成功后跳转。

## 六、验收

1. 后端 `node --check ai.controller.js ai.routes.js` 全通过
2. `flutter analyze lib/pages/ai lib/core/router.dart` → `No issues found!`
3. 端到端：
   - 启动后端 + Web → 进入 App `/ai` → 看到会话列表（搜索栏 + 时间分组 + 卡片）
   - 搜索"玉米" → 列表过滤
   - 点列表任一卡 → 进入单会话页 → 看到原始问答两个气泡
   - 单会话页点 AppBar 右上「删除此会话」→ 二次确认 → 返回列表，该条已消失
   - 列表点「清空全部」→ 二次确认 → 列表清空（除年度报告类）
   - 列表点 FAB「+」→ 进入新建对话 → 发问 → SSE 流式回答 → 跳转到 `/ai/chat/:newId`
   - 上传图片 → bot 气泡显示「智能植保诊断报告」绿框卡
   - 点「生成定制化施药建议」→ 自动追问相关问题
   - 点「呼叫周边植保服务」→ 跳 `/machinery/service`
   - 年度报告条目带 ✨ 星标，点击跳 `/data/service`
   - **输入框 autofocus 验证**（GitHub issue #3）：
     - 列表点 FAB「+」进入新建对话 → 输入框立刻聚焦、键盘自动弹起
     - 点列表已有会话进入 → 输入框立刻聚焦
     - 发送一条消息后 SSE 完成 → 焦点回到输入框（连续提问无需手点）

### 2.5 输入框 autofocus（关联 GitHub issue #3）

> issue #3「询问 ai 时，输入框不会自动聚焦」并入本工作单一并解决，不再单独开分段。

`AiChatPage` State 新增：

```dart
final _inputFocus = FocusNode();

@override
void dispose() {
  _input.dispose();
  _scrollCtrl.dispose();
  _inputFocus.dispose();   // 别忘了释放
  super.dispose();
}
```

`_loadHistory` 完成后追加一次：

```dart
if (!mounted) return;
setState(() { ... _loadingHistory = false; });
_scrollToBottom();
WidgetsBinding.instance.addPostFrameCallback((_) {
  if (mounted) _inputFocus.requestFocus();   // 进入页自动聚焦
});
```

`_send` 在 SSE 结束的 `finally` 末尾再请求一次焦点（连续提问体验）：

```dart
} finally {
  if (mounted) {
    setState(() => _sending = false);
    _inputFocus.requestFocus();
  }
}
```

`_inputBar` 内 `TextField` 改为：

```dart
TextField(
  controller: _input,
  focusNode: _inputFocus,
  // autofocus: false —— 不设 autofocus，由 _loadHistory 完成时 requestFocus
  // 显式 requestFocus 比 autofocus 更可控（autofocus 在 sheet/路由切换时偶发失效）
  minLines: 1, maxLines: 4,
  enabled: !_sending,
  ...
),
```

> 不要直接 `autofocus: true` —— 在 ShellRoute / DraggableScrollableSheet 复杂上下文里 autofocus 经常被父级吞掉。
> 用 `FocusNode.requestFocus()` 显式控制更稳。

## 七、不在范围内

- **真正的 thread 化**（同一会话内多轮对话存在同一 thread 下）—— 需后端 schema 加 threadId，留给 47+ 单独做
- 追问的消息持久化：当前简化版追问 = 创建新 qaRecord，列表里会变成新条目；本工作单不解决
- AI 语音输入（「+」sheet 内的语音项仍 disabled）
- 单会话页内的图片消息缩略图压缩、长按保存等富交互
- 不动 44b 的 SSE 协议解析（沿用现有 `ApiClient.stream`）

## 八、关联

- 总览：[46-用户反馈批次.md](46-用户反馈批次.md)
- 同批次姊妹：[46a-我的页与设置页修复.md](46a-我的页与设置页修复.md) / [46c-发布页扩充.md](46c-发布页扩充.md)
- 推翻的前一段：[44b-AI聊天页重构.md](44b-AI聊天页重构.md)
- 设计稿：`design_ref/ai页/ai_1/screen.png` + `ai_2/screen.png`
- GitHub issue 关联：#3 输入框 autofocus（见 2.5）
- Codex 完成后用 gh CLI 关 issue #3：
  ```powershell
  & "C:\Program Files\GitHub CLI\gh.exe" issue close 3 --repo xkitme/FarmLink --comment "已在 46b AI 双层重构中加 FocusNode + requestFocus，进入页/SSE 完成后自动聚焦。详见 docs/46b-AI双层重构.md 第 2.5 节。"
  ```

## 九、实施备注（Codex 完成后填写）

- 前端：`/ai` 已改为 `AiThreadsPage` 会话列表；新增 `/ai/chat/new` 与 `/ai/chat/:id` 单会话页，旧 `ai_page.dart` 已拆分为 `ai_threads_page.dart` / `ai_chat_page.dart`。
- 单会话页：沿用原 SSE 问答、图片识别与场景选择能力；新增 `FocusNode.requestFocus()`，进入页面、发送完成、识别完成后都会回到输入框焦点。
- 列表页：接入 `GET /ai/qa/records` 与 `GET /data/annual-report/list`，支持搜索、时间分组、年度报告星标入口、清空全部。
- 后端：新增 `DELETE /ai/qa/records` 与 `DELETE /ai/qa/records/:id`，分别用于清空当前用户 AI 问答记录和删除单条记录。
- 诊断卡：图片识别结果在单会话页渲染为「智能植保诊断报告」绿框卡，包含可信度、建议与两个 CTA。
- 验证：`node --check backend/src/modules/ai/ai.controller.js backend/src/modules/ai/ai.routes.js` 通过；`flutter analyze lib/pages/ai lib/core/router.dart` 通过；`flutter analyze lib` 通过。
