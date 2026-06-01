import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';

class MachineryPage extends StatefulWidget {
  const MachineryPage({super.key});

  @override
  State<MachineryPage> createState() => _MachineryPageState();
}

// ── 数据模型 ────────────────────────────────────────────

class _Machine {
  final int? id;
  final String image;
  final String name;
  final String type;
  final double price;
  final double deposit;
  final double rating;
  final String owner;
  final String distance;
  final bool fromApi;

  const _Machine({
    this.id,
    required this.image,
    required this.name,
    required this.type,
    required this.price,
    required this.deposit,
    required this.rating,
    required this.owner,
    required this.distance,
    this.fromApi = false,
  });

  factory _Machine.fromApi(Map<String, dynamic> json, int index) {
    return _Machine(
      id: json['id'] as int?,
      image: 'assets/images/_5_2.jpg',
      name: '${json['machineName'] ?? '共享农机'}',
      type: '${json['machineType'] ?? '通用农机'}',
      price: (json['dailyPrice'] as num?)?.toDouble() ?? 0,
      deposit: (json['deposit'] as num?)?.toDouble() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      owner: '机主 ${json['ownerId'] ?? '-'}',
      distance: '${2.5 + index * 1.1} km',
      fromApi: true,
    );
  }
}

// ── 页面状态 ────────────────────────────────────────────

class _MachineryPageState extends State<MachineryPage> {
  static const _cacheKey = 'machinery:list';

  // 搜索
  final _keywordCtrl = TextEditingController();
  String _keyword = '';

  // 筛选：数据驱动
  List<String> _filterChips = ['全部'];
  int _activeFilter = 0;

  // 数据
  var _loading = true;
  var _fromCache = false;
  String? _cacheTime;
  String? _error;
  List<_Machine> _machines = [];

  // 已加载的完整列表（用于本地关键字过滤）
  List<_Machine> _allMachines = [];

