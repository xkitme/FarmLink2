import '../dto/market_product.dart';

/// 商品读取仓储接口（116f-D C6）。
///
/// 页面只依赖本接口，不直接接触 HTTP 客户端：
/// - 生产环境注入 `HttpRepository`（经 `ApiClient.v2` 走 /api/v2 只读端点）；
/// - 测试注入 fake 实现，从而在无网络/无后端的情况下锁定页面渲染与错误路径。
abstract class ProductRepository {
  /// 读取商品详情。
  ///
  /// 后端返回非对象 `data`（含 null）时返回 null（与旧页面
  /// `_data = null` 的铺底语义一致）；业务码非 200 时抛出 `ApiException`。
  Future<MarketProduct?> fetchDetail(int productId);
}
