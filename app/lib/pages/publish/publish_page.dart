import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/offline_sync_queue.dart';
import '../../widgets/common.dart';

class PublishPage extends StatefulWidget {
  const PublishPage({super.key});

  @override
  State<PublishPage> createState() => _PublishPageState();
}

class _PublishPageState extends State<PublishPage> {
  final _farmContent = TextEditingController(text: '玉米地雨后补记：排水沟已疏通，准备少量追施速效肥。');
  final _cropType = TextEditingController(text: '玉米');
  final _cost = TextEditingController(text: '86');
  final _disasterDescription =
      TextEditingController(text: '北侧低洼地块积水，约 2.5 亩受影响，已拍照留档。');
  final _affectedArea = TextEditingController(text: '2.5');
  final _estimatedLoss = TextEditingController(text: '1800');
  final _envDescription =
      TextEditingController(text: '村口河沟有生活垃圾堆积，气味明显，建议安排清运。');

  String _mode = 'farm';
  String _recordType = '施肥';
  String _disasterType = '暴雨';
  String _problemType = '垃圾堆放';
  bool _submitting = false;
  List<SyncQueueItem> _queue = [];
  String? _lastResult;

  @override
  void initState() {
    super.initState();
    _loadQueue();
  }

  @override
  void dispose() {
    _farmContent.dispose();
    _cropType.dispose();
    _cost.dispose();
    _disasterDescription.dispose();
    _affectedArea.dispose();
    _estimatedLoss.dispose();
    _envDescription.dispose();
    super.dispose();
  }

  Future<void> _loadQueue() async {
    final items = await OfflineSyncQueue.all();
    if (mounted) setState(() => _queue = items);
  }

