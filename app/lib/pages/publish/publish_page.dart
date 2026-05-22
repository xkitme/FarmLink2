import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

/// 发布 · 乡村动态 — 接入后端 /life/help + /village/affairs（样式复刻设计稿 _1）
class PublishPage extends StatefulWidget {
  const PublishPage({super.key});

  @override
  State<PublishPage> createState() => _PublishPageState();
}

class _PublishPageState extends State<PublishPage> {
  static const _cacheKey = 'life:help';

  bool _loading = true;
  bool _fromCache = false;
  String? _cacheTime;
  Map<String, dynamic>? _notice;
  List<Map<String, dynamic>> _feed = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait<dynamic>([
        ApiClient.get('/life/help/list', query: {'pageSize': 20}),
        ApiClient.get('/village/affairs', query: {'pageSize': 1}),
      ]);
      final feed = ((results[0] as Map)['records'] as List? ?? [])
          .whereType<Map>()
          .map((e) => e.cast<String, dynamic>())
          .toList();
      final affairs = ((results[1] as Map)['records'] as List? ?? [])
          .whereType<Map>()
          .map((e) => e.cast<String, dynamic>())
          .toList();
      await OfflineCache.saveList(_cacheKey, feed);
      if (!mounted) return;
      setState(() {
        _feed = feed;
        _notice = affairs.isNotEmpty ? affairs.first : null;
        _fromCache = false;
        _loading = false;
      });
    } catch (_) {
      final cached = await OfflineCache.readList(_cacheKey);
      final cacheTime = await OfflineCache.updatedAt(_cacheKey);
      if (!mounted) return;
      setState(() {
        _feed = cached;
        _fromCache = cached.isNotEmpty;
        _cacheTime = cacheTime;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      floatingActionButton: FloatingActionButton(
        onPressed: _openComposer,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md)),
        child: const Icon(Icons.edit),
      ),
      body: _loading
          ? const Loading(text: '正在加载乡村动态...')
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_fromCache)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: AlertBanner(
                          '当前动态来自离线缓存${_cacheTime == null ? '' : ' · $_cacheTime'}',
                          critical: false),
                    ),
                  _noticeCard(),
                  const SizedBox(height: 24),
                  const Text('乡村动态',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurface)),
                  const SizedBox(height: 16),
                  if (_feed.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: EmptyView('还没有乡村动态，点击右下角发布第一条'),
                    )
                  else
                    for (final p in _feed) ...[
                      _postCard(p),
                      const SizedBox(height: 16),
                    ],
                  const SizedBox(height: 80),
                ],
              ),
            ),
    );
  }

  // 村委通知卡（来自 /village/affairs）
  Widget _noticeCard() {
    final title = '${_notice?['title'] ?? '村委信息暂无更新'}';
    final content =
        '${_notice?['content'] ?? '关注本页获取村委最新通知与公示信息。'}';
    final org = '${_notice?['publishOrg'] ?? '村委会'}';
    final date = _friendlyTime(_notice?['publishDate'] ?? _notice?['createdAt']);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.goldContainer,
        borderRadius: BorderRadius.circular(R.md),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Stack(
        children: [
          Positioned(
            right: -16,
            top: -16,
            child: Icon(Icons.campaign,
                size: 100, color: Colors.white.withValues(alpha: 0.10)),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.campaign, color: Color(0xFFFFEFDA), size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFFFEFDA))),
                    const SizedBox(height: 4),
                    Text(content,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12,
                            height: 1.5,
                            color:
                                const Color(0xFFFFEFDA).withValues(alpha: 0.9))),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(date,
                            style: TextStyle(
                                fontSize: 10,
                                color: const Color(0xFFFFEFDA)
                                    .withValues(alpha: 0.75))),
                        Text(org,
                            style: TextStyle(
                                fontSize: 10,
                                color: const Color(0xFFFFEFDA)
                                    .withValues(alpha: 0.75))),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 动态帖（来自 /life/help）
  Widget _postCard(Map<String, dynamic> p) {
    final type = '${p['type'] ?? '互助'}';
    final title = '${p['title'] ?? ''}';
    final content = '${p['content'] ?? ''}';
    final phone = '${p['contactPhone'] ?? ''}';
    final status = '${p['status'] ?? 'OPEN'}';
    final time = _friendlyTime(p['createdAt']);
    final color = _typeColor(type);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.surfaceHigh),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                  alignment: Alignment.center,
                  child: Text(type.characters.first,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('$type · 乡村互助',
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurface)),
                      Text(time,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
                StatusChip(status == 'DONE' ? '已响应' : '进行中',
                    color: status == 'DONE'
                        ? AppColors.onSurfaceVariant
                        : AppColors.primary),
              ],
            ),
          ),
          if (title.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
              child: Text(title,
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
            ),
          if (content.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Text(content,
                  style: const TextStyle(
                      fontSize: 15, height: 1.5, color: AppColors.onSurface)),
            ),
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Icon(Icons.volunteer_activism,
                    size: 18, color: AppColors.onSurfaceVariant),
                const SizedBox(width: 6),
                const Text('邻里互助',
                    style: TextStyle(
                        fontSize: 12, color: AppColors.onSurfaceVariant)),
                const Spacer(),
                if (phone.isNotEmpty)
                  ElevatedButton.icon(
                    onPressed: () => toast(context, '联系电话：$phone'),
                    icon: const Icon(Icons.call, size: 16),
                    label: const Text('联系 TA'),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      textStyle: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 发布动态
  Future<void> _openComposer() async {
    final titleC = TextEditingController();
    final contentC = TextEditingController();
    final phoneC = TextEditingController();
    var type = '求助';

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(sheetCtx).viewInsets.bottom + 20),
        child: StatefulBuilder(
          builder: (ctx, setSheet) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('发布乡村动态',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  for (final t in ['求助', '互助', '分享', '招工'])
                    ChoiceChip(
                      label: Text(t),
                      selected: type == t,
                      onSelected: (_) => setSheet(() => type = t),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleC,
                decoration: const InputDecoration(
                    labelText: '标题', filled: true),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: contentC,
                maxLines: 3,
                decoration: const InputDecoration(
                    labelText: '详细内容', filled: true),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneC,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                    labelText: '联系电话（选填）', filled: true),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    if (titleC.text.trim().isEmpty) {
                      toast(ctx, '请填写标题', error: true);
                      return;
                    }
                    Navigator.pop(sheetCtx, true);
                  },
                  child: const Text('发布'),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (ok != true || !mounted) return;
    final payload = {
      'type': type,
      'title': titleC.text.trim(),
      'content': contentC.text.trim(),
      'contactPhone': phoneC.text.trim(),
    };
    try {
      await ApiClient.post('/life/help', body: payload);
      if (!mounted) return;
      toast(context, '发布成功');
      _load();
    } catch (_) {
      // 离线：写入同步队列
      await OfflineSyncQueue.enqueue(
        tableName: 'help_request',
        payload: payload,
        path: '/life/help',
      );
      if (!mounted) return;
      toast(context, '当前离线，已存入同步队列，联网后自动发布');
    }
  }

  Color _typeColor(String type) {
    if (type.contains('招工')) return AppColors.goldContainer;
    if (type.contains('分享')) return AppColors.primaryContainer;
    if (type.contains('互助')) return AppColors.secondary;
    return AppColors.primary;
  }

  String _friendlyTime(dynamic value) {
    final text = '$value';
    if (text.length >= 16) return text.substring(0, 16).replaceAll('T', ' ');
    if (text.length >= 10) return text.substring(0, 10);
    return '近期';
  }
}
