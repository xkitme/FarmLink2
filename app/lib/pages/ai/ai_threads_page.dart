import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';
import '../../widgets/voice_assistant_layer.dart';

class AiThreadsPage extends StatefulWidget {
  const AiThreadsPage({super.key});

  @override
  State<AiThreadsPage> createState() => _AiThreadsPageState();
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

    try {
      final data = await ApiClient.get('/ai/qa/records', query: {
        'pageNum': 1,
        'pageSize': 100,
      });
      for (final record in _recordsOf(data)) {
        final question = _text(record['question']);
        final answer = _text(record['answer']);
        final scene = _text(record['scene'], fallback: 'GENERAL');
        final createdAt = _date(record['lastMessageAt'] ?? record['createdAt']);
        final messageCount = _int(record['messageCount']);
        final kind = _detectKind(record);
        list.add(_Thread(
          id: _int(record['threadId'] ?? record['id']),
          title: _truncate(question.isEmpty ? 'AI 对话' : question, 24),
          preview: _truncate(answer, 60),
          scene: scene,
          kind: kind,
          imageUrl: kind == 'DETECT' ? _detectImageUrlOf(record) : null,
          createdAt: createdAt,
          messageCount: messageCount <= 0 ? 1 : messageCount,
        ));
      }
    } catch (_) {}

