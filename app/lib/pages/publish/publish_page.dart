import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

const _helpPublishTypes = ['互助求助', '招工', '分享见闻', '失物招领'];
const _secondhandPublishTypes = ['二手交易', '闲置共享'];

/// 发布 · 乡村动态 — 接入服务端 /life/help + /village/affairs（样式复刻设计稿 _1）
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
      // 发布入口改为 AppBar 右上「+」，避免 FAB 被底栏（ShellPage bottomNav）遮挡
      appBar: FarmAppBar(
        actions: [
          IconButton(
            tooltip: '发布动态',
            onPressed: _openComposer,
            icon:
                const Icon(Icons.add_circle_outline, color: AppColors.primary),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications_none,
                color: AppColors.onSurfaceVariant),
          ),
        ],
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
                          '动态数据更新中${_cacheTime == null ? '' : ' · 上次同步 $_cacheTime'}',
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
                      child: EmptyView('还没有乡村动态，点击右上角发布第一条'),
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
    final content = '${_notice?['content'] ?? '关注本页获取村委最新通知与公示信息。'}';
    final org = '${_notice?['publishOrg'] ?? '村委会'}';
    final date =
        _friendlyTime(_notice?['publishDate'] ?? _notice?['createdAt']);
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
                            color: const Color(0xFFFFEFDA)
                                .withValues(alpha: 0.9))),
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
    final color = _typeColorOf(type);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(R.md),
        onTap: () => _openDetail(p),
        child: Container(
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
                      decoration:
                          BoxDecoration(color: color, shape: BoxShape.circle),
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
                          Text('$type · 乡村动态',
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface)),
                          Text(time,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.onSurfaceVariant)),
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
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15,
                          height: 1.5,
                          color: AppColors.onSurface)),
                ),
              Container(
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
        ),
      ),
    );
  }

  Future<void> _openDetail(Map<String, dynamic> post) async {
    if (!mounted) return;
    final result = await context.push('/publish/detail', extra: post);
    if (result == true && mounted) _load();
  }

  // 发布动态
  Future<void> _openComposer() async {
    final titleC = TextEditingController();
    final contentC = TextEditingController();
    final phoneC = TextEditingController();
    final priceC = TextEditingController();
    var type = '互助求助';
    const types = [..._helpPublishTypes, ..._secondhandPublishTypes];

    final ok = await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
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
              const SizedBox(height: 4),
              const Text('选择类型，详细描述后发布到乡村动态广场',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 14),
              const Text('特殊上报',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(sheetCtx, false);
                        context.push('/disaster');
                      },
                      icon: const Icon(Icons.thunderstorm_outlined, size: 16),
                      label: const Text('灾情上报'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(sheetCtx, false);
                        context.push('/agri');
                      },
                      icon: const Icon(Icons.eco_outlined, size: 16),
                      label: const Text('农事记录'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('动态类型',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final t in types)
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
                decoration:
                    InputDecoration(labelText: _titleLabel(type), filled: true),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: contentC,
                maxLines: 4,
                minLines: 3,
                decoration: InputDecoration(
                  labelText: _contentLabel(type),
                  filled: true,
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneC,
                keyboardType: TextInputType.phone,
                decoration:
                    const InputDecoration(labelText: '联系电话（选填）', filled: true),
              ),
              if (type == '二手交易') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: priceC,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: '售价（元）',
                    hintText: '例如 80.00',
                    filled: true,
                  ),
                ),
              ],
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
                    if (type == '二手交易' &&
                        (double.tryParse(priceC.text.trim()) ?? 0) <= 0) {
                      toast(ctx, '请填写售价', error: true);
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

    if (ok != true || !mounted) {
      titleC.dispose();
      contentC.dispose();
      phoneC.dispose();
      priceC.dispose();
      return;
    }
    final title = titleC.text.trim();
    final content = contentC.text.trim();
    final phone = phoneC.text.trim();
    final price = type == '二手交易' ? double.tryParse(priceC.text.trim()) ?? 0 : 0;
    titleC.dispose();
    contentC.dispose();
    phoneC.dispose();
    priceC.dispose();
    final payload = <String, dynamic>{
      'type': type,
      'title': title,
      'content': content,
      'contactPhone': phone,
    };
    final isSecondhand = _secondhandPublishTypes.contains(type);
    final postPath = isSecondhand ? '/life/secondhand' : '/life/help';
    final tableName = isSecondhand ? 'secondhand_item' : 'help_request';
    final postBody = <String, dynamic>{
      ...(isSecondhand
          ? {
              'title': payload['title'],
              'description': payload['content'],
              'category': type,
              'price': price,
              'contactPhone': payload['contactPhone'],
            }
          : payload),
    };
    try {
      await ApiClient.post(postPath, body: postBody);
      if (!mounted) return;
      toast(context, '$type 发布成功');
      _load();
    } catch (_) {
      await OfflineSyncQueue.enqueue(
        tableName: tableName,
        payload: postBody,
        path: postPath,
      );
      if (!mounted) return;
      toast(context, '已加入待发送队列，将自动发布');
    }
  }

  String _titleLabel(String type) {
    if (type == '二手交易' || type == '闲置共享') return '物品名称';
    if (type == '失物招领') return '失物 / 招领描述';
    if (type == '招工') return '招工岗位';
    if (type == '分享见闻') return '标题';
    return '需要什么帮助';
  }

  String _contentLabel(String type) {
    if (type == '二手交易') return '物品成色 / 取货地点';
    if (type == '闲置共享') return '物品功能 / 借用规则';
    if (type == '失物招领') return '丢失时间 / 地点 / 特征';
    if (type == '招工') return '工作内容 / 时间 / 薪酬';
    if (type == '分享见闻') return '想分享的内容';
    return '详细描述（时间、地点、需要怎么帮）';
  }

  String _friendlyTime(dynamic value) {
    final text = '$value';
    if (text.length >= 16) return text.substring(0, 16).replaceAll('T', ' ');
    if (text.length >= 10) return text.substring(0, 10);
    return '近期';
  }
}

