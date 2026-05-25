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

class _MachineryPageState extends State<MachineryPage> {
  static const _cacheKey = 'machinery:list';
  static const _filters = ['附近可用', '大型拖拉机', '联合收割机', '无人机'];
  var _activeFilter = 0;
  var _loading = true;
  var _fromCache = false;
  var _booking = false;
  String? _cacheTime;
  String? _error;
  List<_Machine> _machines = [];
  _Machine? _selected;

  static const _fallback = [
    _Machine(
      image: 'assets/images/_5_2.jpg',
      name: '雷沃欧豹 M1004',
      type: '100马力 轮式拖拉机',
      price: 150,
      deposit: 1000,
      rating: 4.9,
      owner: '李师傅',
      distance: '2.5 km',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadMachines();
  }

  Future<void> _loadMachines() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final type = _machineTypeQuery;
      final data = await ApiClient.get('/machinery/list', query: {
        'pageSize': 8,
        'onlyAvailable': 1,
        if (type != null) 'machineType': type,
      });
      final records = (data['records'] as List? ?? [])
          .whereType<Map>()
          .map((item) => item.cast<String, dynamic>())
          .toList();
      await OfflineCache.saveList('$_cacheKey:${type ?? 'all'}', records);
      if (!mounted) return;
      final machines = [
        for (var i = 0; i < records.length; i++)
          _Machine.fromApi(records[i], i),
      ];
      setState(() {
        _machines = machines.isEmpty ? _fallback : machines;
        _selected = _machines.first;
        _fromCache = false;
        _loading = false;
      });
    } catch (error) {
      final type = _machineTypeQuery;
      final key = '$_cacheKey:${type ?? 'all'}';
      final cached = await OfflineCache.readList(key);
      final cacheTime = await OfflineCache.updatedAt(key);
      if (!mounted) return;
      final machines = cached.isNotEmpty
          ? [
              for (var i = 0; i < cached.length; i++)
                _Machine.fromApi(cached[i], i),
            ]
          : _fallback;
      setState(() {
        _machines = machines;
        _selected = machines.first;
        _fromCache = cached.isNotEmpty;
        _cacheTime = cacheTime;
        _error = cached.isNotEmpty ? null : '后端暂不可用，已展示内置农机数据';
        _loading = false;
      });
    }
  }

  String? get _machineTypeQuery {
    switch (_activeFilter) {
      case 1:
        return '拖拉机';
      case 2:
        return '收割机';
      case 3:
        return '无人机';
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selected ?? _fallback.first;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(actions: [
        IconButton(
          tooltip: '农机服务',
          onPressed: () => context.go('/machinery/service'),
          icon: const Icon(Icons.dashboard_customize_outlined,
              color: AppColors.onSurfaceVariant),
        ),
      ]),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/_5_1.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                const ColoredBox(color: Color(0xFF315A35)),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x552E7D32), Color(0xAA1A1C1C)],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
              child: Column(
                children: [
                  _searchBar(),
                  const SizedBox(height: 14),
                  _filterRow(),
                  if (_fromCache) ...[
                    const SizedBox(height: 10),
                    AlertBanner(
                        '农机数据更新中${_cacheTime == null ? '' : ' · 上次同步 $_cacheTime'}',
                        critical: false),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    AppCard(
                      color: AppColors.errorContainer,
                      child: Text(_error!,
                          style: const TextStyle(color: AppColors.error)),
                    ),
                  ],
                  Expanded(
                    child: _loading
                        ? const Loading(text: '正在同步附近农机...')
                        : Stack(
                            children: [
                              for (var i = 0; i < _machines.length; i++)
                                Positioned(
                                  left: 42.0 + (i % 2) * 185,
                                  top: 125.0 + i * 54,
                                  child: GestureDetector(
                                    onTap: () => setState(
                                        () => _selected = _machines[i]),
                                    child: _mapMarker(
                                      active: _machines[i] == selected,
                                      label: i == 0
                                          ? '￥${_machines[i].price.toStringAsFixed(0)}/天'
                                          : null,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                  ),
                  _machineCard(context, selected),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _searchBar() {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Row(
        children: [
          const Icon(Icons.search, color: AppColors.outline, size: 28),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              '搜索农机类型 (如: 收割机, 拖拉机)',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                color: AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            width: 46,
            height: 46,
            decoration: const BoxDecoration(
              color: AppColors.surfaceContainer,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.tune, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _filterRow() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
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
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.circular(R.sm),
                border: active
                    ? null
                    : Border.all(color: AppColors.outlineVariant, width: 1.5),
                boxShadow: active ? null : AppColors.ambientShadow,
              ),
              child: Text(
                _filters[index],
                style: TextStyle(
                  color: active ? Colors.white : AppColors.onSurface,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _mapMarker({required bool active, String? label}) {
    return Column(
      children: [
        Container(
          width: active ? 58 : 48,
          height: active ? 58 : 48,
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary
                : AppColors.secondary.withValues(alpha: 0.65),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: active ? 3 : 2),
            boxShadow: AppColors.ambientShadow,
          ),
          child: const Icon(Icons.agriculture, color: Colors.white, size: 24),
        ),
        if (label != null) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(R.sm),
              boxShadow: AppColors.ambientShadow,
            ),
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _machineCard(BuildContext context, _Machine machine) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.outlineVariant),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(R.md),
                child: Image.asset(
                  machine.image,
                  width: 112,
                  height: 112,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 112,
                    height: 112,
                    color: AppColors.surfaceContainer,
                    child: const Icon(Icons.agriculture,
                        color: AppColors.primary, size: 44),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            machine.name,
                            style: const TextStyle(
                              fontSize: 22,
                              height: 1.15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ),
                        const Icon(Icons.verified,
                            color: AppColors.primary, size: 28),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      machine.type,
                      style: const TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star, color: AppColors.gold, size: 18),
                        const SizedBox(width: 4),
                        Text(
                          '${machine.rating.toStringAsFixed(1)} · 押金￥${machine.deposit.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: '￥${machine.price.toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 29,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const TextSpan(
                            text: ' /天',
                            style: TextStyle(
                              color: AppColors.onSurface,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 14),
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: const Color(0xFFFDCDBC),
                child: Text(
                  machine.owner.isEmpty ? '机' : machine.owner[0],
                  style: const TextStyle(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      machine.owner,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.place_outlined,
                            size: 16, color: AppColors.onSurfaceVariant),
                        const SizedBox(width: 2),
                        Text(
                          '距您 ${machine.distance}',
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                width: 54,
                height: 54,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceContainer,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: const Icon(Icons.call, color: AppColors.primary),
                  onPressed: () => toast(context, '已为您保留机主联系方式'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLow,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.surfaceHigh),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: const Row(
                    children: [
                      Icon(Icons.calendar_month,
                          color: AppColors.onSurfaceVariant),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '明天 - 后天',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.onSurface,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              ElevatedButton(
                onPressed: _booking || machine.id == null
                    ? null
                    : () => _bookMachine(machine),
                child: _booking
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('立即预约'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _bookMachine(_Machine machine) async {
    if (machine.id == null) {
      toast(context, '内置农机暂不能预约，请等待后端同步');
      return;
    }
    setState(() => _booking = true);
    final start = DateTime.now().add(const Duration(days: 1));
    final end = DateTime.now().add(const Duration(days: 2));
    try {
      await ApiClient.post('/machinery/booking', body: {
        'machineryId': machine.id,
        'startDate': _date(start),
        'endDate': _date(end),
        'remark': 'Flutter App 预约',
      });
      if (mounted) toast(context, '预约已提交，可在后台预约表查看');
    } catch (error) {
      if (mounted) toast(context, '预约失败：$error', error: true);
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }
}

String _date(DateTime value) => value.toIso8601String().substring(0, 10);