    try {
      final data = await ApiClient.get('/data/annual-report/list', query: {
        'pageNum': 1,
        'pageSize': 20,
      });
      for (final report in _recordsOf(data)) {
        final id = _int(report['id']);
        if (id == 0) continue;
        // C2：负 id 用于区分「年度报告」thread 与普通 qaRecord thread；
        // onTap 通过 kind == 'REPORT' 路由，勿直接拿负 id 跳 /ai/chat/:id。
        list.add(_Thread(
          id: -id,
          title: '${_int(report['year'])} 年度农事报告',
          preview:
              _truncate(_text(report['summary'], fallback: '点击查看完整报告'), 60),
          scene: 'REPORT',
          kind: 'REPORT',
          createdAt: _date(report['createdAt']),
          messageCount: 1,
        ));
      }
    } catch (_) {}

    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (!mounted) return;
    setState(() {
      _all = list;
      _loading = false;
    });
  }

  Future<void> _clearAll() async {
    // 仅清空当前用户自己的 AI 对话历史。App 端不提供「全平台删除」入口
    // （破坏性运维操作不应暴露给普通使用者，留给后台运维）。
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('清空我的对话'),
        content: const Text('确定清空我的全部 AI 对话历史吗？此操作不可恢复。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child:
                  const Text('清空', style: TextStyle(color: AppColors.error))),
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
    final map = <String, List<_Thread>>{
      '今天': [],
      '昨天': [],
      '上周': [],
      '更早': [],
    };
    for (final item in list) {
      final d = DateTime(
          item.createdAt.year, item.createdAt.month, item.createdAt.day);
      if (!d.isBefore(today)) {
        map['今天']!.add(item);
      } else if (!d.isBefore(yesterday)) {
        map['昨天']!.add(item);
      } else if (!d.isBefore(lastWeek)) {
        map['上周']!.add(item);
      } else {
        map['更早']!.add(item);
      }
    }
    map.removeWhere((_, value) => value.isEmpty);
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final grouped = _grouped(filtered);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(title: 'AI 农技'),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/ai/chat/new'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        highlightElevation: 0,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.sm)),
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
                  _assistantEntry(),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Text(
                        'AI 历史记录',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const Spacer(),
                      if (_all.any((item) => item.kind != 'REPORT'))
                        TextButton.icon(
                          onPressed: _clearAll,
                          icon: const Icon(
                            Icons.delete_outline,
                            color: AppColors.error,
                            size: 16,
                          ),
                          label: const Text(
                            '清空全部',
                            style: TextStyle(color: AppColors.error),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (filtered.isEmpty)
                    Column(
                      children: [
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: EmptyView(
                            '暂无对话',
                            icon: Icons.smart_toy_outlined,
                          ),
                        ),
                        SizedBox(
                          width: 220,
                          child: ElevatedButton.icon(
                            onPressed: () => context.go('/ai/chat/new'),
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('立即开始对话'),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    )
                  else
                    for (final entry in grouped.entries) ...[
                      _groupLabel(entry.key),
                      for (final thread in entry.value)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _threadCard(thread),
                        ),
                    ],
                ],
              ),
            ),
    );
  }

  Widget _assistantEntry() => AppCard(
        padding: const EdgeInsets.all(16),
        ai: true,
        onTap: VoiceAssistantController.open,
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.secondary,
                    AppColors.gold,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(R.sm),
              ),
              child:
                  const Icon(Icons.graphic_eq, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AI 语音助手',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    '说出需求，自动打开页面、推荐商品和播报结果',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const Icon(Icons.chevron_right, color: AppColors.primary),
          ],
        ),
      );

  Widget _searchBar() => Container(
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.outlineVariant, width: 1.5),
        ),
        padding: const EdgeInsets.only(left: 14, right: 6),
        child: Row(
          children: [
            const Icon(Icons.search,
                color: AppColors.onSurfaceVariant, size: 21),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _searchCtrl,
                textInputAction: TextInputAction.search,
                onChanged: (value) => setState(() => _query = value.trim()),
                decoration: const InputDecoration(
                  hintText: '搜索话题或关键词...',
                  hintStyle: TextStyle(fontSize: 14, color: AppColors.outline),
                  filled: false,
                  isCollapsed: true,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                ),
                style:
                    const TextStyle(fontSize: 15, color: AppColors.onSurface),
              ),
            ),
            if (_searchCtrl.text.isNotEmpty)
              IconButton(
                tooltip: '清除',
                onPressed: () {
                  _searchCtrl.clear();
                  setState(() => _query = '');
                },
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.close,
                    size: 18, color: AppColors.onSurfaceVariant),
              ),
          ],
        ),
      );

  Widget _groupLabel(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 14, 4, 8),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurfaceVariant,
          ),
        ),
      );

  Widget _threadCard(_Thread thread) {
    final isReport = thread.kind == 'REPORT';
    final showDetectImage = thread.kind == 'DETECT' && thread.imageUrl != null;
    final isToday = DateTime(
            thread.createdAt.year, thread.createdAt.month, thread.createdAt.day)
        .isAtSameMomentAs(DateTime(
            DateTime.now().year, DateTime.now().month, DateTime.now().day));
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(R.sm),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.sm),
        onTap: () {
          if (isReport) {
            context.push('/data/service');
          } else {
            context.push('/ai/chat/${thread.id}');
          }
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.sm),
            border: Border(
              left: BorderSide(
                color: isReport
                    ? AppColors.gold
                    : isToday
                        ? AppColors.primary
                        : AppColors.outlineVariant,
                width: isToday || isReport ? 3 : 1,
              ),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _iconOf(thread.kind),
                    color: isReport ? AppColors.gold : AppColors.primary,
                    size: 17,
                  ),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      thread.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (thread.messageCount > 1) ...[
                    Text(
                      '${thread.messageCount} 条',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    _friendlyTime(thread.createdAt),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              if (showDetectImage)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _detectThumbnail(thread.imageUrl!),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        thread.preview,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                )
              else
                Text(
                  thread.preview,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detectThumbnail(String imageUrl) => Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.outlineVariant, width: 1),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(R.sm),
          child: Image.network(
            imageUrl,
            fit: BoxFit.cover,
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return const Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 1.5),
                ),
              );
            },
            errorBuilder: (_, __, ___) => const Icon(
              Icons.image_outlined,
              color: AppColors.onSurfaceVariant,
              size: 22,
            ),
          ),
        ),
      );

  IconData _iconOf(String kind) {
    switch (kind) {
      case 'REPORT':
        return Icons.auto_awesome;
      case 'DETECT':
        return Icons.photo_camera_outlined;
      default:
        return Icons.smart_toy_outlined;
    }
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
      const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
      return '周${weekdays[t.weekday - 1]}';
    }
    return DateFormat('MM-dd').format(t);
  }

  static String _detectKind(Map<String, dynamic> record) {
    final refs = record['referencesJson'];
    if (refs is String && refs.contains('detect')) return 'DETECT';
    final scene = _text(record['scene']).toUpperCase();
    if (scene == 'DETECT') return 'DETECT';
    return 'CHAT';
  }

  static String? _detectImageUrlOf(Map<String, dynamic> record) {
    final refs = _jsonMap(record['referencesJson']);
    var imageUrl = _text(refs['imageUrl']);
    final detect = refs['detect'];
    if (imageUrl.isEmpty && detect is Map) {
      imageUrl = _text(detect['imageUrl']);
    }
    if (imageUrl.isEmpty) imageUrl = _text(record['imageUrl']);
    return _absoluteImageUrl(imageUrl);
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

  static String? _absoluteImageUrl(String value) {
    final raw = value.trim();
    if (raw.isEmpty) return null;
    final uri = Uri.tryParse(raw);
    if (uri != null && uri.hasScheme) return raw;
    final base = Uri.tryParse(ApiClient.baseUrl);
    final path = raw.startsWith('/') ? raw : '/$raw';
    return base == null ? path : base.resolve(path).toString();
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

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _truncate(String value, int length) =>
      value.length <= length ? value : '${value.substring(0, length)}...';
}

class _Thread {
  final int id;
  final String title;
  final String preview;
  final String scene;
  final String kind;
  final String? imageUrl;
  final DateTime createdAt;
  final int messageCount;

  const _Thread({
    required this.id,
    required this.title,
    required this.preview,
    required this.scene,
    required this.kind,
    this.imageUrl,
    required this.createdAt,
    required this.messageCount,
  });
}