// ═══════════════════════════════════════════════════════
// 动态详情页（独立页面，由动态卡点击进入）
// ═══════════════════════════════════════════════════════

class PostDetailPage extends StatefulWidget {
  final Map<String, dynamic> post;
  const PostDetailPage({super.key, required this.post});

  @override
  State<PostDetailPage> createState() => _PostDetailPageState();
}

class _PostDetailPageState extends State<PostDetailPage> {
  bool _accepting = false;

  Future<void> _accept() async {
    final id = widget.post['id'];
    if (id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('我能帮 TA'),
        content: const Text('确认响应这条动态并与发布人联系吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('确认'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _accepting = true);
    try {
      await ApiClient.post('/life/help/$id/accept');
      if (!mounted) return;
      toast(context, '已响应，感谢您的帮助');
      context.pop(true);
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('响应', e), error: true);
    } finally {
      if (mounted) setState(() => _accepting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final currentUserId = context.read<AuthState>().user?.id;
    final ownerId =
        post['userId'] is num ? (post['userId'] as num).toInt() : null;
    final isMine = currentUserId != null && ownerId == currentUserId;
    final type = '${post['type'] ?? '互助'}';
    final title = '${post['title'] ?? '-'}';
    final content = '${post['content'] ?? ''}';
    final phone = '${post['contactPhone'] ?? ''}';
    final status = '${post['status'] ?? 'OPEN'}';
    final author = '${post['publisherName'] ?? post['userName'] ?? '乡村用户'}';
    final time = _friendlyTimeOf(post['createdAt']);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(showBack: true),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              StatusChip(type, color: _typeColorOf(type)),
              const SizedBox(width: 8),
              StatusChip(
                status == 'DONE' ? '已响应' : '进行中',
                color: status == 'DONE'
                    ? AppColors.onSurfaceVariant
                    : AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$author · $time',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            content.isEmpty ? '（暂无详细描述）' : content,
            style: const TextStyle(
              fontSize: 15,
              height: 1.6,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 24),
          if (phone.isNotEmpty)
            AppCard(
              child: Row(
                children: [
                  const Icon(Icons.phone, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '联系方式',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          phone,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => toast(context, '联系电话：$phone'),
                    icon: const Icon(Icons.call, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          if (status != 'DONE' && !isMine)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _accepting ? null : _accept,
                icon: _accepting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.volunteer_activism, size: 18),
                label: Text(_accepting ? '提交中' : '我能帮 TA'),
              ),
            )
          else if (isMine)
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.person_outline, size: 18),
              label: const Text('这是我发布的动态'),
            ),
        ],
      ),
    );
  }
}

Color _typeColorOf(String type) {
  if (type.contains('招工')) return AppColors.goldContainer;
  if (type.contains('分享')) return AppColors.primaryContainer;
  if (type.contains('互助') || type.contains('求助')) return AppColors.primary;
  if (type.contains('二手') || type.contains('闲置')) return AppColors.secondary;
  if (type.contains('失物')) return AppColors.warning;
  return AppColors.primary;
}

String _friendlyTimeOf(dynamic value) {
  final text = '$value';
  if (text.length >= 16) return text.substring(0, 16).replaceAll('T', ' ');
  if (text.length >= 10) return text.substring(0, 10);
  return '近期';
}
