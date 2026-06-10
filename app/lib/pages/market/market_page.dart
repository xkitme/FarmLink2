import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../widgets/common.dart';
import '../../widgets/section_tool_chips.dart';
import 'product_detail_page.dart';

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
  final int stock;
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
    this.stock = 99,
    this.fromApi = false,
  });

  factory _Product.fromApi(Map<String, dynamic> json, int index) {
    final category = '${json['category'] ?? '农产品'}';
    final title = '${json['title'] ?? '乡村好物'}';
    final rawImages = (json['images'] as List? ?? const [])
        .map((item) => '$item')
        .where((item) => item.isNotEmpty)
        .toList();
    return _Product(
      id: json['id'] as int?,
      image: _imageFor(title, category, index, rawImages),
      title: title,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      unit: '${json['unit'] ?? '件'}',
      stock: (json['stock'] as num?)?.toInt() ?? 0,
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

  static String _imageFor(
      String title, String category, int index, List<String> rawImages) {
    for (final image in rawImages) {
      if (image.isNotEmpty && !image.startsWith('assets/images/_')) {
        return image;
      }
    }
    if (title.contains('蛋') || category.contains('畜禽')) {
      return 'assets/images/generated/product-eggs.jpg';
    }
    if (title.contains('番茄')) {
      return 'assets/images/generated/product-tomato.jpg';
    }
    if (title.contains('礼盒')) {
      return 'assets/images/generated/product-vegetable-box.jpg';
    }
    if (title.contains('芦笋')) {
      return 'assets/images/generated/product-asparagus.jpg';
    }
    if (title.contains('菜') || category.contains('蔬菜')) {
      return 'assets/images/generated/product-vegetable-box.jpg';
    }
    if (title.contains('红薯')) {
      return 'assets/images/generated/product-sweet-potato.jpg';
    }
    if (title.contains('玉米')) {
      return 'assets/images/generated/product-corn.jpg';
    }
    if (title.contains('米') || category.contains('粮')) {
      return 'assets/images/generated/product-rice.jpg';
    }
    if (title.contains('果') ||
        title.contains('柑') ||
        title.contains('橘') ||
        category.contains('水果')) {
      return 'assets/images/generated/product-citrus.jpg';
    }
    const fallbackImages = [
      'assets/images/generated/product-citrus.jpg',
      'assets/images/generated/product-eggs.jpg',
      'assets/images/generated/product-vegetable-box.jpg',
      'assets/images/generated/product-rice.jpg',
    ];
    return fallbackImages[index % fallbackImages.length];
  }
}

class _MarketPageState extends State<MarketPage> {
  static const _cacheKey = 'market:products';
  static const _toastBottomMargin = 118.0;
  static const _chips = ['全部', '当季水果', '有机蔬菜', '土特产'];
  var _activeChip = 0;
  var _loading = true;
  var _fromCache = false;
  var _checkingOut = false;
  String? _cacheTime;
  String? _error;
  List<_Product> _products = [];
  final Map<int, int> _cart = {};
  final Map<int, _Product> _cartProducts = {};
  final _keywordCtrl = TextEditingController();
  String _keyword = '';
  var _loadGeneration = 0;

  static const _fallback = [
    _Product(
      image: 'assets/images/generated/product-citrus.jpg',
      title: '丹东红颜草莓 新鲜采摘 有机种植',
      price: 45,
      unit: '斤',
      seller: '李大爷果园',
      badge: '产地直发',
      badgeColor: AppColors.secondary,
    ),
    _Product(
      image: 'assets/images/generated/product-eggs.jpg',
      title: '散养土鸡蛋 谷物喂养 30枚装',
      price: 58,
      unit: '箱',
      seller: '张姐禽业',
      badge: 'AI质检',
      badgeColor: AppColors.primary,
    ),
    _Product(
      image: 'assets/images/generated/product-asparagus.jpg',
      title: '高山露天有机芦笋 现采现发',
      price: 22.5,
      unit: '把',
      seller: '绿色合作社',
      badge: '有机认证',
      badgeColor: AppColors.primaryContainer,
    ),
    _Product(
      image: 'assets/images/generated/product-corn.jpg',
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

  @override
  void dispose() {
    _keywordCtrl.dispose();
    super.dispose();
  }

  void _onSearch() {
    setState(() => _keyword = _keywordCtrl.text.trim());
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    final generation = ++_loadGeneration;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final category = _categoryQuery;
      final data = await ApiClient.get('/market/product/list', query: {
        'pageSize': 20,
        if (category != null) 'category': category,
        if (_keyword.isNotEmpty) 'keyword': _keyword,
      });
      final records = (data['records'] as List? ?? [])
          .whereType<Map>()
          .map((item) => item.cast<String, dynamic>())
          .toList();
      await OfflineCache.saveList(_productsCacheKey(category), records);
      if (!mounted || generation != _loadGeneration) return;
      setState(() {
        _products = [
          for (var i = 0; i < records.length; i++)
            _Product.fromApi(records[i], i),
        ];
        for (final product in _products) {
          if (product.id != null && _cart.containsKey(product.id)) {
            _cartProducts[product.id!] = product;
          }
        }
        _fromCache = false;
        _loading = false;
      });
    } catch (error) {
      final category = _categoryQuery;
      final key = _productsCacheKey(category);
      final cached = await OfflineCache.readList(key);
      final cacheTime = await OfflineCache.updatedAt(key);
      if (!mounted || generation != _loadGeneration) return;
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

  String _productsCacheKey(String? category) {
    final keyword = _keyword.toLowerCase();
    final suffix =
        keyword.isEmpty ? '' : ':keyword:${Uri.encodeComponent(keyword)}';
    return '$_cacheKey:${category ?? 'all'}$suffix';
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
      final product = _cartProducts[entry.key] ??
          _products.where((item) => item.id == entry.key).firstOrNull;
      if (product != null) total += product.price * entry.value;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: FarmAppBar(showBack: true, actions: [
        IconButton(
          tooltip: '流通服务',
          onPressed: () => context.push('/market/service'),
          icon: const Icon(Icons.dashboard_customize_outlined,
              color: AppColors.onSurfaceVariant),
        ),
      ]),
      bottomNavigationBar: Padding(
        // 用真 bottomNavigationBar 承载购物车栏：浮动 toast 会自动避让其上方，
        // 不再压住这张底部圆角卡片。
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 18),
        child: _cartBar(context),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _loadProducts,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            const SectionToolChips(section: 'market'),
            const SizedBox(height: 8),
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
              const SizedBox(height: 360, child: Loading(text: '正在同步乡村集市...'))
            else if (_products.isEmpty)
              const AppCard(
                child: Text(
                  '没有找到匹配商品，换个关键词试试',
                  style: TextStyle(color: AppColors.onSurfaceVariant),
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _products.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 20,
                  childAspectRatio: 0.58,
                ),
                itemBuilder: (context, index) =>
                    _productCard(context, _products[index]),
              ),
          ],
        ),
      ),
    );
  }

  Widget _searchBar() => AppSearchField(
        controller: _keywordCtrl,
        hintText: '搜索生鲜、农资、合作社…',
        onSubmitted: (_) => _onSearch(),
        onClear: _onSearch,
      );

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
                  child: _productImage(product.image),
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
                          color: AppColors.priceRed,
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

  Widget _productImage(String source) {
    Widget fallback() => Container(
          color: AppColors.surfaceContainer,
          child:
              const Icon(Icons.storefront, color: AppColors.primary, size: 40),
        );
    if (source.startsWith('http://') ||
        source.startsWith('https://') ||
        source.startsWith('/')) {
      return Image.network(
        ApiClient.resolveImageUrl(source),
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback(),
      );
    }
    return Image.asset(
      source,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback(),
    );
  }

  void _addCart(_Product product) {
    if (product.id == null) {
      _marketToast('商品资料更新中，请稍后下单');
      return;
    }
    final current = _cart[product.id!] ?? 0;
    // 库存上限（stock<=0 视为未知，不拦截）
    if (product.stock > 0 && current >= product.stock) {
      _marketToast('库存仅 ${product.stock} ${product.unit}');
      return;
    }
    setState(() {
      _cart[product.id!] = current + 1;
      _cartProducts[product.id!] = product;
    });
    _marketToast('${product.title} 已加入合计');
  }

  void _marketToast(String message, {bool error = false}) {
    toast(context, message, error: error, bottomMargin: _toastBottomMargin);
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
          // 篮子 + 合计可点：展开购物车清单
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _cartCount == 0 ? null : _showCart,
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
                        Text(_cartCount == 0 ? '购物车' : '合计预估 · 查看清单',
                            style: const TextStyle(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 14)),
                        Text('￥${_cartTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                                color: AppColors.onSurface,
                                fontSize: 22,
                                fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
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

  Future<void> _showCart() async {
    if (_cart.isEmpty) return;
    final shouldCheckout = await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheet) {
          final entries = _cart.entries.toList();
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '购物车清单',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 14),
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(sheetContext).size.height * 0.48,
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: entries.length,
                      separatorBuilder: (_, __) => const Divider(
                        height: 20,
                        color: AppColors.surfaceHigh,
                      ),
                      itemBuilder: (_, index) {
                        final entry = entries[index];
                        final product = _cartProducts[entry.key] ??
                            _products
                                .where((item) => item.id == entry.key)
                                .firstOrNull;
                        if (product == null) return const SizedBox.shrink();
                        return Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    product.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '￥${product.price.toStringAsFixed(2)} / ${product.unit} · ${entry.value} 件',
                                    style: const TextStyle(
                                      color: AppColors.onSurfaceVariant,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '￥${(product.price * entry.value).toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            IconButton(
                              tooltip: '移除',
                              onPressed: () {
                                setState(() {
                                  _cart.remove(entry.key);
                                  _cartProducts.remove(entry.key);
                                });
                                if (_cart.isEmpty) {
                                  Navigator.pop(sheetContext);
                                } else {
                                  setSheet(() {});
                                }
                              },
                              icon: const Icon(Icons.delete_outline,
                                  color: AppColors.error),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      const Text(
                        '合计预估',
                        style: TextStyle(color: AppColors.onSurfaceVariant),
                      ),
                      const Spacer(),
                      Text(
                        '￥${_cartTotal.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _checkingOut
                          ? null
                          : () => Navigator.pop(sheetContext, true),
                      icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                      label: const Text('立即订购'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    if (shouldCheckout == true && mounted) await _checkout();
  }

  Future<void> _checkout() async {
    if (!mounted || _cart.isEmpty || _checkingOut) return;
    setState(() => _checkingOut = true);
    final submittedIds = <int>[];
    try {
      for (final entry in _cart.entries.toList()) {
        await ApiClient.post('/market/order', body: {
          'productId': entry.key,
          'quantity': entry.value,
          'receiverInfo': {
            'name': '默认用户',
            'phone': '13800000000',
            'address': '默认收货地址',
          },
          'remark': '移动端下单',
        });
        submittedIds.add(entry.key);
      }
      if (!mounted) return;
      setState(() {
        _cart.clear();
        _cartProducts.clear();
      });
      _marketToast('订单已提交，可在后台订单表查看');
      _loadProducts();
    } catch (error) {
      if (mounted) {
        setState(() {
          for (final id in submittedIds) {
            _cart.remove(id);
            _cartProducts.remove(id);
          }
        });
        _marketToast(actionErrorMessage('下单', error), error: true);
      }
    } finally {
      if (mounted) setState(() => _checkingOut = false);
    }
  }

  Future<void> _showProductDetail(_Product product) async {
    if (product.id == null) {
      _marketToast('商品资料更新中，请稍后下单');
      return;
    }
    final id = product.id!;
    final qty = await context.push<int>(
      '/market/product/$id',
      extra: ProductPreview(
        image: product.image,
        title: product.title,
        price: product.price,
        unit: product.unit,
      ),
    );
    if (!mounted || qty == null || qty <= 0) return;
    final merged = (_cart[id] ?? 0) + qty;
    // 合并回购物车时也夹住库存上限
    final next =
        product.stock > 0 && merged > product.stock ? product.stock : merged;
    setState(() {
      _cart[id] = next;
      _cartProducts[id] = product;
    });
    _marketToast('${product.title} 已加入合计');
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
