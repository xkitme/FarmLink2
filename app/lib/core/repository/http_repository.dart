import '../api_client.dart';
import '../dto/market_product.dart';
import 'product_repository.dart';

/// 116f-D `HttpRepository`：`ProductRepository` 的 HTTP 实现。
///
/// 复用 `ApiClient.v2`（与 v1 同一条 token / 自动刷新 / 统一信封解析链，
/// 仅前缀不同），不在仓储层复制任何 HTTP、认证或错误处理逻辑。
class HttpRepository implements ProductRepository {
  const HttpRepository();

  @override
  Future<MarketProduct?> fetchDetail(int productId) async {
    // mount-relative `/market/products/:id`；外部完整路径 =
    // kV2Prefix（/api/v2）+ path，由 ApiClient.v2 统一拼装。
    final data = await ApiClient.v2.get('/market/products/$productId');
    if (data is! Map<String, dynamic>) return null;
    return MarketProduct.fromJson(data);
  }
}
