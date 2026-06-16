import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/site_images.dart';
import '../../widgets/common.dart';

/// 列表已有的轻量信息，push 时通过 `extra` 传入，详情加载前先铺底避免白屏。
class ProductPreview {
  final String image;
  final String title;
  final double price;
  final String unit;
  const ProductPreview({
    required this.image,
    required this.title,
    required this.price,
    required this.unit,
  });
}

/// 集市商品整页详情：顶部图廊 + 商品介绍流式分区 + 卖家信息 + 吸底「加入合计」。
///
/// 内容全部来自 `GET /market/product/:id`，确认数量后 `context.pop(数量)` 把结果带回集市页合并进购物车。
class ProductDetailPage extends StatefulWidget {
  final int? productId;
  final ProductPreview? preview;
  const ProductDetailPage({super.key, required this.productId, this.preview});

  @override
  State<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends State<ProductDetailPage> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;
  final _pageCtrl = PageController();
  int _gallery = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (widget.productId == null) {
      setState(() {
        _loading = false;
        _error = serviceUnavailableMessage;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.get('/market/product/${widget.productId}');
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = serviceErrorMessage(e);
      });
    }
  }

  // ── 取值（详情优先，回退 preview）─────────────────────
  String get _title => '${_data?['title'] ?? widget.preview?.title ?? '乡村好物'}';
  double get _price =>
      (_data?['price'] as num?)?.toDouble() ?? widget.preview?.price ?? 0;
  String get _unit => '${_data?['unit'] ?? widget.preview?.unit ?? '件'}';
  int get _stock => (_data?['stock'] as num?)?.toInt() ?? 0;
  String get _category => '${_data?['category'] ?? '农产品'}';
  bool get _canBuy => widget.productId != null && _data != null && _stock > 0;

  List<String> get _images {
    final raw = (_data?['images'] as List?) ?? const [];
    final urls = raw.map((e) => '$e').where((e) => e.isNotEmpty).toList();
    if (urls.isNotEmpty) return urls;
    final fallback = widget.preview?.image;
    return fallback != null ? [fallback] : const [];
  }

  String get _description {
    final d = '${_data?['description'] ?? ''}'.trim();
    if (d.isNotEmpty) return d;
    // 兜底文案（按分类），不露馅、不写「暂无」
    const map = {
      '水果': '应季鲜果，产地现采现发，昼夜温差成就饱满糖度，冷链直达锁住新鲜口感。',
      '蔬菜': '田间当日采收，绿色种植不催熟，从地头到餐桌全程新鲜，水灵爽脆。',
      '畜禽': '生态散养、谷物喂养，源头品质把控，肉质紧实、风味地道。',
      '土特产': '乡土风物，传统工艺，地道食材原产地直供，留住记忆里的味道。',
    };
    return map[_category] ?? '源头乡村直供，品质甄选，现采现发，让城市餐桌也能尝到地道乡野风味。';
  }

  Map<String, dynamic>? get _seller =>
      (_data?['seller'] as Map?)?.cast<String, dynamic>();
  String get _sellerName => '${_seller?['nickname'] ?? '乡村合作社'}';
  String get _sellerVillage => '${_seller?['villageName'] ?? '乡村产地'}';
  String? get _regionCode {
    final value = '${_data?['regionCode'] ?? ''}'.trim();
    return value.isEmpty ? null : value;
  }

  String? get _traceCode {
    final value = '${_data?['traceCode'] ?? ''}'.trim();
    return value.isEmpty ? null : value;
  }

  String get _origin {
    final village = '${_seller?['villageName'] ?? ''}'.trim();
    // 无村名时用地区码→名称映射，绝不向用户展示裸数字码
    return village.isNotEmpty ? village : regionName(_regionCode);
  }

  String? get _sellerPhone {
    final p = '${_seller?['phone'] ?? ''}'.trim();
    return p.isEmpty ? null : p;
  }

  @override
  Widget build(BuildContext context) {
    final showLoadingScreen = _loading && widget.preview == null;
    // 有 preview 时即便加载失败也保留骨架 + 内联重试，不整屏清掉（工作单 B3）。
    final showErrorScreen =
        _error != null && _data == null && widget.preview == null;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: showLoadingScreen
          ? const Loading(text: '正在加载商品…')
          : showErrorScreen
              ? ErrorRetry(message: _error!, onRetry: _load)
              : _content(),
      bottomNavigationBar:
          showLoadingScreen || showErrorScreen ? null : _buyBar(),
    );
  }

  Widget _content() {
    return CustomScrollView(
      slivers: [
        _gallerySliver(),
        if (_loading)
          const SliverToBoxAdapter(
            child: LinearProgressIndicator(
              minHeight: 2,
              color: AppColors.primary,
              backgroundColor: AppColors.surfaceContainer,
            ),
          ),
        // 加载失败但有 preview：内联重试条，保留下方骨架
        if (_error != null && _data == null)
          SliverToBoxAdapter(child: _inlineRetry()),
        SliverToBoxAdapter(child: _body()),
      ],
    );
  }

  // ── 顶部图廊 ─────────────────────────────────────────
  Widget _gallerySliver() {
    final images = _images;
    return SliverAppBar(
      pinned: true,
      expandedHeight: 300,
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.onSurface,
      elevation: 0,
      title: Text(
        _title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.onSurface,
        ),
      ),
      leading: _circleBtn(
        Icons.arrow_back,
        () {
          final r = GoRouter.of(context);
          r.canPop() ? r.pop() : r.go('/market');
        },
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: images.isEmpty
            ? Container(
                color: AppColors.surfaceContainer,
                child: const Icon(Icons.storefront,
                    color: AppColors.primary, size: 60),
              )
            : Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _pageCtrl,
                    itemCount: images.length,
                    onPageChanged: (i) => setState(() => _gallery = i),
                    itemBuilder: (_, i) => _GalleryImage(images[i]),
                  ),
                  if (images.length > 1)
                    Positioned(
                      bottom: 14,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (var i = 0; i < images.length; i++)
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              width: i == _gallery ? 18 : 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: i == _gallery
                                    ? Colors.white
                                    : Colors.white54,
                                borderRadius: BorderRadius.circular(3),
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

  Widget _circleBtn(IconData icon, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.all(8),
        child: Material(
          color: Colors.black26,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
          ),
        ),
      );

  // ── 正文流式分区 ─────────────────────────────────────
  Widget _body() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题 + 分类
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(_title,
                    style: const TextStyle(
                        fontSize: 21,
                        height: 1.3,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface)),
              ),
              const SizedBox(width: 10),
              StatusChip(_category, color: AppColors.goldContainer),
            ],
          ),
          const SizedBox(height: 14),
          // 价格 + 库存
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('￥${_price.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppColors.priceRed)),
              Padding(
                padding: const EdgeInsets.only(bottom: 4, left: 2),
                child: Text('/$_unit',
                    style: const TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 13)),
              ),
              const Spacer(),
              Text(
                _loading && _data == null
                    ? '库存查询中'
                    : _stock > 0
                        ? '库存 $_stock $_unit'
                        : '暂时缺货',
                style: TextStyle(
                  fontSize: 13,
                  color: _loading && _data == null
                      ? AppColors.outline
                      : _stock > 0
                          ? AppColors.outline
                          : AppColors.error,
                ),
              ),
            ],
          ),
          _divider(),
          // 商品介绍
          const _SectionLabel('商品介绍'),
          Text(_description,
              style: const TextStyle(
                  fontSize: 15,
                  height: 1.7,
                  color: AppColors.onSurfaceVariant)),
          _divider(),
          // 产地 · 溯源
          const _SectionLabel('产地 · 溯源'),
          Row(
            children: [
              const Icon(Icons.place_outlined,
                  size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text('$_origin · 源头直发',
                    style: const TextStyle(
                        fontSize: 15, color: AppColors.onSurface)),
              ),
            ],
          ),
          if (_traceCode != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.qr_code_2, size: 20, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '溯源码 $_traceCode',
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ],
          _divider(),
          // 卖家
          const _SectionLabel('卖家'),
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.surfaceContainer,
                child: Text(
                  _sellerName.isEmpty ? '农' : _sellerName.characters.first,
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_sellerName,
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 2),
                    Text(_sellerVillage,
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: _contactSeller,
                icon: const Icon(Icons.chat_bubble_outline, size: 16),
                label: const Text('联系'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _divider() => const Padding(
        padding: EdgeInsets.symmetric(vertical: 18),
        child: Divider(height: 1, thickness: 1, color: AppColors.surfaceHigh),
      );

  Widget _inlineRetry() => Container(
        width: double.infinity,
        color: AppColors.errorContainer,
        padding: const EdgeInsets.fromLTRB(20, 10, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: Text(_error ?? serviceUnavailableMessage,
                  style: const TextStyle(color: AppColors.error, fontSize: 13)),
            ),
            TextButton(onPressed: _load, child: const Text('重试')),
          ],
        ),
      );

  void _contactSeller() {
    final phone = _sellerPhone;
    toast(context, phone != null ? '卖家联系方式：$phone' : '已向卖家发送咨询，请留意消息通知');
  }

  // ── 吸底操作栏 ───────────────────────────────────────
  Widget _buyBar() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: AppColors.ambientShadowUp,
      ),
      padding: const EdgeInsets.fromLTRB(20, 10, 16, 10),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Column(
              // 关键：min，否则在 bottomNavigationBar 的松散竖向约束下
              // Column 会撑满全屏高，把整条 bar 顶成 880、body 压成 0。
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('￥${_price.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 22,
                        fontWeight: FontWeight.w800)),
                Text('/$_unit',
                    style: const TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 12)),
              ],
            ),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: _canBuy ? _pickQuantity : null,
              icon: const Icon(Icons.add_shopping_cart, size: 18),
              // 仅在数据已加载且确为 0 库存才说缺货；preview/加载/失败态不误报
              label: Text(_data != null && _stock == 0 ? '暂时缺货' : '加入合计'),
              style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 数量选择 sheet → 确认后把数量带回集市页
  Future<void> _pickQuantity() async {
    var qty = 1;
    final confirmed = await showModalBottomSheet<int>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheet) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('￥${_price.toStringAsFixed(2)} / $_unit · 库存 $_stock',
                    style: const TextStyle(
                        color: AppColors.onSurfaceVariant, fontSize: 13)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Text('数量',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    _stepBtn(Icons.remove,
                        qty > 1 ? () => setSheet(() => qty--) : null),
                    SizedBox(
                      width: 48,
                      child: Text('$qty',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700)),
                    ),
                    _stepBtn(Icons.add,
                        qty < _stock ? () => setSheet(() => qty++) : null),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Text('合计 ￥${(_price * qty).toStringAsFixed(2)}',
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary)),
                    const Spacer(),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(sheetCtx, qty),
                      child: const Text('加入合计'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (confirmed != null && confirmed > 0 && mounted) {
      context.pop(confirmed);
    }
  }

  Widget _stepBtn(IconData icon, VoidCallback? onTap) => Material(
        color:
            onTap == null ? AppColors.surfaceContainer : AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(R.sm),
        child: InkWell(
          borderRadius: BorderRadius.circular(R.sm),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(icon,
                size: 20,
                color: onTap == null
                    ? AppColors.outlineVariant
                    : AppColors.onSurface),
          ),
        ),
      );
}

/// 图廊单图：http 走网络图，其余按本地资源，失败回退占位。
class _GalleryImage extends StatelessWidget {
  final String src;
  const _GalleryImage(this.src);

  @override
  Widget build(BuildContext context) {
    Widget fallback() => Container(
          color: AppColors.surfaceContainer,
          child:
              const Icon(Icons.storefront, color: AppColors.primary, size: 60),
        );
    if (src.startsWith('http') || src.startsWith('/')) {
      return Image.network(ApiClient.resolveImageUrl(src),
          fit: BoxFit.cover, errorBuilder: (_, __, ___) => fallback());
    }
    return SiteImage(src, fit: BoxFit.cover, errorFallback: fallback());
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(text,
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface)),
      );
}
