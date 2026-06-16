import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';
import '../../widgets/section_tool_chips.dart';

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
    final type = '${json['machineType'] ?? '通用农机'}';
    return _Machine(
      id: json['id'] as int?,
      image: _imageFromJson(json, type),
      name: '${json['machineName'] ?? '共享农机'}',
      type: type,
      price: (json['dailyPrice'] as num?)?.toDouble() ?? 0,
      deposit: (json['deposit'] as num?)?.toDouble() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      owner: '机主 ${json['ownerId'] ?? '-'}',
      // 后端尚未提供距离字段，按列表序生成的占位距离需定格 1 位小数，
      // 否则浮点累加会露出 "5.800000000000001 km" 这类脏数据。
      distance: '${(2.5 + index * 1.1).toStringAsFixed(1)} km',
      fromApi: true,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'image': image,
        'name': name,
        'type': type,
        'price': price,
        'deposit': deposit,
        'rating': rating,
        'owner': owner,
        'distance': distance,
        'fromApi': fromApi,
      };

  factory _Machine.fromMap(Map<String, dynamic> map) => _Machine(
        id: map['id'] as int?,
        image: map['image'] as String? ?? '',
        name: map['name'] as String? ?? '',
        type: map['type'] as String? ?? '',
        price: (map['price'] as num?)?.toDouble() ?? 0,
        deposit: (map['deposit'] as num?)?.toDouble() ?? 0,
        rating: (map['rating'] as num?)?.toDouble() ?? 0,
        owner: map['owner'] as String? ?? '',
        distance: map['distance'] as String? ?? '',
        fromApi: map['fromApi'] as bool? ?? false,
      );

  static String _imageFromJson(Map<String, dynamic> json, String type) {
    for (final key in const [
      'image',
      'imageUrl',
      'cover',
      'coverUrl',
      'thumbnail',
      'thumbnailUrl',
      'photo',
      'photoUrl',
      'picture',
      'pictureUrl',
    ]) {
      final value = _text(json[key]);
      if (value.isNotEmpty) return value;
    }
    for (final key in const ['images', 'photos']) {
      final value = json[key];
      if (value is List && value.isNotEmpty) {
        final first = value.first;
        final text = first is Map
            ? _text(first['url'] ?? first['imageUrl'])
            : _text(first);
        if (text.isNotEmpty) return text;
      }
    }
    return _fallbackImageForType(type);
  }

  static String _fallbackImageForType(String type) =>
      'assets/images/generated/machinery-sharing.jpg';

  static String _text(dynamic value) {
    final text = '$value'.trim();
    return text == 'null' ? '' : text;
  }
}

