import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

class MarketPage extends StatefulWidget {
  const MarketPage({super.key});

  @override
  State<MarketPage> createState() => _MarketPageState();
}

class _Product {
  final String image;
  final String title;
  final String price;
  final String unit;
  final String seller;
  final String badge;
  final Color badgeColor;

  const _Product({
    required this.image,
    required this.title,
    required this.price,
    required this.unit,
    required this.seller,
    required this.badge,
    required this.badgeColor,
  });
}

class _MarketPageState extends State<MarketPage> {
  static const _chips = ['全部', '当季水果', '有机蔬菜', '土特产'];
  var _activeChip = 0;

  static const _products = [
    _Product(
      image: 'assets/images/_4_1.jpg',
      title: '丹东红颜草莓 新鲜采摘 有机种植',
      price: '45.00',
      unit: '斤',
      seller: '李大爷果园',
      badge: '产地直发',
      badgeColor: AppColors.secondary,
    ),
    _Product(
      image: 'assets/images/_4_2.jpg',
      title: '散养土鸡蛋 谷物喂养 30枚装',
      price: '58.00',
      unit: '箱',
      seller: '张姐禽业',
      badge: 'AI质检',
      badgeColor: AppColors.primary,
    ),
    _Product(
      image: 'assets/images/_4_3.jpg',
      title: '高山露天有机芦笋 现采现发',
      price: '22.50',
      unit: '把',
      seller: '绿色合作社',
      badge: '有机认证',
      badgeColor: AppColors.primaryContainer,
    ),
    _Product(
      image: 'assets/images/_4_4.jpg',
      title: '农家自种水果玉米 鲜嫩多汁',
      price: '19.90',
      unit: '5斤',
      seller: '王叔农场',
      badge: '溯源码',
      badgeColor: AppColors.goldContainer,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FarmAppBar(),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 128),
            children: [
              _searchBar(),
              const SizedBox(height: 20),
              _categoryChips(),
              const SizedBox(height: 24),
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
            onSelected: (_) => setState(() => _activeChip = index),
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
    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => toast(context, '商品详情与下单将在后续分段接入'),
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
                      color: product.badgeColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      product.badge,
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
                        '￥${product.price}',
                        style: const TextStyle(
                          fontSize: 24,
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
                          product.seller.characters.first,
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
                          onPressed: () =>
                              toast(context, '${product.title} 已加入合计'),
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
    );
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
                  child: const Text('3',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('合计预估',
                    style: TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 15)),
                Text('￥125.50',
                    style: TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 22,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => toast(context, '结算流程将在后续分段接入'),
            child: const Row(
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
}
