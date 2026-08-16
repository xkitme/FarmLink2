/// 商品详情 typed DTO（116f-D 样板）。
///
/// 对应 `GET /api/v2/market/products/:id`（薄适配器复用 v1
/// `GET /market/product/:id` 的同一 controller，响应字段完全一致）。
///
/// 解析容错口径与 `pages/market/product_detail_page.dart` 迁移前的深解析行为
/// **逐项对齐**（该页是 116f-D 的样板页，行为不变是硬门槛）：
/// - `title` / `unit` / `price` 缺失时保持 null —— 页面按 `ProductPreview`
///   回退链取值（`preview?.xxx ?? 默认`），DTO 不得提前填默认值；
/// - `price` / `stock` 沿用旧页面的 `as num?` 强转语义：非数字输入抛
///   `TypeError`（与旧页面一致），数字正常收敛；
/// - `category` 缺失回退「农产品」、`description` 缺失回退空串并去首尾空白；
/// - `images` 沿用旧页面 `'$e'` 字符串化 + 过滤空串（含 null 元素 → `'null'`）；
/// - `regionCode` / `traceCode` 空白归一为 null；`seller` 为 Map 时解析投影
///   `id/nickname/villageName/phone`，`phone` 空白归一为 null，非 Map 抛类型错误。
class ProductSeller {
  final int? id;
  final String? nickname;
  final String? villageName;
  final String? phone;

  const ProductSeller({
    this.id,
    this.nickname,
    this.villageName,
    this.phone,
  });

  factory ProductSeller.fromJson(Map<String, dynamic> j) {
    final phone = '${j['phone'] ?? ''}'.trim();
    return ProductSeller(
      id: (j['id'] as num?)?.toInt(),
      nickname: j['nickname'] == null ? null : '${j['nickname']}',
      villageName: j['villageName'] == null ? null : '${j['villageName']}',
      phone: phone.isEmpty ? null : phone,
    );
  }
}

class MarketProduct {
  final int? id;
  final int? sellerId;
  final String? title;
  final String category;
  final String description;
  final double? price;
  final String? unit;
  final int stock;
  final List<String> images;
  final String? regionCode;
  final String? traceCode;
  final int status;
  final int soldCount;
  final ProductSeller? seller;

  const MarketProduct({
    this.id,
    this.sellerId,
    this.title,
    this.category = '农产品',
    this.description = '',
    this.price,
    this.unit,
    this.stock = 0,
    this.images = const <String>[],
    this.regionCode,
    this.traceCode,
    this.status = 1,
    this.soldCount = 0,
    this.seller,
  });

  factory MarketProduct.fromJson(Map<String, dynamic> j) {
    final regionCode = '${j['regionCode'] ?? ''}'.trim();
    final traceCode = '${j['traceCode'] ?? ''}'.trim();
    final sellerRaw = j['seller'];
    return MarketProduct(
      id: (j['id'] as num?)?.toInt(),
      sellerId: (j['sellerId'] as num?)?.toInt(),
      title: j['title'] == null ? null : '${j['title']}',
      category: j['category'] == null ? '农产品' : '${j['category']}',
      description: '${j['description'] ?? ''}'.trim(),
      price: (j['price'] as num?)?.toDouble(),
      unit: j['unit'] == null ? null : '${j['unit']}',
      stock: (j['stock'] as num?)?.toInt() ?? 0,
      images: <String>[
        for (final e in j['images'] as List? ?? const <dynamic>[])
          if ('$e'.isNotEmpty) '$e',
      ],
      regionCode: regionCode.isEmpty ? null : regionCode,
      traceCode: traceCode.isEmpty ? null : traceCode,
      status: (j['status'] as num?)?.toInt() ?? 1,
      soldCount: (j['soldCount'] as num?)?.toInt() ?? 0,
      seller: sellerRaw == null
          ? null
          : ProductSeller.fromJson(
              (sellerRaw as Map).cast<String, dynamic>(),
            ),
    );
  }
}
