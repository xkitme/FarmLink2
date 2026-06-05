import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/notification_state.dart';
import '../../widgets/common.dart';
import '../common/info_detail_page.dart';

class _MessageFilter {
  final String key;
  final String label;
  final IconData icon;
  const _MessageFilter(this.key, this.label, this.icon);
}

class MessagesPage extends StatefulWidget {
  const MessagesPage({super.key});

  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  bool _loading = true;
  bool _marking = false;
  bool _loadingMore = false;
  String? _error;
  int _unread = 0;
  int _total = 0;
  int _pageNum = 1;
  int _pages = 0;
  String _activeFilter = 'ALL';
  List<Map<String, dynamic>> _items = [];
  Map<String, int> _typeCounts = {};

  static const _pageSize = 100;

  static const _filters = [
    _MessageFilter('ALL', '全部', Icons.all_inbox_outlined),
    _MessageFilter('UNREAD', '未读', Icons.mark_email_unread_outlined),
    _MessageFilter('ALERT', '预警', Icons.thunderstorm_outlined),
    _MessageFilter('POLICY', '政策', Icons.account_balance_outlined),
    _MessageFilter('FARM', '农事', Icons.eco_outlined),
    _MessageFilter('SYSTEM', '系统', Icons.campaign_outlined),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool append = false}) async {
    if (append) {
      if (_loadingMore || (_pages > 0 && _pageNum >= _pages)) return;
      setState(() => _loadingMore = true);
    } else {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    final nextPage = append ? _pageNum + 1 : 1;
    try {
      final page = _map(await ApiClient.get('/notification/list',
          query: {'pageNum': nextPage, 'pageSize': _pageSize}));
      if (!mounted) return;
      final records = _list(page['records']);
      final unreadCount = _int(page['unread']);
      setState(() {
        _items = append ? [..._items, ...records] : records;
        _unread = unreadCount;
        _total = _int(page['total']);
        _pageNum = _int(page['pageNum']);
        _pages = _int(page['pages']);
        _typeCounts = _normalizedTypeCounts(page['typeCounts']);
        _loading = false;
        _loadingMore = false;
      });
      NotificationState.setUnread(unreadCount);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (!append) _error = serviceErrorMessage(e);
        _loading = false;
        _loadingMore = false;
      });
      if (append) toast(context, actionErrorMessage('加载', e), error: true);
    }
  }

  Future<void> _reload() => _load();

  Future<void> _markAllRead() async {
    if (_marking || _unread == 0) return;
    setState(() => _marking = true);
    try {
      await ApiClient.put('/notification/read-all');
      await _reload();
      if (mounted) toast(context, '全部消息已标记为已读');
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('操作', e), error: true);
    } finally {
      if (mounted) setState(() => _marking = false);
    }
  }

  Future<void> _openMessage(Map<String, dynamic> item) async {
    final id = _int(item['id']);
    final type = _typeOf(item);
    if (id > 0 && item['isRead'] != true) {
      try {
        await ApiClient.put('/notification/$id/read');
        await _reload();
      } catch (_) {}
    }
    if (!mounted) return;
    context.push('/detail/info', extra: InfoDetailData(
      title: _text(item['title'], fallback: '消息详情'),
      body: _text(item['content'], fallback: '暂无详细内容'),
      sections: [
        InfoSection(
          subtitle: '消息信息',
          items: [
            '消息类型：${_labelOf(type)}',
            '创建时间：${_date(item['createdAt'])}',
          ],
        ),
      ],
    ));
  }

  @override
  Widget build(BuildContext context) {
    final visibleItems = _visibleItems;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(
        actions: [
          IconButton(
            onPressed: _loading ? null : _reload,
            icon: const Icon(Icons.refresh, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
      body: _loading
          ? const Loading(text: '正在读取通知')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _reload,
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
                      _filterBar(),
                      const SizedBox(height: 12),
                      if (_items.isEmpty)
                        const AppCard(
                          child: EmptyView('暂无消息通知',
                              icon: Icons.notifications_none_rounded),
                        )
                      else if (visibleItems.isEmpty)
                        AppCard(
                          child: EmptyView(_emptyTextForFilter(),
                              icon: _iconOf(_activeFilter)),
                        )
                      else
                        for (final item in visibleItems)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _messageCard(item),
                          ),
                      if (_items.length < _total) ...[
                        const SizedBox(height: 4),
                        OutlinedButton.icon(
                          onPressed:
                              _loadingMore ? null : () => _load(append: true),
                          icon: _loadingMore
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.expand_more_rounded, size: 18),
                          label: Text(_loadingMore ? '加载中' : '加载更多'),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }

  List<Map<String, dynamic>> get _visibleItems =>
      _items.where(_matchesActiveFilter).toList(growable: false);

  bool _matchesActiveFilter(Map<String, dynamic> item) {
    if (_activeFilter == 'ALL') return true;
    if (_activeFilter == 'UNREAD') return !_isRead(item);
    return _typeOf(item) == _activeFilter;
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

  Widget _filterBar() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final filter in _filters) ...[
            ChoiceChip(
              selected: _activeFilter == filter.key,
              avatar: Icon(
                filter.icon,
                size: 16,
                color: _activeFilter == filter.key
                    ? AppColors.primary
                    : AppColors.onSurfaceVariant,
              ),
              label: Text('${filter.label} ${_countFor(filter.key)}'),
              selectedColor: AppColors.primaryContainer.withValues(alpha: 0.16),
              backgroundColor: AppColors.surface,
              side: BorderSide(
                color: _activeFilter == filter.key
                    ? AppColors.primary
                    : AppColors.outlineVariant,
              ),
              labelStyle: TextStyle(
                color: _activeFilter == filter.key
                    ? AppColors.primary
                    : AppColors.onSurfaceVariant,
                fontWeight: _activeFilter == filter.key
                    ? FontWeight.w700
                    : FontWeight.w600,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(R.md),
              ),
              onSelected: (_) => setState(() => _activeFilter = filter.key),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _messageCard(Map<String, dynamic> item) {
    final type = _typeOf(item);
    final read = _isRead(item);
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
                  ],
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    StatusChip(_labelOf(type), color: color),
                    Text(
                      _date(item['createdAt']),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.outline,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
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

  int _countFor(String filter) {
    if (filter == 'ALL') return _total;
    if (filter == 'UNREAD') return _unread;
    return _typeCounts[filter] ?? 0;
  }

  String _emptyTextForFilter() {
    for (final filter in _filters) {
      if (filter.key == _activeFilter) return '${filter.label}暂无消息';
    }
    return '当前分类暂无消息';
  }

  String _typeOf(Map<String, dynamic> item) =>
      _normalizeType(_text(item['type']));

  bool _isRead(Map<String, dynamic> item) => item['isRead'] == true;

  static String _normalizeType(String type) {
    final upper = type.trim().toUpperCase();
    if (upper.contains('ALERT') || upper.contains('WARN')) return 'ALERT';
    if (upper.contains('POLICY')) return 'POLICY';
    if (upper.contains('FARM') || upper.contains('AGRI')) return 'FARM';
    if (upper.contains('SYSTEM')) return 'SYSTEM';
    return upper.isEmpty ? 'SYSTEM' : upper;
  }

  String _labelOf(String type) {
    if (type == 'ALERT') return '预警';
    if (type == 'POLICY') return '政策';
    if (type == 'FARM') return '农事';
    if (type == 'SYSTEM') return '系统';
    return '通知';
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

  static Map<String, int> _normalizedTypeCounts(dynamic value) {
    if (value is! Map) return {};
    final counts = <String, int>{};
    for (final entry in value.entries) {
      final type = _normalizeType('${entry.key}');
      counts[type] = (counts[type] ?? 0) + _int(entry.value);
    }
    counts.remove('');
    counts.remove('NULL');
    return counts;
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
