import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class MessagesPage extends StatefulWidget {
  const MessagesPage({super.key});

  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  bool _loading = true;
  bool _marking = false;
  String? _error;
  int _unread = 0;
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        ApiClient.get('/notification/list',
            query: {'pageNum': 1, 'pageSize': 30}),
        ApiClient.get('/notification/unread'),
      ]);
      if (!mounted) return;
      final page = _map(results[0]);
      final unread = _map(results[1]);
      setState(() {
        _items = _list(page['records']);
        _unread = _int(unread['unread']);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = serviceErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    if (_marking || _unread == 0) return;
    setState(() => _marking = true);
    try {
      await ApiClient.put('/notification/read-all');
      await _load();
      if (mounted) toast(context, '全部消息已标记为已读');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('操作', e), error: true);
    } finally {
      if (mounted) setState(() => _marking = false);
    }
  }

  Future<void> _openMessage(Map<String, dynamic> item) async {
    final id = _int(item['id']);
    if (id > 0 && item['isRead'] != true) {
      try {
        await ApiClient.put('/notification/$id/read');
        await _load();
      } catch (_) {}
    }
    if (!mounted) return;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(_iconOf(_text(item['type'])),
                    color: _colorOf(_text(item['type']))),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _text(item['title'], fallback: '消息详情'),
                    style: const TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _date(item['createdAt']),
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              _text(item['content'], fallback: '暂无详细内容'),
              style: const TextStyle(
                color: AppColors.onSurface,
                height: 1.6,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
      body: _loading
          ? const Loading(text: '正在读取通知')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.primary,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                    children: [
                      _hero(),
                      const SizedBox(height: 16),
                      SectionTitle(
                        '消息通知',
                        trailing: TextButton.icon(
                          onPressed:
                              _marking || _unread == 0 ? null : _markAllRead,
                          icon: const Icon(Icons.done_all_rounded, size: 18),
                          label: const Text('全部已读'),
                        ),
                      ),
                      if (_items.isEmpty)
                        const AppCard(
                          child: EmptyView('暂无消息通知',
                              icon: Icons.notifications_none_rounded),
                        )
                      else
                        for (final item in _items)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _messageCard(item),
                          ),
                    ],
                  ),
                ),
    );
  }

  Widget _hero() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(R.md),
            ),
            child: const Icon(Icons.notifications_active_outlined,
                color: AppColors.primary, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '通知中心',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _unread > 0 ? '有 $_unread 条未读消息' : '所有消息均已读',
                  style: const TextStyle(color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          StatusChip('未读 $_unread',
              color: _unread > 0 ? AppColors.error : AppColors.primary),
        ],
      ),
    );
  }

  Widget _messageCard(Map<String, dynamic> item) {
    final type = _text(item['type']);
    final read = item['isRead'] == true;
    final color = _colorOf(type);
    return AppCard(
      onTap: () => _openMessage(item),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Icon(_iconOf(type), color: color, size: 24),
              ),
              if (!read)
                Positioned(
                  right: -2,
                  top: -2,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      border: Border.all(color: AppColors.surface, width: 2),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _text(item['title'], fallback: '通知'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: read ? FontWeight.w600 : FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _date(item['createdAt']),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.outline,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  _text(item['content'], fallback: '点击查看消息详情'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.35,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconOf(String type) {
    if (type == 'ALERT') return Icons.thunderstorm_outlined;
    if (type == 'POLICY') return Icons.account_balance_outlined;
    if (type == 'FARM') return Icons.eco_outlined;
    if (type == 'SYSTEM') return Icons.campaign_outlined;
    return Icons.notifications_none_rounded;
  }

  Color _colorOf(String type) {
    if (type == 'ALERT') return AppColors.error;
    if (type == 'POLICY') return AppColors.primaryContainer;
    if (type == 'FARM') return AppColors.primary;
    if (type == 'SYSTEM') return AppColors.goldContainer;
    return AppColors.secondary;
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map) {
      return value.map((key, value) => MapEntry('$key', value));
    }
    return {};
  }

  static List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map(_map).toList();
    }
    return [];
  }

  static int _int(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  static String _text(dynamic value, {String fallback = ''}) {
    final text = '${value ?? ''}'.trim();
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  static String _date(dynamic value) {
    final parsed = DateTime.tryParse(_text(value));
    if (parsed == null) return '';
    return DateFormat('MM-dd HH:mm').format(parsed.toLocal());
  }
}
