import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';

class MarketPage extends StatefulWidget {
  const MarketPage({super.key});

  @override
  State<MarketPage> createState() => _MarketPageState();
}

class _Product {
  final int? id;
  final String image;
  final String title;
  final double price;
  final String unit;
  final String seller;
  final String badge;
  final Color badgeColor;
  final bool fromApi;

  const _Product({
    this.id,
    required this.image,
    required this.title,
    required this.price,
    required this.unit,
    required this.seller,
    required this.badge,
    required this.badgeColor,
    this.fromApi = false,
  });

  factory _Product.fromApi(Map<String, dynamic> json, int index) {
    final images = ['_4_1.jpg', '_4_2.jpg', '_4_3.jpg', '_4_4.jpg'];
    final category = '${json['category'] ?? '农产品'}';
    return _Product(
      id: json['id'] as int?,
      image: 'assets/images/${images[index % images.length]}',
      title: '${json['title'] ?? '乡村好物'}',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      unit: '${json['unit'] ?? '件'}',
      seller: '合作社 ${json['sellerId'] ?? '-'}',
      badge: category == '畜禽'
          ? 'AI质检'
          : category == '水果'
              ? '产地直发'
              : category,
      badgeColor: category == '畜禽'
          ? AppColors.primary
          : category == '水果'
              ? AppColors.secondary
              : AppColors.goldContainer,
      fromApi: true,
    );
  }
}

class _MarketPageState extends State<MarketPage> {
  static const _cacheKey = 'market:products';
  static const _chips = ['全部', '当季水果', '有机蔬菜', '土特产'];
  var _activeChip = 0;
  var _loading = true;
  var _fromCache = false;
  var _checkingOut = false;
  String? _cacheTime;
  String? _error;
  List<_Product> _products = [];
  final Map<int, int> _cart = {};

  static const _fallback = [
    _Product(
      image: 'assets/images/_4_1.jpg',
      title: '丹东红颜草莓 新鲜采摘 有机种植',
      price: 45,
      unit: '斤',
      seller: '李大爷果园',
      badge: '产地直发',
      badgeColor: AppColors.secondary,
    ),
    _Product(
      image: 'assets/images/_4_2.jpg',
      title: '散养土鸡蛋 谷物喂养 30枚装',
      price: 58,
      unit: '箱',
      seller: '张姐禽业',
      badge: 'AI质检',
      badgeColor: AppColors.primary,
    ),
    _Product(
      image: 'assets/images/_4_3.jpg',
      title: '高山露天有机芦笋 现采现发',
      price: 22.5,
      unit: '把',
      seller: '绿色合作社',
      badge: '有机认证',
      badgeColor: AppColors.primaryContainer,
    ),
    _Product(
      image: 'assets/images/_4_4.jpg',
      title: '农家自种水果玉米 鲜嫩多汁',
      price: 19.9,
      unit: '5斤',
      seller: '王叔农场',
      badge: '溯源码',
      badgeColor: AppColors.goldContainer,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final category = _categoryQuery;
      final data = await ApiClient.get('/market/product/list', query: {
        'pageSize': 20,
        if (category != null) 'category': category,
      });
      final records = (data['records'] as List? ?? [])
          .whereType<Map>()
          .map((item) => item.cast<String, dynamic>())
          .toList();
      await OfflineCache.saveList('$_cacheKey:${category ?? 'all'}', records);
      if (!mounted) return;
      setState(() {
        _products = [
          for (var i = 0; i < records.length; i++)
            _Product.fromApi(records[i], i),
        ];
        _fromCache = false;
        _loading = false;
      });
    } catch (error) {
      final category = _categoryQuery;
      final key = '$_cacheKey:${category ?? 'all'}';
      final cached = await OfflineCache.readList(key);
      final cacheTime = await OfflineCache.updatedAt(key);
      if (!mounted) return;
      setState(() {
        _products = cached.isNotEmpty
            ? [
                for (var i = 0; i < cached.length; i++)
                  _Product.fromApi(cached[i], i),
              ]
            : _fallback;
        _fromCache = cached.isNotEmpty;
        _cacheTime = cacheTime;
        _error = cached.isNotEmpty ? null : serviceUnavailableMessage;
        _loading = false;
      });
    }
  }

  String? get _categoryQuery {
    switch (_activeChip) {
      case 1:
        return '水果';
      case 2:
        return '蔬菜';
      case 3:
        return '土特产';
      default:
        return null;
    }
  }

  int get _cartCount => _cart.values.fold(0, (sum, count) => sum + count);