Widget _machineImage(String image,
    {required double width, required double height, double iconSize = 36}) {
  final source = image.trim().isEmpty
      ? 'assets/images/generated/machinery-sharing.jpg'
      : image.trim();
  final fallback = Container(
    width: width,
    height: height,
    color: AppColors.surfaceContainer,
    child: Icon(Icons.agriculture, color: AppColors.primary, size: iconSize),
  );
  if (source.startsWith('http://') ||
      source.startsWith('https://') ||
      source.startsWith('/')) {
    return Image.network(
      ApiClient.resolveImageUrl(source),
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
  return SiteImage(
    source,
    width: width,
    height: height,
    fit: BoxFit.cover,
    errorFallback: fallback,
  );
}

// ── 页面状态 ────────────────────────────────────────────

class _MachineryPageState extends State<MachineryPage> {
  static const _cacheKey = 'machinery:list';
  static const _mapMarkerPositions = [
    Offset(0.18, 0.35),
    Offset(0.45, 0.55),
    Offset(0.72, 0.28),
    Offset(0.60, 0.70),
  ];

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
  int? _selectedMapIndex;
  List<_Machine> _machines = [];

  // 已加载的完整列表（用于前端关键字过滤）
  List<_Machine> _allMachines = [];

  static const _fallback = [
    _Machine(
      image: 'assets/images/generated/machinery-sharing.jpg',
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
      _selectedMapIndex = null;
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
        for (var i = 0; i < records.length; i++)
          _Machine.fromApi(records[i], i),
      ];

      // K2：从 records 取 distinct machineType 生成 chips。
      // 仅在「全部」（无类型过滤）的响应上重算，否则按类型过滤的响应
      // 只含单一类型，会把其余 chip 抹掉。
      if (initChips && typeQuery == null) {
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
        _selectedMapIndex = null;
      });
    } catch (error) {
      final typeQuery = _activeTypeQuery;
      final key = '$_cacheKey:${typeQuery ?? 'all'}';
      final cached = await OfflineCache.readList(key);
      final cacheTime = await OfflineCache.updatedAt(key);
      if (!mounted) return;
      final machines = cached.isNotEmpty
          ? [
              for (var i = 0; i < cached.length; i++)
                _Machine.fromApi(cached[i], i)
            ]
          : _fallback;
      _allMachines = machines;
      setState(() {
        _machines = _applyKeyword(_allMachines);
        _fromCache = cached.isNotEmpty;
        _cacheTime = cacheTime;
        _error = cached.isNotEmpty ? null : serviceUnavailableMessage;
        _loading = false;
        _selectedMapIndex = null;
      });
    }
  }

  // K1：前端关键字过滤
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
      _keyword = _keywordCtrl.text.trim();
      _machines = _applyKeyword(_allMachines);
      _selectedMapIndex = null;
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
      appBar: FarmAppBar(title: '农机共享', showBack: true, actions: [
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
                    const SectionToolChips(section: 'machinery'),
                    const SizedBox(height: 8),
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
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _flatBox(
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text(
                          '附近还没有可租农机',
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
                  itemBuilder: (ctx, i) => _MachineListCard(
                    machine: _machines[i],
                    onTap: () => _openMachineDetail(_machines[i]),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── K1 真搜索框（统一用全局 AppSearchField）──────────────

  Widget _searchBar() => AppSearchField(
        controller: _keywordCtrl,
        hintText: '搜索农机名称或类型',
        onSubmitted: (_) => _onSearch(),
        onClear: _onSearch,
      );

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
              setState(() {
                _activeFilter = index;
                _selectedMapIndex = null;
              });
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
        child: LayoutBuilder(
          builder: (context, constraints) {
            final markerCount =
                math.min(_machines.length, _mapMarkerPositions.length);
            return Stack(
              fit: StackFit.expand,
              children: [
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: _clearSelectedMapMarker,
                    child: const Stack(
                      fit: StackFit.expand,
                      children: [
                        SiteImage(
                          'assets/images/generated/farmland-map.jpg',
                          fit: BoxFit.cover,
                          errorFallback: ColoredBox(color: Color(0xFF315A35)),
                        ),
                        ColoredBox(color: Color(0x1A1A1C1C)),
                      ],
                    ),
                  ),
                ),
                ..._buildMapMarkers(constraints, markerCount),
                Positioned(
                  top: 12,
                  right: 12,
                  child: _mapCountChip(markerCount),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Widget> _buildMapMarkers(BoxConstraints constraints, int markerCount) {
    final widgets = <Widget>[
      for (var index = 0; index < markerCount; index++)
        _mapMarker(constraints, index),
    ];
    final selectedIndex = _selectedMapIndex;
    if (selectedIndex != null &&
        selectedIndex >= 0 &&
        selectedIndex < markerCount) {
      widgets.add(_mapCallout(constraints, selectedIndex));
    }
    return widgets;
  }

  Widget _mapMarker(BoxConstraints constraints, int index) {
    final position = _mapMarkerPositions[index];
    final width = _safeExtent(constraints.maxWidth, 360);
    final height = _safeExtent(constraints.maxHeight, 240);
    final selected = _selectedMapIndex == index;
    final markerSize = selected ? 44.0 : 36.0;
    final x = position.dx * width;
    final y = position.dy * height;

    return Positioned(
      left: x - markerSize / 2,
      top: y - markerSize / 2,
      width: markerSize,
      height: markerSize,
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedMapIndex = selected ? null : index;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary
                : AppColors.primary.withValues(alpha: 0.80),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: selected ? 3 : 2),
            boxShadow: AppColors.ambientShadow,
          ),
          child: Icon(
            Icons.agriculture,
            color: Colors.white,
            size: selected ? 21 : 18,
          ),
        ),
      ),
    );
  }

  Widget _mapCallout(BoxConstraints constraints, int index) {
    const calloutWidth = 190.0;
    const calloutHeight = 76.0;
    const edge = 8.0;
    final position = _mapMarkerPositions[index];
    final width = _safeExtent(constraints.maxWidth, 360);
    final height = _safeExtent(constraints.maxHeight, 240);
    final x = position.dx * width;
    final y = position.dy * height;
    final left = _clampDouble(
      x - calloutWidth / 2,
      edge,
      width - calloutWidth - edge,
    );
    final top = _clampDouble(
      y - calloutHeight - 14,
      edge,
      height - calloutHeight - edge,
    );
    final machine = _machines[index];

    return Positioned(
      left: left,
      top: top,
      width: calloutWidth,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.sm),
          border: Border.all(color: AppColors.outlineVariant, width: 1),
          boxShadow: AppColors.ambientShadow,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _openMachineDetail(machine),
            borderRadius: BorderRadius.circular(R.sm),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(R.sm),
                    ),
                    child: const Icon(
                      Icons.agriculture,
                      color: AppColors.primary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          machine.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.onSurface,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          machine.distance,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    '查看',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.primary,
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _mapCountChip(int markerCount) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(R.sm),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on_outlined,
              color: AppColors.primary, size: 14),
          const SizedBox(width: 4),
          Text(
            '附近 $markerCount 台',
            style: const TextStyle(
              color: AppColors.onSurface,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  void _clearSelectedMapMarker() {
    if (_selectedMapIndex == null) return;
    setState(() => _selectedMapIndex = null);
  }

  double _safeExtent(double value, double fallback) =>
      value.isFinite ? value : fallback;

  double _clampDouble(double value, double min, double max) {
    if (max <= min) return min;
    return math.min(math.max(value, min), max);
  }

  // ── L3 预约 sheet ────────────────────────────────────

  void _openMachineDetail(_Machine machine) {
    context.push('/machinery/detail', extra: machine.toMap());
  }

  // ── M1 发布农机 sheet ─────────────────────────────────

  void _openPublishSheet() {
    Navigator.of(context, rootNavigator: true).push<void>(
      MaterialPageRoute(
        builder: (pageCtx) => Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: AppColors.primary),
              onPressed: () => Navigator.of(pageCtx).pop(),
            ),
            title: const Text('发布农机',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
          ),
          body: _PublishMachineSheet(
            onSuccess: () => _loadMachines(initChips: true),
          ),
        ),
      ),
    );
  }

  // 展示型扁平容器：白底 + 1px 描边 + R.sm 圆角 + 无阴影。
  Widget _flatBox(Widget child,
      {VoidCallback? onTap,
      EdgeInsetsGeometry padding = const EdgeInsets.all(16)}) {
    final box = Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.sm),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
      ),
      padding: padding,
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(R.sm),
        child: box,
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
        borderRadius: BorderRadius.circular(R.sm),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(R.sm),
            border: Border.all(color: AppColors.outlineVariant, width: 1),
          ),
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 左缩略图 ~84px
              ClipRRect(
                borderRadius: BorderRadius.circular(R.sm),
                child: _machineImage(machine.image, width: 84, height: 84),
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
                            const StatusChip('更新中', color: AppColors.outline),
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
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '押金￥${machine.deposit.toStringAsFixed(0)} · ${machine.distance}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.end,
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.onSurfaceVariant),
                            ),
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

  // 仅取日期（零点），避免与 showDatePicker 的 firstDate 因时分秒漂移
  // 导致 initialDate < firstDate 触发断言、日期选择器点了打不开。
  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  DateTime get _earliestStart =>
      _dateOnly(DateTime.now()).add(const Duration(days: 1));

  @override
  void initState() {
    super.initState();
    final today = _dateOnly(DateTime.now());
    _startDate = today.add(const Duration(days: 1));
    _endDate = today.add(const Duration(days: 2));
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
    final earliest = _earliestStart;
    final initial = _startDate.isBefore(earliest) ? earliest : _startDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: earliest,
      lastDate: earliest.add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      _startDate = _dateOnly(picked);
      if (_endDate.isBefore(_startDate)) {
        _endDate = _startDate;
      }
    });
  }

  Future<void> _pickEnd() async {
    final earliest = _startDate;
    final initial = _endDate.isBefore(earliest) ? earliest : _endDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: earliest,
      lastDate: earliest.add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() => _endDate = _dateOnly(picked));
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
      // 先抓住根 messenger，再 pop —— 否则 pop 后用 sheet 自身 context
      // 取 ScaffoldMessenger 会落到正被销毁的子树上，toast 可能不弹。
      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context);
      messenger.showSnackBar(SnackBar(
        content: const Text('预约已提交，等待机主确认'),
        backgroundColor: AppColors.primaryContainer,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.sm)),
        duration: const Duration(seconds: 2),
      ));
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
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
      // 同预约：先抓根 messenger 再 pop，保证发布成功 toast 一定弹出。
      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context);
      messenger.showSnackBar(SnackBar(
        content: const Text('农机已发布'),
        backgroundColor: AppColors.primaryContainer,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.sm)),
        duration: const Duration(seconds: 2),
      ));
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
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
        keyboardType: number ? TextInputType.number : TextInputType.text,
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
      {required this.options, required this.selected, required this.onChanged});

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