  Future<void> _syncNow() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      final result = await OfflineSyncQueue.flush();
      if (!mounted) return;
      setState(() {
        _lastResult =
            '本次处理 ${result.total} 条，成功 ${result.success} 条，剩余 ${result.remaining} 条';
      });
      toast(context, result.remaining == 0 ? '演示队列已同步到本机后端' : '仍有数据留在本地队列');
    } catch (e) {
      if (mounted) toast(context, '同步失败：$e', error: true);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
        await _loadQueue();
      }
    }
  }

  Future<void> _submitDemo() async {
    if (_submitting) return;
    setState(() => _submitting = true);

    try {
      final spec = _buildPayload();
      final result = await OfflineSyncQueue.enqueueAndFlush(
        tableName: spec.tableName,
        path: spec.path,
        payload: spec.payload,
      );
      if (!mounted) return;
      setState(() {
        _lastResult =
            result.allSynced ? '已完成本地提交并同步到 SQLite 后端' : '已进入本地演示队列，稍后可手动同步';
      });
      toast(context, result.allSynced ? '发布成功' : '已保存到本地队列');
    } catch (e) {
      if (mounted) toast(context, '提交失败：$e', error: true);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
        await _loadQueue();
      }
    }
  }

  _PayloadSpec _buildPayload() {
    final now = DateTime.now().toIso8601String();
    if (_mode == 'farm') {
      return _PayloadSpec(
        tableName: 'farm_record',
        path: '/agri/record',
        payload: {
          'recordType': _recordType,
          'cropType': _cropType.text.trim(),
          'content': _farmContent.text.trim(),
          'cost': double.tryParse(_cost.text.trim()) ?? 0,
          'recordDate': now,
        },
      );
    }
    if (_mode == 'disaster') {
      return _PayloadSpec(
        tableName: 'disaster_report',
        path: '/disaster/report',
        payload: {
          'disasterType': _disasterType,
          'affectedArea': double.tryParse(_affectedArea.text.trim()) ?? 0,
          'estimatedLoss': double.tryParse(_estimatedLoss.text.trim()) ?? 0,
          'description': _disasterDescription.text.trim(),
          'location': {'lng': 118.74, 'lat': 32.06, 'source': 'demo'},
        },
      );
    }
    return _PayloadSpec(
      tableName: 'env_report',
      path: '/life/env/report',
      payload: {
        'problemType': _problemType,
        'description': _envDescription.text.trim(),
        'location': {'lng': 118.75, 'lat': 32.05, 'source': 'demo'},
      },
    );
  }

  Future<void> _clearQueue() async {
    await OfflineSyncQueue.clear();
    await _loadQueue();
    if (mounted) toast(context, '演示队列已清空');
  }

  @override
  Widget build(BuildContext context) {
    final pending = _queue.length;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _submitting ? null : _submitDemo,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: _submitting
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.cloud_upload_outlined),
        label: Text(_submitting ? '处理中' : '发布演示'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        children: [
          _syncHero(pending),
          const SizedBox(height: 16),
          _modeSwitch(),
          const SizedBox(height: 16),
          _formCard(),
          const SizedBox(height: 16),
          _queueCard(),
          const SectionTitle('乡村动态'),
          _imagePost(context),
          const SizedBox(height: 16),
          _textPost(context),
        ],
      ),
    );
  }

  Widget _syncHero(int pending) {
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: const Icon(Icons.sync_alt_rounded, color: Colors.white),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '比赛演示发布中心',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      '本地暂存 + 一键同步到 SQLite 后端',
                      style: TextStyle(color: AppColors.onPrimaryContainer),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _heroStat('队列', '$pending 条'),
              const SizedBox(width: 10),
              _heroStat('模式', '离线优先'),
              const Spacer(),
              FilledButton.tonalIcon(
                onPressed: _submitting || pending == 0 ? null : _syncNow,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('同步'),
              ),
            ],
          ),
          if (_lastResult != null) ...[
            const SizedBox(height: 10),
            Text(
              _lastResult!,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }

  Widget _heroStat(String label, String value) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.onPrimaryContainer, fontSize: 11)),
            Text(value,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700)),
          ],
        ),
      );

  Widget _modeSwitch() {
    final modes = [
      ('farm', Icons.receipt_long_outlined, '农事'),
      ('disaster', Icons.thunderstorm_outlined, '灾情'),
      ('env', Icons.recycling_outlined, '环境'),
    ];
    return Row(
      children: [
        for (final mode in modes) ...[
          Expanded(
            child: InkWell(
              onTap: () => setState(() => _mode = mode.$1),
              borderRadius: BorderRadius.circular(999),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                height: 44,
                decoration: BoxDecoration(
                  color: _mode == mode.$1
                      ? AppColors.primaryContainer
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: _mode == mode.$1
                        ? AppColors.primaryContainer
                        : AppColors.surfaceHigh,
                  ),
                  boxShadow: _mode == mode.$1 ? AppColors.ambientShadow : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(mode.$2,
                        size: 18,
                        color: _mode == mode.$1
                            ? Colors.white
                            : AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      mode.$3,
                      style: TextStyle(
                        color: _mode == mode.$1
                            ? Colors.white
                            : AppColors.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (mode != modes.last) const SizedBox(width: 8),
        ],
      ],
    );
  }

  Widget _formCard() {
    if (_mode == 'farm') {
      return AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _formHeader(
                Icons.agriculture, '新增农事记录', '演示提交到 farm_record，同步日志可在后台查看'),
            const SizedBox(height: 14),
            _select(
              label: '农事类型',
              value: _recordType,
              items: const ['播种', '施肥', '打药', '灌溉', '收获', '巡田'],
              onChanged: (value) => setState(() => _recordType = value),
            ),
            const SizedBox(height: 12),
            _field('作物', _cropType, icon: Icons.eco_outlined),
            const SizedBox(height: 12),
            _field('投入成本', _cost,
                icon: Icons.payments_outlined,
                keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            _field('记录内容', _farmContent,
                icon: Icons.edit_note_outlined, maxLines: 4),
            const SizedBox(height: 14),
            _submitButton('保存农事记录'),
          ],
        ),
      );
    }
    if (_mode == 'disaster') {
      return AppCard(
        ai: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _formHeader(Icons.thunderstorm_outlined, '灾情快速上报',
                '演示提交到 disaster_report，自动生成受灾等级'),
            const SizedBox(height: 14),
            _select(
              label: '灾害类型',
              value: _disasterType,
              items: const ['暴雨', '冰雹', '干旱', '冻害', '虫灾'],
              onChanged: (value) => setState(() => _disasterType = value),
            ),
            const SizedBox(height: 12),
            _field('受灾面积（亩）', _affectedArea,
                icon: Icons.square_foot_outlined,
                keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            _field('预估损失（元）', _estimatedLoss,
                icon: Icons.price_check_outlined,
                keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            _field('灾情描述', _disasterDescription,
                icon: Icons.report_problem_outlined, maxLines: 4),
            const SizedBox(height: 14),
            _submitButton('提交灾情上报'),
          ],
        ),
      );
    }
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _formHeader(
              Icons.recycling_outlined, '环境问题举报', '演示提交到 env_report，用于乡村治理场景'),
          const SizedBox(height: 14),
          _select(
            label: '问题类型',
            value: _problemType,
            items: const ['垃圾堆放', '水体污染', '焚烧秸秆', '噪音扰民', '其他'],
            onChanged: (value) => setState(() => _problemType = value),
          ),
          const SizedBox(height: 12),
          _field('问题描述', _envDescription,
              icon: Icons.description_outlined, maxLines: 5),
          const SizedBox(height: 14),
          _submitButton('提交环境举报'),
        ],
      ),
    );
  }

  Widget _formHeader(IconData icon, String title, String subtitle) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(R.md),
            ),
            child: Icon(icon, color: AppColors.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      );

  Widget _select({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: _inputDecoration(label, Icons.tune),
      borderRadius: BorderRadius.circular(R.md),
      items: items
          .map((item) => DropdownMenuItem(value: item, child: Text(item)))
          .toList(),
      onChanged: (value) {
        if (value != null) onChanged(value);
      },
    );
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    IconData icon = Icons.edit_outlined,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: _inputDecoration(label, icon),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) =>
      InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: AppColors.primary),
        filled: true,
        fillColor: AppColors.surfaceLow,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: AppColors.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(R.md),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      );

  Widget _submitButton(String label) => SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _submitting ? null : _submitDemo,
          icon: const Icon(Icons.save_alt_rounded, size: 18),
          label: Text(label),
        ),
      );

  Widget _queueCard() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.storage_rounded, color: AppColors.primary),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  '本地同步队列',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
              if (_queue.isNotEmpty)
                TextButton(
                  onPressed: _clearQueue,
                  child: const Text('清空'),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (_queue.isEmpty)
            const Text(
              '暂无待处理数据。提交表单后会先写入本地队列，再尝试同步到本机 SQLite 后端。',
              style: TextStyle(color: AppColors.onSurfaceVariant, height: 1.5),
            )
          else
            Column(
              children: [
                for (final item in _queue.take(4)) _queueTile(item),
                if (_queue.length > 4)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '还有 ${_queue.length - 4} 条演示数据未展示',
                      style: const TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _queueTile(SyncQueueItem item) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Row(
          children: [
            Icon(_tableIcon(item.tableName), color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _tableLabel(item.tableName),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface),
                  ),
                  Text(
                    item.lastError ?? item.localUuid,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 12),
                  ),
                ],
              ),
            ),
            StatusChip(item.status.label,
                color: item.status == SyncStatus.failed
                    ? AppColors.error
                    : item.status == SyncStatus.conflict
                        ? AppColors.warning
                        : AppColors.primary),
          ],
        ),
      );

  IconData _tableIcon(String tableName) {
    if (tableName == 'farm_record') return Icons.receipt_long_outlined;
    if (tableName == 'disaster_report') return Icons.thunderstorm_outlined;
    if (tableName == 'env_report') return Icons.recycling_outlined;
    return Icons.storage_rounded;
  }

  String _tableLabel(String tableName) {
    if (tableName == 'farm_record') return '农事记录';
    if (tableName == 'disaster_report') return '灾情上报';
    if (tableName == 'env_report') return '环境举报';
    return tableName;
  }

  Widget _imagePost(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _postHeader('王', '王大姐农场', '2 小时前 · 幸福村', AppColors.secondary,
              avatarImage: 'assets/images/_1_1.jpg'),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              '今年的阳光玫瑰长势特别好，多亏了 AI 推荐的施肥方案。周末可以开放采摘了，欢迎乡亲们来玩。',
              style: TextStyle(
                  fontSize: 16, height: 1.5, color: AppColors.onSurface),
            ),
          ),
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Image.asset(
              'assets/images/_1_2.jpg',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: AppColors.surfaceContainer,
                child: const Icon(Icons.local_florist,
                    size: 64, color: AppColors.primaryDim),
              ),
            ),
          ),
          _postActions(),
        ],
      ),
    );
  }

  Widget _textPost(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _postHeader('赵', '老赵农机租赁', '昨天 15:30', AppColors.primary),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              '新到两台大马力旋耕机，秋耕预约享受演示折扣。有需要的乡亲可以直接在农机共享页预约。',
              style: TextStyle(
                  fontSize: 16, height: 1.5, color: AppColors.onSurface),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _tag('农机租赁'),
                const SizedBox(width: 8),
                _tag('秋耕服务'),
              ],
            ),
          ),
          _postActions(showCall: true),
        ],
      ),
    );
  }

  Widget _postHeader(String avatar, String name, String meta, Color avatarColor,
      {String? avatarImage}) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          ClipOval(
            child: avatarImage != null
                ? Image.asset(
                    avatarImage,
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        _initialAvatar(avatar, avatarColor),
                  )
                : _initialAvatar(avatar, avatarColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                ),
                Text(
                  meta,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.more_horiz, color: AppColors.primary),
        ],
      ),
    );
  }

  Widget _initialAvatar(String text, Color color) => Container(
        width: 40,
        height: 40,
        color: color,
        alignment: Alignment.center,
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      );

  Widget _postActions({bool showCall = false}) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          _action(Icons.favorite_border, '128'),
          const SizedBox(width: 20),
          _action(Icons.chat_bubble_outline, '34'),
          const SizedBox(width: 20),
          _action(Icons.share_outlined, null),
          if (showCall) ...[
            const Spacer(),
            ElevatedButton.icon(
              onPressed: () => toast(context, '比赛演示：已打开联系机主流程'),
              icon: const Icon(Icons.call, size: 16),
              label: const Text('联系'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(0, 36),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                textStyle:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _action(IconData icon, String? count) => Row(
        children: [
          Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
          if (count != null) ...[
            const SizedBox(width: 4),
            Text(
              count,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.onSurfaceVariant),
            ),
          ],
        ],
      );

  Widget _tag(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.surfaceHigh,
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Text(
          text,
          style:
              const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
        ),
      );
}

class _PayloadSpec {
  final String tableName;
  final String path;
  final Map<String, dynamic> payload;

  const _PayloadSpec({
    required this.tableName,
    required this.path,
    required this.payload,
  });
}