  double get _cartTotal {
    double total = 0;
    for (final entry in _cart.entries) {
      final product = _products
          .where((item) => item.id == entry.key)
          .cast<_Product?>()
          .firstOrNull;
      if (product != null) total += product.price * entry.value;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final visibleProducts = _products.isEmpty ? _fallback : _products;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(actions: [
        IconButton(
          tooltip: '流通服务',
          onPressed: () => context.go('/market/service'),
          icon: const Icon(Icons.dashboard_customize_outlined,
              color: AppColors.onSurfaceVariant),
        ),
      ]),
      body: Stack(
        children: [
          RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _loadProducts,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 128),
              children: [
                _searchBar(),
                const SizedBox(height: 20),
                _categoryChips(),
                if (_fromCache) ...[
                  const SizedBox(height: 12),
                  AlertBanner(
                      '商品数据更新中${_cacheTime == null ? '' : ' · 上次同步 $_cacheTime'}',
                      critical: false),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  AppCard(
                    color: AppColors.errorContainer,
                    child: Text(_error!,
                        style: const TextStyle(color: AppColors.error)),
                  ),
                ],
                const SizedBox(height: 24),
                if (_loading)
                  const SizedBox(
                      height: 360, child: Loading(text: '正在同步乡村集市...'))
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: visibleProducts.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 20,
                      childAspectRatio: 0.58,
                    ),
                    itemBuilder: (context, index) =>
                        _productCard(context, visibleProducts[index]),
                  ),
              ],
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 18,
            child: _cartBar(context),
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
        border: const Border(
          bottom: BorderSide(color: AppColors.secondary, width: 2),
        ),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: const Row(
        children: [
          Icon(Icons.search, color: AppColors.outline, size: 28),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              '搜索生鲜、农资、合作社...',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.outlineVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Icon(Icons.mic_none, color: AppColors.primary, size: 26),
        ],
      ),
    );
  }

  Widget _categoryChips() {
    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _chips.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final active = _activeChip == index;
          return ChoiceChip(
            selected: active,
            label: Text(_chips[index]),
            onSelected: (_) {
              setState(() => _activeChip = index);
              _loadProducts();
            },
            backgroundColor: AppColors.surface,
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: active ? Colors.white : AppColors.onSurface,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
            shape: StadiumBorder(
              side: BorderSide(
                color: active ? AppColors.primary : AppColors.outlineVariant,
                width: 1.5,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          );
        },
      ),
    );
  }

  Widget _productCard(BuildContext context, _Product product) {
    final inCart = product.id != null ? (_cart[product.id] ?? 0) : 0;
    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => _showProductDetail(product),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 11,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(R.md)),
                  child: Image.asset(
                    product.image,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.surfaceContainer,
                      child: const Icon(Icons.storefront,
                          color: AppColors.primary, size: 40),
                    ),
                  ),
                ),
                Positioned(
                  left: 10,
                  top: 10,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: product.id == null
                          ? AppColors.outline
                          : product.badgeColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      product.id == null ? '示例' : product.badge,
                      style: const TextStyle(
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
          Expanded(
            flex: 10,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.25,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '￥${product.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 23,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFB40000),
                        ),
                      ),
                      const SizedBox(width: 2),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 3),
                        child: Text(
                          '/${product.unit}',
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 13,
                        backgroundColor: AppColors.surfaceContainer,
                        child: Text(
                          product.seller.isEmpty ? '农' : product.seller[0],
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          product.seller,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ),
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: const BoxDecoration(
                              color: AppColors.primaryContainer,
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              padding: EdgeInsets.zero,
                              icon: const Icon(Icons.add_shopping_cart,
                                  color: Colors.white, size: 20),
                              onPressed: () => _addCart(product),
                            ),
                          ),
                          if (inCart > 0)
                            Positioned(
                              right: -4,
                              top: -4,
                              child: Container(
                                width: 18,
                                height: 18,
                                alignment: Alignment.center,
                                decoration: const BoxDecoration(
                                  color: AppColors.error,
                                  shape: BoxShape.circle,
                                ),
                                child: Text('$inCart',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700)),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _addCart(_Product product) {
    if (product.id == null) {
      toast(context, '商品资料更新中，请稍后下单');
      return;
    }
    setState(() {
      _cart[product.id!] = (_cart[product.id!] ?? 0) + 1;
    });
    toast(context, '${product.title} 已加入合计');
  }

  Widget _cartBar(BuildContext context) {
    return Container(
      height: 82,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: const BoxDecoration(
                  color: AppColors.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.shopping_basket_outlined,
                    color: Colors.white, size: 28),
              ),
              if (_cartCount > 0)
                Positioned(
                  right: -2,
                  top: -2,
                  child: Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                    child: Text('$_cartCount',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('合计预估',
                    style: TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 15)),
                Text('￥${_cartTotal.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 22,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _cartCount == 0 || _checkingOut ? null : _checkout,
            child: _checkingOut
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('去结算'),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_forward, size: 18),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _checkout() async {
    if (_cart.isEmpty) return;
    setState(() => _checkingOut = true);
    try {
      final first = _cart.entries.first;
      await ApiClient.post('/market/order', body: {
        'productId': first.key,
        'quantity': first.value,
        'receiverInfo': {
          'name': '默认用户',
          'phone': '13800000000',
          'address': '默认收货地址',
        },
        'remark': '移动端下单',
      });
      if (!mounted) return;
      setState(() => _cart.clear());
      toast(context, '订单已提交，可在后台订单表查看');
      _loadProducts();
    } catch (error) {
      if (mounted) toast(context, actionErrorMessage('下单', error), error: true);
    } finally {
      if (mounted) setState(() => _checkingOut = false);
    }
  }

  void _showProductDetail(_Product product) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (context) => ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 可滚动内容区：图片 + 标题 + 卖家
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(R.md),
                      child: AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Image.asset(
                          product.image,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.surfaceContainer,
                            child: const Icon(Icons.storefront,
                                color: AppColors.primary, size: 48),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Text(product.title,
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.onSurface)),
                        ),
                        if (product.id == null)
                          const StatusChip('示例商品', color: AppColors.outline)
                        else
                          StatusChip(product.badge, color: product.badgeColor),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(product.seller,
                        style: const TextStyle(
                            color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
            ),
            // 底部固定操作区：价格 + 加入合计（始终可见、可点）
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              child: Row(
                children: [
                  Text('￥${product.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 22,
                          fontWeight: FontWeight.w800)),
                  Text(' / ${product.unit}',
                      style:
                          const TextStyle(color: AppColors.onSurfaceVariant)),
                  const Spacer(),
                  ElevatedButton.icon(
                    onPressed: product.id == null
                        ? null
                        : () {
                            Navigator.pop(context);
                            _addCart(product);
                          },
                    icon: const Icon(Icons.add_shopping_cart, size: 18),
                    label: Text(product.id == null ? '资料更新中' : '加入合计'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