  static const _fallback = [
    _Machine(
      image: 'assets/images/_5_2.jpg',
      name: '示例农机 · 资料更新中',
      type: '100 马力 · 轮式拖拉机',
      price: 150,
      deposit: 1000,
      rating: 4.9,
      owner: '示例机主',
      distance: '2.5 km',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadMachines(initChips: true);
  }

  @override
  void dispose() {
    _keywordCtrl.dispose();
    super.dispose();
  }

  // K2：进页先拉全量取 distinct 类型
  Future<void> _loadMachines({bool initChips = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final typeQuery = _activeTypeQuery;
      final data = await ApiClient.get('/machinery/list', query: {
        'pageSize': 50,
        'onlyAvailable': 1,
        if (typeQuery != null) 'machineType': typeQuery,
      });
      final records = (data['records'] as List? ?? [])
          .whereType<Map>()
          .map((item) => item.cast<String, dynamic>())
          .toList();
      await OfflineCache.saveList('$_cacheKey:${typeQuery ?? 'all'}', records);
      if (!mounted) return;

      final machines = [
        for (var i = 0; i < records.length; i++) _Machine.fromApi(records[i], i),
      ];

      // K2：首次加载时从 records 取 distinct machineType 生成 chips
      if (initChips) {
        final distinctTypes = records
            .map((r) => '${r['machineType'] ?? ''}')
            .where((t) => t.isNotEmpty)
            .toSet()
            .toList();
        distinctTypes.sort();
        _filterChips = ['全部', ...distinctTypes];
      }

      _allMachines = machines.isEmpty ? _fallback : machines;
      setState(() {
        _machines = _applyKeyword(_allMachines);
        _fromCache = false;
        _loading = false;
      });
    } catch (error) {
      final typeQuery = _activeTypeQuery;
      final key = '$_cacheKey:${typeQuery ?? 'all'}';
      final cached = await OfflineCache.readList(key);
      final cacheTime = await OfflineCache.updatedAt(key);
      if (!mounted) return;
      final machines = cached.isNotEmpty
          ? [for (var i = 0; i < cached.length; i++) _Machine.fromApi(cached[i], i)]
          : _fallback;
      _allMachines = machines;
      setState(() {
        _machines = _applyKeyword(_allMachines);
        _fromCache = cached.isNotEmpty;
        _cacheTime = cacheTime;
        _error = cached.isNotEmpty ? null : serviceUnavailableMessage;
        _loading = false;
      });
    }
  }

  // K1：本地关键字过滤
  List<_Machine> _applyKeyword(List<_Machine> source) {
    if (_keyword.trim().isEmpty) return source;
    final kw = _keyword.trim().toLowerCase();
    return source
        .where((m) =>
            m.name.toLowerCase().contains(kw) ||
            m.type.toLowerCase().contains(kw))
        .toList();
  }

  void _onSearch() {
    setState(() {
      _keyword = _keywordCtrl.text;
      _machines = _applyKeyword(_allMachines);
    });
  }

  String? get _activeTypeQuery {
    if (_activeFilter == 0 || _activeFilter >= _filterChips.length) return null;
    return _filterChips[_activeFilter]; // 直传原值，不再硬编码映射
  }

  // ── build ────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(showBack: true, actions: [
        // M1 发布农机入口
        IconButton(
          tooltip: '发布农机',
          onPressed: _openPublishSheet,
          icon: const Icon(Icons.add_circle_outline,
              color: AppColors.onSurfaceVariant),
        ),
        // 原有农机服务入口
        IconButton(
          tooltip: '农机服务',
          onPressed: () => context.push('/machinery/service'),
          icon: const Icon(Icons.dashboard_customize_outlined,
              color: AppColors.onSurfaceVariant),
        ),
      ]),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => _loadMachines(initChips: true),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // K1 真搜索框
                    _searchBar(),
                    const SizedBox(height: 12),
                    // K2 数据驱动筛选
                    _filterRow(),
                    if (_fromCache) ...[
                      const SizedBox(height: 10),
                      AlertBanner(
                        '农机数据更新中${_cacheTime == null ? '' : ' · 上次同步 $_cacheTime'}',
                        critical: false,
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      AppCard(
                        color: AppColors.errorContainer,
                        child: Text(_error!,
                            style: const TextStyle(color: AppColors.error)),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // L1 地图收到 1/3 屏
                    _mapBlock(context),
                    const SizedBox(height: 16),
                    const SectionTitle('附近农机'),
                  ],
                ),
              ),
            ),
            // L2 农机列表
            if (_loading)
              const SliverFillRemaining(
                child: Loading(text: '正在同步附近农机...'),
              )
            else if (_machines.isEmpty)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: AppCard(
                    child: Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text(
                          '附近暂无可租农机',
                          style: TextStyle(
                              color: AppColors.onSurfaceVariant, fontSize: 15),
                        ),
                      ),
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                sliver: SliverList.separated(
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemCount: _machines.length,
                  itemBuilder: (ctx, i) =>
                      _MachineListCard(
                        machine: _machines[i],
                        onTap: () => _openBookingSheet(ctx, _machines[i]),
                      ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── K1 真搜索框 ──────────────────────────────────────

  Widget _searchBar() {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.sm),
        border: Border.all(color: AppColors.outlineVariant, width: 1.5),
      ),
      padding: const EdgeInsets.only(left: 14, right: 6),
      child: Row(
        children: [
          const Icon(Icons.search, color: AppColors.onSurfaceVariant, size: 21),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _keywordCtrl,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _onSearch(),
              // 自定义容器内的输入框：清掉主题里的填充与下划线
              decoration: const InputDecoration(
                hintText: '搜索农机名称或类型',
                hintStyle: TextStyle(fontSize: 14, color: AppColors.outline),
                filled: false,
                isCollapsed: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
              style: const TextStyle(fontSize: 15, color: AppColors.onSurface),
            ),
          ),
          const SizedBox(width: 8),
          // 方角品牌绿搜索按钮（取代原灰色圆形 tune 钮）
          GestureDetector(
            onTap: _onSearch,
            child: Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 18),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(R.sm - 2),
              ),
              child: const Text(
                '搜索',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── K2 数据驱动筛选行 ─────────────────────────────────

  Widget _filterRow() {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _filterChips.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final active = index == _activeFilter;
          return InkWell(
            onTap: () {
              setState(() => _activeFilter = index);
              _loadMachines();
            },
            borderRadius: BorderRadius.circular(R.sm),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.circular(R.sm),
                border: active
                    ? null
                    : Border.all(color: AppColors.outlineVariant, width: 1.5),
                boxShadow: active ? null : AppColors.ambientShadow,
              ),
              child: Text(
                _filterChips[index],
                style: TextStyle(
                  color: active ? Colors.white : AppColors.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ── L1 地图区块（收到约 1/3 屏）────────────────────────

  Widget _mapBlock(BuildContext context) {
    final mapHeight = MediaQuery.of(context).size.height * 0.28;
    return ClipRRect(
      borderRadius: BorderRadius.circular(R.md),
      child: SizedBox(
        height: mapHeight.clamp(220.0, 260.0),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 背景图（保留，后期接真实地图）
            Image.asset(
              'assets/images/_5_1.jpg',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const ColoredBox(color: Color(0xFF315A35)),
            ),
            // 装饰性地图浮层（轻深色，无半透明白浮层）
            const ColoredBox(color: Color(0x1A1A1C1C)),
            // 装饰性 marker
            ..._buildMapMarkers(),
            // 右上角标：即将上线
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withValues(alpha: 0.88),
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: AppColors.ambientShadow,
                ),
                child: const Text(
                  '地图功能即将上线',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildMapMarkers() {
    // 装饰性点位，不再承担"选中"职责
    const positions = [
      Offset(0.18, 0.35),
      Offset(0.45, 0.55),
      Offset(0.72, 0.28),
      Offset(0.60, 0.70),
    ];
    return [
      for (final p in positions)
        Align(
          alignment: Alignment(p.dx * 2 - 1, p.dy * 2 - 1),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.80),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: AppColors.ambientShadow,
            ),
            child: const Icon(Icons.agriculture,
                color: Colors.white, size: 18),
          ),
        ),
    ];
  }

  // ── L3 预约 sheet ────────────────────────────────────

  void _openBookingSheet(BuildContext context, _Machine machine) {
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => _BookingSheet(machine: machine),
    );
  }

  // ── M1 发布农机 sheet ─────────────────────────────────

  void _openPublishSheet() {
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => _PublishMachineSheet(
        onSuccess: () => _loadMachines(initChips: true),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════
// L2 · 农机列表卡（横向：左图 + 右信息，一屏 3~4 张）
// ═══════════════════════════════════════════════════════

class _MachineListCard extends StatelessWidget {
  final _Machine machine;
  final VoidCallback onTap;
  const _MachineListCard({required this.machine, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.md),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(R.md),
            boxShadow: AppColors.ambientShadow,
          ),
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 左缩略图 ~84px
              ClipRRect(
                borderRadius: BorderRadius.circular(R.sm),
                child: Image.asset(
                  machine.image,
                  width: 84,
                  height: 84,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 84,
                    height: 84,
                    color: AppColors.surfaceContainer,
                    child: const Icon(Icons.agriculture,
                        color: AppColors.primary, size: 36),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // 右信息区
              Expanded(
                child: SizedBox(
                  height: 84,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // 名称 + 状态
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              machine.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.onSurface,
                              ),
                            ),
                          ),
                          if (machine.id == null)
                            const StatusChip('更新中',
                                color: AppColors.outline),
                        ],
                      ),
                      // 类型
                      Text(
                        machine.type,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.onSurfaceVariant),
                      ),
                      // 价格 + 评分
                      Row(
                        children: [
                          Text(
                            '￥${machine.price.toStringAsFixed(0)}/天',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.star,
                              color: AppColors.gold, size: 14),
                          const SizedBox(width: 2),
                          Text(
                            machine.rating.toStringAsFixed(1),
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant),
                          ),
                          const Spacer(),
                          // 押金 + 距离
                          Text(
                            '押金￥${machine.deposit.toStringAsFixed(0)} · ${machine.distance}',
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════
// L3 · 真实预约 sheet（选日期 + 金额预览）
// ═══════════════════════════════════════════════════════

class _BookingSheet extends StatefulWidget {
  final _Machine machine;
  const _BookingSheet({required this.machine});

  @override
  State<_BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends State<_BookingSheet> {
  late DateTime _startDate;
  late DateTime _endDate;
  final _remarkCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate = now.add(const Duration(days: 1));
    _endDate = now.add(const Duration(days: 2));
  }

  @override
  void dispose() {
    _remarkCtrl.dispose();
    super.dispose();
  }

  int get _days {
    final diff = _endDate.difference(_startDate).inDays + 1;
    return diff < 1 ? 1 : diff;
  }

  double get _estimatedRent => widget.machine.price * _days;

  Future<void> _pickStart() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      _startDate = picked;
      if (_endDate.isBefore(_startDate)) {
        _endDate = _startDate.add(const Duration(days: 1));
      }
    });
  }

  Future<void> _pickEnd() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate.isBefore(_startDate) ? _startDate : _endDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() => _endDate = picked);
  }

  Future<void> _submit() async {
    if (widget.machine.id == null) return;
    setState(() => _submitting = true);
    try {
      await ApiClient.post('/machinery/booking', body: {
        'machineryId': widget.machine.id,
        'startDate': _formatDate(_startDate),
        'endDate': _formatDate(_endDate),
        'remark': _remarkCtrl.text.trim(),
      });
      if (!mounted) return;
      Navigator.pop(context);
      toast(context, '预约已提交，等待机主确认');
    } catch (e) {
      if (mounted) {
        toast(context, actionErrorMessage('预约', e), error: true);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final machine = widget.machine;
    final canBook = machine.id != null;

    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 拖拽把手
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              '预约 · ${machine.name}',
              style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface),
            ),
            if (!canBook) ...[
              const SizedBox(height: 10),
              const AlertBanner('农机资料更新中，请稍后预约', critical: false),
            ],
            const SizedBox(height: 16),
            // 日期选择
            Row(
              children: [
                Expanded(
                  child: _DateTile(
                    label: '起租日期',
                    date: _startDate,
                    onTap: canBook ? _pickStart : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateTile(
                    label: '归还日期',
                    date: _endDate,
                    onTap: canBook ? _pickEnd : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // 金额预览
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(R.md),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _PreviewRow('租期天数', '$_days 天'),
                  const SizedBox(height: 6),
                  _PreviewRow(
                    '预计租金',
                    '￥${_estimatedRent.toStringAsFixed(0)}',
                    highlight: true,
                  ),
                  const SizedBox(height: 6),
                  _PreviewRow(
                    '押金',
                    '￥${machine.deposit.toStringAsFixed(0)}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            // 备注（选填）
            TextField(
              controller: _remarkCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: '备注（选填）',
                filled: true,
              ),
              enabled: canBook,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: (canBook && !_submitting) ? _submit : null,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('确认预约'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateTile extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback? onTap;
  const _DateTile(
      {required this.label, required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.md),
          border: Border.all(color: AppColors.outlineVariant, width: 1.5),
          boxShadow: AppColors.ambientShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.calendar_today,
                    size: 14, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(
                  _formatDate(date),
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PreviewRow extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;
  const _PreviewRow(this.label, this.value, {this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13, color: AppColors.onSurfaceVariant)),
        Text(value,
            style: TextStyle(
              fontSize: highlight ? 16 : 13,
              fontWeight: highlight ? FontWeight.w700 : FontWeight.w400,
              color: highlight ? AppColors.primary : AppColors.onSurface,
            )),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════
// M1 · 发布农机 sheet
// ═══════════════════════════════════════════════════════

class _PublishMachineSheet extends StatefulWidget {
  final VoidCallback onSuccess;
  const _PublishMachineSheet({required this.onSuccess});

  @override
  State<_PublishMachineSheet> createState() => _PublishMachineSheetState();
}

class _PublishMachineSheetState extends State<_PublishMachineSheet> {
  static const _typeOptions = ['拖拉机', '收割机', '插秧机', '植保机', '其他'];

  final _nameCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _depositCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _machineType = '拖拉机';
  bool _submitting = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _priceCtrl.dispose();
    _depositCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty) {
      toast(context, '请填写农机名称');
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiClient.post('/machinery', body: {
        'machineName': _nameCtrl.text.trim(),
        'machineType': _machineType,
        'dailyPrice': double.tryParse(_priceCtrl.text) ?? 0,
        'deposit': double.tryParse(_depositCtrl.text) ?? 0,
        'description': _descCtrl.text.trim(),
      });
      if (!mounted) return;
      Navigator.pop(context);
      toast(context, '农机已发布');
      widget.onSuccess();
    } catch (e) {
      if (mounted) {
        toast(context, actionErrorMessage('发布', e), error: true);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text(
              '发布农机',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface),
            ),
            const SizedBox(height: 16),
            // 农机名称（必填）
            _Field(_nameCtrl, '农机名称（必填）'),
            // 农机类型 ChoiceChip
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text('农机类型',
                  style: TextStyle(
                      fontSize: 13, color: AppColors.onSurfaceVariant)),
            ),
            _ChipsField(
              options: _typeOptions,
              selected: _machineType,
              onChanged: (v) => setState(() => _machineType = v),
            ),
            const SizedBox(height: 12),
            // 日租金
            _Field(_priceCtrl, '日租金（元/天）', number: true),
            // 押金
            _Field(_depositCtrl, '押金（元）', number: true),
            // 描述
            _Field(_descCtrl, '农机描述（选填）', lines: 2),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('发布'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── 通用表单控件（内部复用，不跨文件 import）────────────

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool number;
  final int lines;
  const _Field(this.controller, this.label,
      {this.number = false, this.lines = 1});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        maxLines: lines,
        keyboardType:
            number ? TextInputType.number : TextInputType.text,
        decoration: InputDecoration(labelText: label, filled: true),
      ),
    );
  }
}

class _ChipsField extends StatelessWidget {
  final List<String> options;
  final String selected;
  final ValueChanged<String> onChanged;
  const _ChipsField(
      {required this.options,
      required this.selected,
      required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Wrap(
        spacing: 8,
        runSpacing: 4,
        children: [
          for (final o in options)
            ChoiceChip(
              label: Text(o),
              selected: selected == o,
              onSelected: (_) => onChanged(o),
            ),
        ],
      ),
    );
  }
}

// ── 工具函数 ─────────────────────────────────────────────

String _formatDate(DateTime value) =>
    value.toIso8601String().substring(0, 10);
