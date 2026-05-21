# 分段 05 — market 模块 API（流通销售）

> 状态：✅ 完成

## 任务目标

实现板块二「农产品流通与销售」12 个功能模块的后端 API。

## 执行内容

### 模块化目录
```
src/modules/market/
├── market.routes.js       路由汇总（28 接口）
├── price.controller.js    行情/价格预测/期货/出口合规
├── product.controller.js  商品 CRUD
├── order.controller.js    订单 + 物流追踪
├── trace.controller.js    溯源码生成/查询
├── buyer.controller.js    收购站地图 + 农资团购
└── aimarket.controller.js AI 质量分级/包装文案/直播话术
```

### API 清单（28 接口，覆盖 12 模块）

| 模块 | 接口 |
|---|---|
| 实时价格行情 | GET /market/price、/market/price/trend |
| 价格趋势预测 | GET /market/price/predict |
| 期货行情参考 | GET /market/futures |
| 出口合规查询 | GET /market/export |
| 乡村集市电商 | GET/POST/PUT/DELETE /market/product、/market/product/mine |
| （订单） | POST /market/order、GET /market/order/list、:id、PUT :id/status |
| 冷链物流对接 | GET /market/logistics/:no（发货自动生成物流单） |
| 溯源码生成 | POST /market/trace/generate、:code/record、GET /market/trace/:code |
| 收购站地图 | GET /market/buyer/map、/market/buyer/list |
| 农资团购拼单 | GET /market/groupbuy/list、POST /market/groupbuy、:id/join |
| AI质量分级 | POST /market/grade/detect |
| 包装设计助手 | POST /market/package/generate |
| 直播带货助农 | POST /market/live/script |

### 设计要点
- 下单自动扣库存、增销量；取消订单回补库存；发货自动生成冷链物流单
- 溯源：生成溯源码绑定商品 + 写入种植环节，可逐环节追加，查询公开
- 团购：参团累加，达目标自动成团（SUCCESS）
- 行情/期货/出口合规/溯源查询为公开接口（optionalAuth）
- AI 质量分级/文案为离线规则模板版，分段 11 接入 Ollama

## 修复的 Bug

**关键 Bug**：`agri.routes.js` 用了无路径的全局 `router.use(requireAuth)`，因 router 以 `router.use(agriRoutes)` 挂载（无前缀），导致 requireAuth 拦截**所有**请求——使 market 的公开接口对未登录用户返回 401。
**修复**：改为 `router.use('/agri', requireAuth)`，仅对 `/agri` 路径生效。

## 验证

冒烟测试 **28/28 通过**：行情/期货/出口、商品 CRUD、下单/订单流转/物流、溯源全链路、收购站/团购、AI 三项。

## 下一步

分段 06：machinery 模块 API（农机共享 8 模块）