// ═══════════════════════════════════════════════════════
// 农机详情页（独立页面，由列表卡点击进入）
// ═══════════════════════════════════════════════════════

class MachineDetailPage extends StatelessWidget {
  final Map<String, dynamic> data;
  const MachineDetailPage({super.key, required this.data});

  void _showBookingSheet(BuildContext context, _Machine machine) {
    Navigator.of(context, rootNavigator: true).push<void>(
      MaterialPageRoute(
        builder: (pageCtx) => Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: AppColors.primary),
              onPressed: () => Navigator.of(pageCtx).pop(),
            ),
            title: const Text('预约农机',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
          ),
          body: _BookingSheet(machine: machine),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final machine = _Machine.fromMap(data);
    final canBook = machine.id != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(title: machine.name, showBack: true),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 图片区
            ClipRRect(
              child: _machineImage(
                machine.image,
                width: double.infinity,
                height: 240,
                iconSize: 64,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 名称 + 状态
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          machine.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ),
                      if (!canBook)
                        const StatusChip('更新中', color: AppColors.outline),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // 类型
                  Text(
                    machine.type,
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 20),
                  // 价格大卡
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(R.md),
                      border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '￥${machine.price.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                            const Text('/天',
                                style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.onSurfaceVariant)),
                          ],
                        ),
                        const Spacer(),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '押金 ￥${machine.deposit.toStringAsFixed(0)}',
                              style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.star,
                                    color: AppColors.gold, size: 16),
                                const SizedBox(width: 4),
                                Text(machine.rating.toStringAsFixed(1),
                                    style: const TextStyle(
                                        fontSize: 14,
                                        color: AppColors.onSurfaceVariant)),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // 机主 + 距离
                  _infoRow(Icons.person_outline, '机主', machine.owner),
                  const SizedBox(height: 12),
                  _infoRow(Icons.location_on_outlined, '距离', machine.distance),
                  const SizedBox(height: 28),
                  // 预约按钮
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: canBook
                          ? () => _showBookingSheet(context, machine)
                          : null,
                      icon: const Icon(Icons.calendar_today, size: 20),
                      label: Text(canBook ? '预约农机' : '暂不可预约'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 10),
        Text('$label  ',
            style: const TextStyle(
                fontSize: 14, color: AppColors.onSurfaceVariant)),
        Expanded(
          child: Text(value,
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
        ),
      ],
    );
  }
}

// ── 工具函数 ─────────────────────────────────────────────

String _formatDate(DateTime value) => value.toIso8601String().substring(0, 10);
