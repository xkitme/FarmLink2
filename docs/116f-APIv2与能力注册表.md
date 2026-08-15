# 116f — API v2 与单一能力注册表（M2 工作单）

> 状态：116f-A ✅；116f-B ✅；**116f-C ✅ 已完成（2026-08-15 实施并全部验收通过 + 聚焦整改：认证等价与策略命中证据）**——market product 只读 v2 样板（薄适配器复用 v1 controller），v1/v2 等价契约测试全绿。口径：v1=242、登记 242/242；v2=5、登记 5/5；capabilities 总数 247；Backend 182/182、verify-all 15/15；116f-D 未开始（本轮不实施）；本轮未 commit、未 push
> 上位计划：[116-大重构总计划.md](116-大重构总计划.md) M2（第 5 章 5.3、第 9 章 M2）
> 决策来源：[116a-大重构决策记录.md](116a-大重构决策记录.md) ADR-009、[116b-大重构三档方案对比.md](116b-大重构三档方案对比.md)
> 风险依据：[116c-大重构风险报告.md](116c-大重构风险报告.md) R1-05（API v1/v2 漂移）、G3 架构闸门
> 基线：`codex/refactor-farmlink` @ `679a87d8`；盘点日期 2026-08-11（只读，未改任何源码/数据库）

---

## 1. 当前真实基线（源码盘点结果，非文档复述）

### 1.1 Backend（`backend/src/**/*.js` 共 84 个）

| 维度 | 现状（含源码证据） |
|---|---|
| 版本前缀 | `backend/src/config/index.js` L150 `apiPrefix: '/api/v1'`（v1 全局唯一前缀）；116f-B 起新增 `apiPrefixV2: '/api/v2'`，与 v1 共存（三端点骨架，复用同一条安全链） |
| 路由注册 | `backend/src/routes/index.js`：`registerRoutes(app, config.apiPrefix)` 把 10 个模块 router（platform/agri/market/machinery/disaster/policy/life/data/iot/ai）顺序挂到同一前缀。历史口径「244 行路由注册」是**源码注册语法命中数**（含 data/ai 两条 `router.use` 鉴权挂载，不等于外部 API 数量）；2026-08-15 实际枚举：终端 method+path 注册 **242** 条（platform 50、market 27、agri 28、machinery 23、disaster 16、policy 25、life 33、data 11、iot 5、ai 23，另加 `GET /ping`），分类明细见 §6.3 |
| 模块形态 | 每个模块 `X.routes.js` + 若干 `*.controller.js`，controller 直连 Prisma（`prisma.*`），**无 application service / repository 层**（属于 M3/M5，不在 116f） |
| 鉴权挂载 | `middleware/auth.js`：`optionalAuth` 全局（`app.js` L35）；`requireAuth`/`requireRole` **逐路由手写**（各 routes 文件）。原生端（`utils/client-detect.js` 判定）走 `Authorization: Bearer`；浏览器端走 HttpOnly cookie `access_token` 优先、Bearer 兜底（`extractTokenFromCookie`） |
| 中间件链 | `app.js` L19-40 顺序：trust proxy → CORS（`originGuard.isOriginAllowed` allowlist + credentials）→ json 10mb → cookieParser → traceMiddleware → optionalAuth → rateLimitMiddleware → apiSwitchMiddleware → operationLogMiddleware → originGuard → csrfGuard |
| CSRF | `middleware/csrf.js`：浏览器写请求 double-submit（`csrf_token` cookie + `X-CSRF-Token`），原生端豁免；登录/刷新豁免 |
| Origin | `middleware/originGuard.js`：写请求强制 Origin，dev 宽松 localhost/capacitor，非 dev 精确匹配 `CORS_ORIGINS` |
| 代理来源 | `utils/client-ip.js` + `config.resolveTrustProxy`（116e C2c 产物，只读） |
| 限流 | `middleware/apiControl.js`：`RATE_LIMITS` 7 桶 + `ratePlan(req)` 用 **路径正则/前缀 if 链**分类（global/authLogin/sms/ai/upload/tts/adminRead/adminWrite）；计数用 `utils/cache.js` NodeCache 内存 |
| API 开关 | `apiControl.js` `RULES`（20 条 method+regex 规则 → switch key）；开关本体存 DB `apiSwitch` 表（seeds 20 条 key，`backend/seeds/index.js` L99-122）；**代码 RULES 与 DB 种子是两份手工清单，漂移风险** |
| 操作日志 | `operationLogMiddleware`：非 GET 且 `originalUrl.startsWith(config.apiPrefix)` 才记录；v2 挂上后必须显式扩展，否则静默漏记 |
| 响应契约 | `utils/response.js`：`{ code, msg, data, timestamp, traceId }`；`ok/okPage/fail/errors.*`；业务码 200/40001/40101/40301/40401/42901/50001/60001/60002 |
| 弃用先例 | `modules/ai/ai.controller.js` L437-439：`DELETE /ai/qa/records/:id` 保留为 deprecated alias（console.warn），**无正式弃用策略（无响应头、无 sunset、无使用率观测）** |
| 能力注册表 | 116f-B 已建立：`backend/src/contracts/capabilities.js`（schemaVersion=1 静态 ESM；242 条 v1 只读对账登记 + 3 条 v2 骨架端点；由盘点脚本生成）。此前仅 AI 状态响应里有 `capability` 字段（`ai.controller.js` L214），是运行时能力描述，不是注册表 |
| OpenAPI/Swagger | **不存在**（全仓 grep 仅 docs 目标提及） |

### 1.2 Admin（`backend/admin/src/` 20 个源文件）

| 维度 | 现状（含源码证据） |
|---|---|
| 请求底座 | `src/api/request.js`：`API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'`；写请求注入 `X-CSRF-Token`；`credentials:'include'`；40101 → 清会话跳 `/admin/login?reason=expired` |
| 硬编码 v1 | `src/api/auth.js` L26 直接 fetch `'/api/v1/auth/me'`（不经过 API_BASE）；`src/pages/ApiDebugPage.jsx` L172 显示死文本 `/api/v1`；`src/pages/Placeholder.jsx` L21 文案 |
| apiCatalog | `src/apiCatalog.js`：**手写 24 条**（7 组），供 ApiDebugPage 预设（L25/L61/L73）；对比后端实际端点（当前估算 235+，精确数量由 116f-B 盘点脚本产出），覆盖不足 1/10 |
| resourceGroups | `src/resourceGroups.js`：与后端 `resource.config.js` 的 RESOURCE_GROUPS **手工镜像**（9 组 34 resource）；**`aiDetectRecord` 同时在 agri 组（L10）与 ai 组（L45）**（既有 gap，被 116d B20 显式锁定） |
| 后端侧同款重复 | `backend/src/modules/platform/resource.config.js` L12（agri 组）与 L47（ai 组）同样重复 |
| 测试契约 | `backend/admin/test/apiCatalog-resourceGroups.test.js`（B19/B20）：锁定 key 唯一 + `aiDetectRecord` 跨组重复为已知项；**本轮不改**，契约更新（去重后的单组归属）等实施批次正式开始后进行（D2，本轮只记录迁移方案） |

### 1.3 Flutter（`app/lib/**/*.dart` 共 77 个）

| 维度 | 现状（含源码证据） |
|---|---|
| 前缀 | `app/lib/core/constants.dart` L9 `kApiPrefix = '/api/v1'`；`api_client.dart` L72 拼 `$baseUrl$kApiPrefix$path` |
| 调用点 | 全仓 **135 处 `ApiClient.get/post/put/delete/...`**（grep 实测），分布在约 35 个文件（pages/、core/、widgets/），全部是**手写字符串 path** |
| 解析方式 | 页面大量 `as Map<String, dynamic>` 深解析（如 `home_page.dart` L77、`data_dashboard_page.dart` L44-47），无 typed DTO、无 Repository 接口（总计划 §2.3 要治理的目标） |
| 功能清单 | `core/feature_catalog.dart`：**71 个 FeatureItem** + 8 个 section，驱动搜索（`search_page.dart` L57）、全部服务（`all_features_page.dart`）、首页计数（`home_page.dart` L238） |
| 路由表 | `core/router.dart`：约 45 条 GoRoute，与 feature_catalog 的 route 字段**手工对齐** |
| 助手镜像 | `backend/src/modules/ai/services/assistant.service.js`：`ROUTE_CATALOG` 32 条 + `ROUTE_FEATURES` 别名表 + `ALLOWED_COMMANDS` 10 条，是 feature_catalog 的**后端手工镜像**（claude-memory 06-19 已记录该漂移坑） |
| 离线队列 | `core/offline_sync_queue.dart`：replay 表白名单 `{land_plot, farm_record, disaster_report}` 走 `POST /data/sync`，其余按 `item.path` 直发——离线写路径与后端 `sync.controller.js` `SUPPORTED_REPLAY_TABLES` 是又一份三表镜像 |

### 1.4 验证基线与数据库

- 统一入口：`scripts/verify-all.ps1` 14/14（Flutter pub/analyze/test/web build、Backend node --check、Backend 7 测试文件 111 断言、Admin test 28、Admin build、village.db 指纹保护）。
- 正式库 `backend/data/village.db` 指纹复核一致（本轮只读复核）：
  - SHA256 `FAEECCA0DB422213D71588D1A9B3128CF0E8BBDF45368F93641FCE4F10161E96`
  - Size `1155072`，Mtime UTC `2026-08-07T08:34:59.2995944Z`
- Backend/Admin lint 为已知非阻塞 gap（116d 记录，不属于 116f）。

---

## 2. 问题清单与源码证据

| # | 缺口 | 源码证据 | 归属 |
|---|---|---|---|
| P1 | **无能力注册表/路由元数据**：路由、鉴权、限流、开关四处信息无单一来源 | 10 个 `*.routes.js` 逐路由手写 `requireAuth/requireRole`；`apiControl.js` regex 分类 | 116f 核心 |
| P2 | **前端功能清单三份手工镜像**：`feature_catalog.dart`(71) ↔ `assistant.service.js` ROUTE_CATALOG(32)+ROUTE_FEATURES ↔ `router.dart`(45) 手工同步，历史已出漂移（claude-memory 06-19） | 见 1.3 证据行 | 116f |
| P3 | **Admin apiCatalog 手写且残缺**（24 条 vs 全量端点，当前估算 235+），ApiDebugPage 预设与真实路由脱节 | `backend/admin/src/apiCatalog.js` | 116f |
| P4 | **resourceGroups 双份镜像 + `aiDetectRecord` 跨组重复**（后端+Admin 各一处重复） | `resource.config.js` L12/L47；`resourceGroups.js` L10/L45 | 116f（去重需人工确认） |
| P5 | **限流/开关按路径 regex 手工分类**，新 v2 路由若不登记会落 global 桶/无开关，且漂移无检测 | `apiControl.js` `RATE_LIMITS`+`RULES`+`ratePlan` | 116f |
| P6 | ✅ v2 骨架/注册表已由 116f-B 建立（`routes/v2/index.js` + `contracts/*`）；弃用策略已冻结为规则（§5.5，只登记 1 条既有 alias），正式弃用观测待后续批次 | `routes/v2/index.js`；`contracts/*` | 116f-B 已落地 |
| P7 | **Flutter 无 typed DTO / Repository**，页面直连 ApiClient 并深解析动态 Map（135 处调用） | grep 证据见 1.3 | 116f 开样板，全量迁移属 M4-M7 |
| P8 | **operationLog 只认 `config.apiPrefix`**，v2 挂载后写日志会静默漏记 | `apiControl.js` L212 | 116f 必须同步处理 |
| P9 | Admin 存在 3 处硬编码 `/api/v1` 文本（auth.js L26、ApiDebugPage L172、Placeholder L21），切 v2 时易漏 | 见 1.2 证据行 | 116f |

> 注意：`P1~P9` 是 116f 的“工程结构”缺口。数据一致性（订单事务、同步跨用户）、领域分层（service/repository）、通用 CRUD 绕过领域规则（R1-07）**均不在 116f**，见 §10。

---

## 3. 116f 目标（对外口径）

建立 `/api/v2` 与 v1 共存的稳定边界，并把散落在路由、鉴权、限流、开关、搜索、助手、管理台目录中的**镜像清单收敛为一份单一能力注册表**；以最小只读样板证明「注册表驱动 + typed DTO」管线可用，为 M4~M7 的领域迁移铺路。

评委可见结果：v1 行为完全不变；架构上“一份注册表驱动多端”可讲清；OpenAPI/契约文件成为答辩依据。

## 4. 明确的不在范围内

- 不实施任何领域架构重构（order/product 的 service/repository、状态机 = 116i/M5；AI = 116j/M6）。
- 不修改 Prisma schema / migrations；不建注册表 DB 表（116f 一律静态文件）。
- 不修改或污染 `backend/data/village.db`（指纹保护见 §8）。
- 不删除任何 v1 路由；不改 v1 响应契约、字段、错误码语义。
- 不迁移全部 135 处 Flutter 调用点（只做 1 个读样板）。
- 不做全量 OpenAPI 生成工具链（116a §12 的 spike 项：116f 只冻结契约格式 + 手写注册表，生成链路决定权见 §11 D4）。
- 不降低 116e 任何安全策略（认证、CSRF、Cookie、Bearer、限流、Origin、代理信任、上传）。
- 不回退 116d 的 B1–B20 测试与 verify-all 门禁；B20 契约的修改等实施批次正式开始后进行，本轮只记录迁移方案（D2）。
- 不 push main、不创建 PR；116f 各批 commit 默认不 push（ADR-016）。

## 5. API v1/v2 兼容策略

1. **双版本共存**：`/api/v1` 原样保留；`/api/v2` 全新挂载在现有中间件链之后（`app.js` 中与 v1 同一位置注册），复用同一条安全链，不开旁路。
2. **响应信封不变**：v2 沿用 `{ code, msg, data, timestamp, traceId }` 与同一业务码表，不新增信封字段（避免三端解析分叉）；分页继续 `{ records, total, pageNum, pageSize, pages }`。
3. **v2 先行只读**：116f 内 v2 只开放只读端点（list/detail/catalog），写路径与领域命令留给 M3 之后的各领域批次（写接口的 CSRF/事务/状态机在领域里程碑里按矩阵补齐）。
4. **开关/限流对齐**：v2 端点必须带 `switchKey`（可空）与 `ratePlan` 元数据，初始与 v1 同名能力同键同桶；`apiSwitchMiddleware`/`ratePlan` 对 v2 由注册表驱动，v1 的 regex 逻辑**保持不动**直到 v1 退场。
5. **弃用策略（冻结为规则）**：
   - v1 端点逐步登记 `deprecated: true + deprecatedSince + sunset`（116f 只登记 `DELETE /ai/qa/records/:id` 这一既有 alias，其余 v1 暂不标 deprecated）；
   - 弃用响应增加 `X-Deprecated: true` 与 `Sunset` 头（由注册表驱动，v1 先不强制）；
   - **删除条件**（116c R1-05 关闭标准）：新 App 只调 v2、管理台契约通过、`operationLog` 观测 v1 使用率归零后才允许删除；116f 不做任何 v1 删除。
6. **观测**：operationLogMiddleware 扩展为同时记录 v1/v2（注册表或双前缀判定），为 v1 使用率归零提供数据。
7. **迁移边界**：Flutter `ApiClient` 增加 `ApiClient.v2.*`（或 `ApiGateway`），**不全局改前缀**；每页迁移时单独切换到 v2 + typed DTO；Admin 在 `VITE_API_BASE` 基础上增加 `VITE_API_V2_BASE`（默认 `/api/v2`），逐页切换。

## 6. 单一能力注册表：数据结构草案

### 6.1 落点与形态

- **落点**：`backend/src/contracts/capabilities.js`（静态 ESM 模块，后端可直接 import；同时提供 `GET /v2/capabilities` 与 `GET /v2/api-catalog`。访问控制见 D9：第一阶段 requireAuth + ADMIN；Flutter 消费走构建期生成（D5），管理台调试走 ADMIN 会话）。116f 不落 DB。
- **校验**（D6 修订）：`backend/src/contracts/registry.js` 启动期校验分两层——① 结构错误（schema 不合法、能力/API ID 重复、非法角色或权限元数据、路由模式冲突、ratePlan/switchKey 引用完整性）：**所有环境启动时 fail-fast**；② 覆盖缺口（已有路由尚未登记进注册表）：116f 迁移期间 dev/test fail-fast、demo/release 告警；**116f 标记完成前，覆盖完整性必须升级为所有环境硬门禁**。
- **派生**：assistant ROUTE_CATALOG/ROUTE_FEATURES、admin apiCatalog、Flutter feature_catalog 全部由它**生成或运行时读取**，消灭手工镜像。

### 6.2 数据结构（schemaVersion=1）

```js
// backend/src/contracts/capabilities.js（草案，非最终实现）
export const CAPABILITY_REGISTRY = {
  schemaVersion: 1,
  roles: ['FARMER', 'BIGFARMER', 'VILLAGE', 'EXPERT', 'MERCHANT', 'ADMIN'], // 复用 config.ROLES
  sections: { market: '流通销售', agri: '农业生产', /* …沿用 kFeatureSections */ },
  capabilities: [
    {
      id: 'cap.market.product.browse',          // 稳定 capability id（kebab-case）
      name: '集市商品浏览',
      aliases: ['买农产品', '赶集', '商城'],        // 助手/搜索口语别名
      keywords: ['集市', '农产品', '购买'],
      section: 'market',
      roles: ['*'],                              // '*' = 全部角色
      regionScoped: false,                       // 是否按 regionCode 隔离（VILLAGE 边界）
      visibility: { home: true, search: true, assistant: true, publish: false, admin: true },
      platforms: ['android', 'web', 'admin'],    // 消费端可见性
      requires: { network: true, camera: false, mic: false },
      flutterRoute: '/market',                   // 与 router.dart 对齐的 route key
      apis: [
        {
          apiId: 'market.product.list',
          method: 'GET',
          path: '/v2/market/products',           // v2 形态
          auth: 'optional',                      // none | optional | required
          roles: null,                           // required 时限定角色，null=任意登录用户
          ratePlan: 'global',
          switchKey: null,
          v1: {                                  // v1 对账信息（只读引用，不改 v1）
            path: '/market/product/list', method: 'GET', auth: 'optional',
            routesFile: 'modules/market/market.routes.js',
            deprecated: false, deprecatedSince: null, sunset: null,
          },
        },
        // …同一 capability 可挂多个 api
      ],
    },
    // cap.market.product.detail / cap.market.order.* / …
  ],
}
```

### 6.3 登记规则

- `apiId` 全局唯一；`capability.id` 全局唯一；capability 的 `apis[].path` 无重复方法+路径。
- 每个 api 必须带 `v1` 对账块（116f-B 由盘点脚本从现有 routes 文件生成初版；「235+ 端点」只是当前估算，精确数量由盘点脚本产出）。
- **116f-B 盘点脚本契约门禁**（可重复执行，输出不受文件扫描顺序影响）：① 实际路由总数（v1=242）；② 已登记数量（v1=242/242）；③ 未登记路由列表（0，含 file:line）；④ 重复 method+path（0）；⑤ 源路由未挂 requireAuth 的公开/可选认证端点（6，人工确认行为，非缺口）；⑥ 非法/无法解析定义（0）。另有注册表侧指标：注册表缺 auth 元数据 = 0（校验器 fail-fast 兜底）。分版本口径（116f-C 起）：v2 实际 5、登记 5/5（116f-B 三端点 + 116f-C `GET /market/products`、`/market/products/:id`）；注册表 capability 总数 247 = 242(v1)+5(v2)。
- **「244 注册语法命中」与「242 条 v1 终端路由」的差异（2026-08-15 实际枚举，非假设）**：
  - 终端 HTTP method+path 注册（`router.get/post/put/delete('path', ...)`，含多行写法）：10 个模块共 **241** 条（platform 50、market 27、agri 28、machinery 23、disaster 16、policy 25、life 33、data 11、iot 5、ai 23）+ `routes/index.js` 的 `GET /ping` 1 条 = **242**，即最终可外部访问的 v1 API 数。
  - `router.use` 中间件鉴权挂载（带路径，非终端路由）：**3** 条（`/agri`、`/ai`、`/data`，均为 requireAuth 作用域）。
  - `router.use` 子路由挂载（无路径字符串，非终端路由）：**10** 条（`routes/index.js` 挂载 10 个模块 router）。
  - 不在 `/api/v1` 下的 app 级路由：**2** 条（`GET /health`、`GET /admin/*`）+ 静态挂载 2 条（`/uploads`、`/admin`），均不在注册表范围内。
  - 历史口径「244」（116f-A）＝ 242 终端 + 2 条 `router.use` 鉴权挂载（data、ai 各 1 条被计入行数；agri 的同型行未计入）——该口径为源码语法命中数，**不等于外部 API 数量，本工作单不再使用**；完整注册语法命中（3 条 use 全计入）为 245，与注册表 capability 总数 245 恰好同值纯属巧合，两者含义不同（capability 245 = 242 v1 + 3 v2）。
- **注册表 path 是 mount-relative**：`capabilities[].apis[].path` 不含版本前缀。外部完整路径 = apiVersion 对应前缀 + path：**v1 → `/api/v1` + path**（`app.use(config.apiPrefix, router)`）；**v2 → `/api/v2` + path**（`app.use(config.apiPrefixV2, v2Routes)`）。既有测试锁定该组合规则：`contract-v2-skeleton.test.js` 断言注册表 path `/ping` 对应外部 `GET /api/v2/ping` 200、注册表 path `/market/product/list` 对应外部 `GET /api/v1/market/product/list` 200（v1 不回归测试）；`contract-registry.test.js` 锁定注册表 v1 path 的代表行（`/market/order`、`/auth/login` 等无前缀）与 `V2_ROUTE_DEFS`/注册表 v2 path 恰为 `/ping`、`/capabilities`、`/api-catalog`、`/market/products`、`/market/products/:id`。
- **auth 枚举语义（与实际 middleware 行为一致）**：`optional` = `optionalAuth` 语义——**尽力解析凭据**（合法 Bearer/Cookie 则挂 `req.user`，无凭据、非法、过期凭据一律忽略并继续，绝不阻断）；不是「公开且完全不解析凭据」。`required` = `requireAuth`（无/非法/过期凭据 → 40101 阻断）。116f-C 两个商品能力为 `optional`，与 v1 对应路由（market.routes.js 显式挂 `optionalAuth`）完全同链；七类认证输入（无凭据/合法 Bearer/合法 Cookie/格式错误 Authorization/空 Bearer/过期 Bearer/无效 Cookie）的 v1/v2 等价由 `contract-v2-market.test.js` 锁定。
- 新增 v2 端点强制先登记后挂载（routes/v2 从注册表装配中间件），未登记即挂载属启动错误（fail-fast，见 D6）。
- `ratePlan` 枚举 = 现有桶名 + `tts`；`switchKey` 引用现有 `apiSwitch.key` 集合。

## 7. 路由、鉴权、资源分组与前端调用方映射矩阵

> 下表是**代表行**（每个模块 1~3 行）。116f-B 会用可重复执行的盘点脚本对全部端点（当前估算 235+，精确数由脚本产出）生成完整矩阵（输出到 `docs/116f-映射矩阵-自动生成.md` 或契约目录），人工不维护全量表。

| 能力 | v1 端点 | routes 文件 | 认证/角色 | 限流桶 | 开关 key | Flutter 调用点（文件） | Admin 目录 | 资源组 |
|---|---|---|---|---|---|---|---|---|
| 登录 | `POST /auth/login` | platform.routes.js L26 | 无（发行方） | auth-login(ip) | — | `core/auth_state.dart` L85 | 无条目 | user |
| 当前用户 | `GET /auth/me` | platform.routes.js L31 | requireAuth | global | — | （refresh 链内） | `api/auth.js` L26 硬编码 | user |
| 资料/改密 | `PUT /user/profile`、`/user/password` | platform.routes.js L38-39 | requireAuth | global | — | `account_edit_page.dart`、`password_page.dart`、`elder_mode_page.dart` | 无条目 | user |
| 上传图片 | `POST /upload/image` | platform.routes.js L43 | requireAuth + uploadQuota | upload | media_upload | `account_edit_page.dart`(头像链) | 无条目 | — |
| 通知 | `GET /notification/list` `/unread` 等 | platform.routes.js L46-49 | requireAuth | global | — | `messages_page.dart`、`core/notification_state.dart` | apiCatalog ✓ | notification |
| 全局搜索 | `GET /search` | platform.routes.js L56 | optionalAuth | global | — | `search_page.dart` L84 | apiCatalog ✓ | — |
| 商品浏览 | `GET /market/product/list` `/:id` | market.routes.js L26/28 | optionalAuth | global | — | `market_page.dart` L199、`product_detail_page.dart` L66 | apiCatalog ✓ | product |
| 商品发布/我的 | `POST/PUT/DELETE /market/product*`、`/mine` | market.routes.js L27-31 | requireAuth | global | — | `publish_page.dart`(发布链) | 无条目 | product |
| 下单/订单 | `POST /market/order`、`GET /market/order/list`、`PUT .../status` | market.routes.js L34-37 | requireAuth | global | market_order | `market_page.dart` L842、`orders_page.dart` L34、`voice_assistant_layer.dart` L651/667 | 无条目 | order |
| 行情/溯源/团购 | `GET /market/price*`、`/futures`、`/export`、`/buyer*`、`/groupbuy*`、`/trace*` | market.routes.js L16-49 | optional/require 混合 | global | — | `market_service_page.dart` L51-532、`home_page.dart` L147 | apiCatalog ✓(price) | marketPrice/traceRecord/buyer |
| 农机 | `GET /machinery/list`、`POST /machinery`、`POST /machinery/booking` | machinery.routes.js L12-46 | optional/require 混合 | global | machinery_booking | `machinery_page.dart` L222/965/1208、`machinery_service_page.dart` L49-612 | 无条目 | machinery/machineryBooking/landTransfer |
| 灾害 | `GET /disaster/*`、`POST /disaster/report|sos|claim/assess` | disaster.routes.js L12-35 | optional/require 混合 | global | disaster_report | `disaster_page.dart` L66-771 | apiCatalog ✓(alert) | disasterReport/weatherAlert/emergencyGuide/insuranceClaim |
| 政策/党建/培训 | `GET/POST /policy*`、`/party*`、`/village*`、`/training*`、`/talent*` | policy.routes.js L12-53 | 混合 | global / ai(`/policy/ai/ask`) | subsidy_apply / ai_policy_qa | `policy_page.dart` L97-392、`policy_service_page.dart` L57-673、`publish_page.dart` L43 | apiCatalog ✓(policy) | policy/partyLesson/villageAffair/honorRecord/trainingCourse |
| 生活 | `GET/POST /life/*`（clinic/express/utility/tourism/job/loan/edu/help/secondhand/folk/env） | life.routes.js L12-66 | 混合 | global | community_post | `life_page.dart` L57-1263 | 无条目 | jobInfo/tourismSpot/secondhandItem/helpRequest/envReport/loanProduct |
| 数据看板/统计/同步 | `GET /data/dashboard|statistics`、`POST /data/sync` | data.routes.js L10-27 | module 级 requireAuth（`router.use('/data')`） | global | offline_sync | `home_page.dart` L132、`data_dashboard_page.dart` L44-47、`profile_page.dart` L48、`village_screen_page.dart` L53、`data_service_page.dart` L62-1144、`offline_sync_queue.dart` L128 | apiCatalog ✓(data-sync/sync-status/dashboard) | annualReport/statReport/syncLog |
| IoT | `GET /iot/devices|linkage*`、`POST /iot/linkage/rules/:id/toggle` | iot.routes.js L9-15 | optionalAuth（注意：toggle 写操作当前是 optionalAuth，v2 化时按能力矩阵补 requireAuth，属 116f 登记+后续领域批次） | global | — | `iot_page.dart` L51-110、`voice_assistant_layer.dart` L697/706 | 无条目 | — |
| AI 问答/助手/TTS/识图 | `POST /ai/chat|assistant/turn|tts`、`GET /ai/qa*`、`POST /ai/image/*`、`/ai/detect-feedback` | ai.routes.js L10-41 | module 级 requireAuth（`router.use('/ai')`） | ai / tts(tts) | ai_chat 等 12 键 | `ai_chat_page.dart` L123-1170、`ai_threads_page.dart` L42-118、`voice_assistant_layer.dart` L487、`voice_wake.dart` L38 | apiCatalog ✓(ai-status/ai-chat/qa 系列) | aiQaRecord/aiDetectRecord |
| 农事/地块/识图/建议 | `GET/POST /agri/*` | agri.routes.js L14-54 | module 级 requireAuth（`router.use('/agri')`） | global / ai(detect) / upload | ai_disease_detect 等 | `agri_page.dart` L52-782、`photo_flow_page.dart` L120/126、`home_page.dart` L77/111 | apiCatalog ✓(plot/farm-record/yield) | landPlot/farmRecord/diseaseKnowledge/aiDetectRecord/yieldPrediction |
| 后台治理（ADMIN） | `GET/POST/PUT/DELETE /admin/*` | platform.routes.js L59-81 | requireAuth + requireRole('ADMIN') | admin-read/write | — | 无（仅管理台） | apiCatalog ✓(switch/operation-log/rate-limit/seed) | — |

要点：
- **模块级 `router.use('/agri'|'/ai'|'/data', requireAuth)` 与逐路由 `requireAuth` 两种挂载风格并存**——注册表登记时统一为“每 api 一条 auth 元数据”，不改变运行时行为。
- **`aiDetectRecord`**（D2 已确认）：agri 为唯一 primaryGroup，ai 作为 tag/secondaryGroup 表达；注册表内能力 ID 全局唯一；既有 B20 characterization 契约的修改等实施批次正式开始后进行，本轮只记录迁移方案。
- Flutter 侧 135 处调用点全部登记在 api 的 `v1` 对账块中（盘点脚本按 path 扫描 `app/lib` 生成 `callers` 列表）。

## 8. 数据库隔离策略（116f 全程）

1. 注册表为静态 ESM 模块 + 生成产物，**不新增任何 Prisma 模型/表/migration**。
2. 现有 `apiSwitch` 表只读对齐 key 集合，不改表结构、不改种子行为。
3. 测试沿用 116d §6 模式：`mkdtempSync` 临时 SQLite + `prisma migrate deploy` + 动态 import；**禁止 `npx`**（会读 .env 覆盖 DATABASE_URL）。
4. `backend/data/village.db` 零接触：`verify-all.ps1` 的 SHA256/Size/Mtime 指纹保护继续生效；116f 各批完成后复核指纹 = 本工作单 §1.4 记录值。
5. 任何涉及新数据的登记（别名、可见性）先落静态文件；如未来需管理台编辑注册表，另行开工作单（不属于 116f）。

## 9. 分阶段实施顺序（每批独立 commit、独立回滚）

| 批 | 内容 | 文件级预计改动 | 退出条件 |
|---|---|---|---|
| **116f-A**（✅ 已完成）源码盘点、工作单与决策冻结 | 源码盘点（§1/§2）+ 本工作单冻结 + D1~D9 决策冻结 | 仅 docs（单条 commit，未 push） | 已完成的仅是盘点、工作单与 D1~D9 决策冻结（2026-08-15 确认）；**能力注册表、API v2 与任何业务代码尚未实施** |
| **116f-B** ✅ 已完成（2026-08-15）注册表与 v2 骨架 | ① 可重复执行的盘点脚本生成 `contracts/capabilities.js` 初版（覆盖全部 v1 路由元数据，只登记不改行为；输出不受文件扫描顺序影响，产出 §6.3 六项契约门禁数据）② `contracts/registry.js` 校验器（D6 分层）③ `routes/v2/index.js` + `/v2/ping`、`/v2/capabilities`、`/v2/api-catalog`（访问控制按 D9）④ `app.js` 挂 v2（复用安全链）⑤ `operationLogMiddleware` 兼容 v2 | 新增 `backend/src/contracts/*`、`backend/src/routes/v2/*`、`backend/scripts/inventory-routes.mjs`、`backend/scripts/gen-capabilities.mjs`、`backend/test/contract-registry.test.js`、`backend/test/contract-v2-skeleton.test.js`；编辑 `routes/index.js` 无改动、`app.js`、`apiControl.js`（仅日志判定）、`config/index.js`(apiPrefixV2) | ✅ 全部满足（验收数据见 §17 实施备注 2026-08-15）：注册表校验通过（结构错误全环境 fail-fast；覆盖缺口按 D6 分层）；盘点六项契约门禁通过；v2 三端点契约测试绿；**v1 业务语义完全不变**（全套测试 B1–B13 不回归）；operationLog 同时覆盖 /api/v1 与 /api/v2 写请求并有契约测试；Cookie/Bearer/CSRF/角色权限/限流/代理来源策略在 v2 不得弱化；正式 village.db 指纹不变；无 Prisma schema/migration 改动；v1/v2 薄适配器复用同一 controller/service、不复制业务逻辑（自 116f-C 首个适配器起验证） |
| **116f-C** ✅ 已完成（2026-08-15）v2 只读样板（market product list/detail） | ① 注册表登记 `cap.v2.market.products` / `cap.v2.market.products.detail`（path 按 mount-relative：`/market/products`、`/market/products/:id`；auth=optional；ratePlan=global、switchKey=null 与对应 v1 能力同语义）② `modules/market/market.v2.routes.js` 薄适配器（**直接复用 v1 `product.list`/`product.detail`，零业务逻辑复制**）③ v2 与 v1 响应逐字段契约测试（列表/过滤/排序/分页/详情/404/边界 id/写方法 404）④ `apiControl.js` 限流/开关对 v2 改由注册表元数据驱动（仅新增 v2 分支，v1 regex 逻辑不动） | 新增 `backend/src/modules/market/market.v2.routes.js`、`backend/test/contract-v2-market.test.js`（21 项）；编辑 `routes/v2/index.js`（V2_ROUTE_DEFS + 挂载）、`gen-capabilities.mjs`（overlay）、`apiControl.js`（v2RateBucket/v2SwitchKeyFor + resolveV2ApiPolicy/resolveV1RatePolicy 纯函数）、`package.json`、两个既有测试的口径断言 | ✅ 全部满足（2026-08-15）：v1/v2 同数据不同前缀、code/msg/data 逐字段一致；v1 全套（B1–B13）不回归；v2 写方法全部 404 无副作用；限流/开关与 v1 同语义（纯函数断言 + X-RateLimit-Policy 头实证）；临时库隔离；village.db 指纹不变；无 Prisma schema/migration 改动 |
| **116f-D** Flutter typed DTO 样板 | ① `core/dto/` MarketProduct/DashboardStats typed model ② `core/repository/` 接口 + `HttpRepository` ③ `ApiClient.v2` ④ 迁移 `product_detail_page.dart`（或 `data_dashboard_page.dart`）到 repository+DTO，行为不变 ⑤ DTO 解析单测 | 新增 `app/lib/core/dto/*`、`app/lib/core/repository/*`、`app/test/dto_*.dart`；编辑 `api_client.dart`、样板页 | flutter test 新单测绿；B14-B16 不回归；页面浏览器截图无视觉变化 |
| **116f-E** 管理台目录生成化 + 资源组去重 | ① `scripts/gen-admin-api-catalog.mjs` 从注册表生成 `apiCatalog.js`（v1 调试预设保留）② `resourceGroups.js` 与后端 `resource.config.js` 的 `aiDetectRecord` 去重（D2：agri 为唯一 primaryGroup，ai 转 tag/secondaryGroup）③ 实施批次正式开始后更新 B19/B20 契约测试（本轮只记录迁移方案） | 编辑/生成 `backend/admin/src/apiCatalog.js`、`resourceGroups.js`、`backend/src/modules/platform/resource.config.js`、`backend/admin/test/apiCatalog-resourceGroups.test.js`、新增生成脚本 | admin test 绿、admin build 绿；管理台资源页分组正确 |
| **116f-F** 注册表驱动搜索/助手/功能墙 | ① `assistant.service.js` 的 ROUTE_CATALOG/ROUTE_FEATURES 改为注册表派生（B9 `sanitizeAssistantOutput` 白名单行为不变）② Flutter `feature_catalog.dart` 由注册表生成（构建期脚本，离线安全）③ drift 检查入 verify-all | 编辑 `assistant.service.js`、`feature_catalog.dart`（生成）、`scripts/gen-*.mjs`、`scripts/verify-all.ps1`；新增 `backend/test/registry-derive.test.js` | 助手别名/功能墙/搜索与注册表一致；B9/B15 不回归；verify-all 全绿 |
| 后续 | 全量 v1→v2 写路径迁移、OpenAPI 生成、v1 删除 | 不属 116f | — |

## 10. 后续阶段边界（116f 之外）

| 事项 | 归属 |
|---|---|
| 订单/库存事务、状态机、服务层拆分 | 116i（M5 交易） |
| AI 植保轻量模型、助手命令注册表业务化 | 116j（M6） |
| SQLite migration 基线、同步隔离、备份恢复 | 116g（M3） |
| Flutter 基座/设计系统/全量页面迁移 | 116h（M4）+ 116k（M7） |
| 通用 CRUD 禁止直接改领域状态（R1-07） | 116g + 各领域批次 |
| v1 路由删除（需使用率归零） | 116f 之后独立批次 |
| OpenAPI 全量生成链路、DTO 代码生成工具 | 116f 只做格式冻结，工具链按 §11 D4 决定 |
| Backend/Admin lint 补齐 | 独立排期（116d 记录的 gap） |

## 11. 关键决策（2026-08-15 人工确认，D1~D9）

| # | 决策点 | 结论（推荐方案） | 状态 |
|---|---|---|---|
| D1 | 注册表落点：静态 ESM 文件 vs 管理台可编辑+落 DB | **静态文件**（离线安全、可评审、回滚简单）；DB 可编辑延后 | ✅ 已确认 |
| D2 | `aiDetectRecord` 去重 | **agri 为唯一 primaryGroup，ai 作为 tag/secondaryGroup 表达**；注册表内能力 ID 全局唯一；既有 B20 characterization 契约的修改等实施批次正式开始后进行，本轮只记录迁移方案 | ✅ 已确认 |
| D3 | v2 样板模块：market product（list/detail 只读）vs data dashboard | **market product**（最简单读路径、契约最稳定、116i 交易迁移直接受益） | ✅ 已确认 |
| D4 | OpenAPI 生成链路是否在 116f 内做 spike | **116f 只冻结格式**；工具链 spike 放 116f 后、116i 前单独做（避免 116f 范围膨胀） | ✅ 已确认 |
| D5 | Flutter feature_catalog 生成方式：构建期脚本生成 vs 运行时拉 `/v2/capabilities`+本地兜底 | **构建期生成 + 提交产物**（离线可用、CI 可查漂移）；运行时拉取仅作后续增强 | ✅ 已确认 |
| D6 | 注册表校验强度（2026-08-15 修订） | 分层校验：① schema 不合法/重复 ID/非法权限元数据 → **所有环境启动时 fail-fast**；② 「已有路由尚未登记」覆盖缺口 → 116f 迁移期间 dev/test fail-fast、demo/release 告警；**116f 标记完成前，覆盖完整性升级为所有环境硬门禁** | ✅ 已确认 |
| D7 | 116f 各批 commit/push 节奏：每批独立 commit，默认不 push | 沿用 ADR-016：commit 等用户确认，push 等网络恢复 | ✅ 已确认 |
| D8 | 推送缺口处置：本轮 GitHub 不可达（三次尝试均连接失败），`codex/refactor-farmlink` 本地领先远端 2 个提交未推送（116d 收口 + 116f-A docs 冻结） | 网络恢复后先 `git fetch origin codex/refactor-farmlink` 复核无分叉，再 push；若分叉则停止并报告 | ✅ 已确认 |
| D9 | v2 目录端点鉴权与暴露面（2026-08-15 新增） | `GET /v2/ping` 公开、只返回最小健康信息；`GET /v2/capabilities`、`GET /v2/api-catalog` 第一阶段 requireAuth + ADMIN；响应不得暴露 controller 路径、内部正则、密钥、限流实现细节或安全配置 | ✅ 已确认 |

## 12. 安全回归要求（116f 各批共同门槛）

- v2 与 v1 走同一条中间件链；任何 v2 写端点（后续批次）必须按 §7 矩阵的 auth/roles 元数据装配，并满足 116e 的 CSRF/origin/Cookie/Bearer 契约。
- `requireAuth` 原生端 Bearer、浏览器端 HttpOnly cookie 的判定逻辑（`client-detect.js`）不得改动。
- 限流不降低：v2 初始复用同名能力桶；`X-RateLimit-*` 头行为与 v1 一致。
- 操作日志同时覆盖 /api/v1 与 /api/v2 的写请求，并有写请求日志契约测试；`sanitizeBody` 脱敏规则同 v1。
- 116e 的 4 个测试文件（69 断言）、116d 的 B1–B20 全部保持通过；B20 契约修改等实施批次正式开始后进行（D2），本轮不动。
- `TRUST_PROXY`/CORS/上传边界不改；`verify-all.ps1` 的 village.db 指纹保护必须全绿。

## 13. characterization/contract 测试矩阵（116f 新增）

| # | 测试 | 断言要点 | 位置 |
|---|---|---|---|
| C1 | 注册表 schema 校验 | 无重复 apiId/capability id/方法+路径；roles 合法；ratePlan/switchKey 引用存在 | `backend/test/contract-registry.test.js` ✅（33 项断言，2026-08-15 落地） |
| C2 | v2 骨架契约 | `GET /v2/ping` 公开、只返回最小健康信息（200 envelope）；`/v2/capabilities`、`/v2/api-catalog` 第一阶段 requireAuth + ADMIN；响应不暴露 controller 路径、内部正则、密钥、限流实现细节或安全配置（D9） | `backend/test/contract-v2-skeleton.test.js` ✅（17 项断言，2026-08-15 落地） |
| C3 | v2 样板与 v1 逐字段一致 | `GET /v2/market/products` 与 `GET /market/product/list` 同数据集逐字段相同（含分页字段）；detail 三态（存在/不存在/边界 id）与 v1 完全一致；写方法 404；七类认证输入 v1/v2 等价 | `backend/test/contract-v2-market.test.js` ✅（21 项断言，2026-08-15 落地） |
| C4 | v1 不回归 | 116d B1–B13 原样跑（临时库） | 现有 7 个测试文件 |
| C5 | 派生一致性（drift guard） | 注册表派生的 ROUTE_CATALOG/ROUTE_FEATURES 与当前手工表**内容一致**（迁移期过渡断言，116f-F 后删除手工表）；生成的 admin apiCatalog 与注册表子集一致 | `backend/test/registry-derive.test.js` |
| C6 | Flutter DTO | typed DTO 解析正确/异常字段容错与现页面一致；Repository 接口可注入 fake | `app/test/dto_*.dart` |
| C7 | 管理台契约 | B19/B20 更新版：key 唯一、去重后的资源组归属正确、生成目录与注册表一致 | `backend/admin/test/apiCatalog-resourceGroups.test.js` |
| C8 | 安全回归 | C2b Cookie/CSRF、C2c 代理信任测试套件原样通过（不修改） | 现有 4 个 116e 测试文件 |
| C9 | 数据库指纹 | 各批结束后 village.db SHA256/Size/Mtime 与 §1.4 记录一致 | `verify-all.ps1` |
| C10 | 盘点脚本契约门禁 | 可重复执行：两次运行（含打乱文件扫描顺序）输出一致；报告含实际路由总数、已登记数量、未登记路由列表、重复 method+path、无鉴权/角色元数据的路由列表（§6.3 六项） | 盘点脚本（116f-B 引入）+ 相应断言 ✅（`backend/scripts/inventory-routes.mjs` + `contract-registry.test.js`） |

## 14. 验证命令

```powershell
# 统一入口（含 village.db 指纹保护）
powershell -File scripts/verify-all.ps1

# 注册表校验 + 契约测试
cd backend; npm test

# 注册表派生产物漂移检查（116f-B 起）
node scripts/gen-admin-api-catalog.mjs --check
node scripts/gen-feature-catalog.mjs --check   # 或 Flutter 侧等价检查

# Flutter
cd app
C:\dev\flutter\bin\flutter.bat analyze lib
C:\dev\flutter\bin\flutter.bat test
C:\dev\flutter\bin\flutter.bat build web --debug --pwa-strategy=none

# Admin
cd backend/admin; npm test; npm run build

# 语法检查（改动涉及的全部 JS）
Get-ChildItem backend/src,backend/test -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## 15. 风险与回滚方案

| 风险 | 概率/影响 | 缓解 | 回滚 |
|---|---|---|---|
| 注册表与真实路由漂移 | 高/中 | 启动校验 + C1/C5 drift 测试 + 生成物入 CI（verify-all） | 注册表纯新增，删文件即回滚 |
| v2 骨架意外影响 v1 | 低/高 | v2 独立 router 单独挂载；C4 全量 v1 回归 | 删除 `app.js` 中 v2 挂载一行 |
| 薄适配器复制业务逻辑 | 中/中 | 116f-C 明确“适配器只转发到既有 controller 逻辑”，code review 把关 | revert 该批 |
| Flutter 样板迁移破坏页面 | 中/中 | 只读路径 + B14-B16 守卫 + 截图验收 | revert 单文件（页面与 DTO 分离） |
| 助手别名派生改坏语音命令 | 中/高 | B9 `sanitizeAssistantOutput` 纯函数不动；派生结果与手工表过渡期逐项比对（C5） | revert assistant.service.js |
| 限流/开关误登记 | 中/中 | 注册表校验引用完整性；v2 初始默认沿用 v1 桶/键 | 改注册表一条记录即回滚 |
| 数据库被测试污染 | 低/高 | §8 临时库 + 指纹保护（沿用 116d 已验证模式） | —（禁止触碰正式库） |

## 16. 完成标准（116f 验收口径）

1. ✅（116f-B 达成）`GET /v2/ping`（公开、最小健康信息）与 `GET /v2/capabilities`、`GET /v2/api-catalog`（第一阶段 requireAuth + ADMIN，D9）可用；注册表初版覆盖现有全部 v1 路由的元数据登记（242/242）；盘点脚本六项契约门禁通过。
2. ✅（116f-C 达成）至少一条 v2 只读样板（market product list/detail）上线，与 v1 逐字段契约测试通过（`backend/test/contract-v2-market.test.js` 21 项）。
3. Flutter 样板页经 typed DTO + Repository 读取，页面行为与视觉无变化（截图验收）。
4. Admin apiCatalog 由注册表生成；`aiDetectRecord` 去重完成（agri 唯一 primaryGroup、ai 转 tag/secondaryGroup，B19/B20 更新版通过）。
5. 搜索/助手/功能墙由注册表派生（116f-F），三端不再维护手工镜像。
6. `verify-all.ps1` 全绿（含新增 drift 检查）；Backend 111/111（或更多）、Flutter、Admin 测试全绿；village.db 指纹不变。
7. 每批独立 commit，工作单回填实施备注；未经确认不 push。

## 17. 实施备注

- 2026-08-11：工作单建立。只读盘点完成（源码证据见 §1/§2）；未实施任何代码改动；未 commit。GitHub 网络不可达，`679a87d8` 尚未推送（详见交接报告）。
- 2026-08-15（116f-A 决策冻结，docs-only）：人工审查通过——D1/D3/D4/D5/D7/D8 确认采用推荐方案；D2 确认 agri 为 `aiDetectRecord` 唯一 primaryGroup、ai 作 tag/secondaryGroup、注册表能力 ID 全局唯一、B20 契约更新延至实施批次正式开始后；D6 修订为分层校验（结构错误全环境 fail-fast；覆盖缺口迁移期 dev/test fail-fast、demo/release 告警，116f 标记完成前升级为全环境硬门禁）；新增 D9（v2 目录端点鉴权与暴露面）；「235+ 端点」降级为当前估算，116f-B 由可重复执行的盘点脚本产出精确数量并设六项契约门禁；116f-B 退出条件强化。仅文档修订，未实施代码；随提交 `docs: 冻结 116f API v2 与能力注册表方案` 入库，未 push。
- 2026-08-15（116f-B 实施并验收 + 集中审查整改，未 commit）：
  - **统一数量口径**：v1 实际路由 **242**、注册表 v1 已登记 **242/242**；v2 实际路由 **3**（`GET /ping`、`/capabilities`、`/api-catalog`）、注册表 v2 已登记 **3/3**；注册表 capability 总数 **245 = 242(v1) + 3(v2)**。不再使用估算「235+」，不再用「242/242」含糊描述总注册表（代码注释、测试、三份 docs 均已同步）。
  - **盘点六项门禁**：① 总数 242；② 已登记 242；③ 未登记 0；④ 重复 method+path 0；⑤ 源路由未挂 requireAuth 的公开/可选认证端点 6（`GET /ping`、`POST /auth/login|register|refresh|reset-password|logout`，逐项人工确认的 116e 公开契约行为，注册表显式登记 auth=optional）；⑥ 非法定义 0。**注册表缺 auth 元数据 = 0**（独立指标，校验器 fail-fast 兜底）。输出不依赖文件扫描顺序（打乱文件列表逐字节一致；连续两次执行产物逐字节一致；fixture 构造重复/非法定义时精确失败并含 file:line）。
  - **新增文件（精确 9 个）**：`backend/scripts/inventory-routes.mjs`、`backend/scripts/gen-capabilities.mjs`、`backend/src/contracts/route-scanner.js`、`backend/src/contracts/capabilities.js`、`backend/src/contracts/inventory-report.json`、`backend/src/contracts/registry.js`、`backend/src/routes/v2/index.js`、`backend/test/contract-registry.test.js`（33 项）、`backend/test/contract-v2-skeleton.test.js`（17 项）。
  - **修改文件（6 个代码/脚本 + 3 个 docs）**：`backend/src/app.js`（启动校验 + v2 挂载，日志含 v1/v2/capabilities 三口径）、`backend/src/config/index.js`（apiPrefixV2）、`backend/src/middleware/apiControl.js`（导出 RULES；v1/v2 双前缀；operationLog v2 且 v1 行为不变）、`backend/package.json`（test 接入 2 个新文件，**无 --test-isolation 标志**）、`scripts/verify-all.ps1`（scripts/*.mjs 语法检查；drift 单步内顺序执行两个子门禁且失败传播非零，Note 标明两个子检查）、本文件/进度总览/claude-memory。
  - **POST /api/v2/ping 生产不存在**：生产 v2 路由表只有 3 个 GET（`V2_ROUTE_DEFS` + 注册表双重断言）；POST /api/v2/ping 真实请求 → 404 envelope（`接口不存在: POST /api/v2/ping`）；挂载未登记的 POST /ping 在 dev/demo/release 全环境 fail-fast（校验器测试证明）。operationLog 的 v2 写请求测试改用**测试专用 middleware harness**（`POST /api/v2/__contract/write`），该路径不挂载进生产 app、不进入正式注册表。
  - **backend/.gitignore**：本轮**零改动**（临时测试库一律由测试 finally/after 确定性清理，不用 .gitignore 隐藏验收残留；盘点 drift 产物为已提交契约文件，必须可见）。
  - **验收**：Backend **161/161**（原 111 + 新增 50）；C2b 19/19；C2c 34/34；Flutter 13/13；Admin 28/28；Admin build 通过；`verify-all.ps1` **15/15** 全绿（比基线多 1 个 drift 门禁步骤，该步骤 Note 明确两个子检查均执行）；正式 village.db 指纹前后一致（SHA256 `FAEECC...E96` / 1155072B / 2026-08-07T08:34:59.2995944Z）；`backend/prisma/.test-*` 残留 0；全仓库额外 DB 文件检查通过；Prisma schema/migrations 零改动。
  - **未实施**：116f-C（market product v2 样板）、Flutter feature_catalog 生成、OpenAPI 工具链、`aiDetectRecord` 实际去重与 B20 契约修改（仅在注册表 migrationNotes 记录 D2 迁移方案）；本轮未 commit、未 push。
- 2026-08-15（116f-C 实施并验收，未 commit）：
  - **外部路径**（mount-relative）：`GET /api/v2/market/products`、`GET /api/v2/market/products/:id`；与 v1 `GET /market/product/list`、`GET /market/product/:id` 对应。
  - **薄适配器证据**：`backend/src/modules/market/market.v2.routes.js` 共 2 条挂载，直接 `wrap(product.list)` / `wrap(product.detail)` 复用 `product.controller.js` 既有 handler；未新增任何查询/过滤/分页/seller 投影/images 解析代码。
  - **注册表/目录/限流/开关**：`gen-capabilities.mjs` overlay 新增 `cap.v2.market.products`、`cap.v2.market.products.detail`（auth=optional、ratePlan=global、switchKey=null——与对应 v1 能力同语义）；`apiControl.js` 增加 `V2_API_INDEX` + 纯函数 `v2RateBucket`/`v2SwitchKeyFor`（v2 由注册表元数据驱动），并把 v1 分类逻辑提取为纯函数 `v1RateBucket`/`v1SwitchKeyFor`（行为不变，供测试直接断言）；`ratePlan`/`matchedSwitch` 仅新增 v2 分支，v1 regex/桶语义原样保留。
  - **口径更新**：v1 保持 242/242；v2 3→**5**（5/5 登记）；capability 总数 245→**247**；两个 --check drift 门禁通过；`/v2/capabilities`、`/v2/api-catalog` 安全投影包含新条目且无内部字段泄露。
  - **测试**：新增 `backend/test/contract-v2-market.test.js`（21 项，独立临时 SQLite，已接入 npm test）：v1/v2 list/detail 完整 payload 等价（code/msg/data 逐字段 deepEqual + timestamp/traceId 结构性断言）；status=1、createdAt 降序、分页五字段、category/keyword、images 数组、seller 投影、404 与边界 id（abc/-1/0）三态一致；POST/PUT/DELETE 两个 v2 路径均 404 且无写库副作用；ratePlan/switchKey 纯函数直接断言（v2 vs v1 同桶同开关 + 正对照）与 X-RateLimit-Policy=global 头实证；GET 不产生操作日志。**聚焦整改新增 4 项**：① 七类认证输入（无凭据/合法 FARMER Bearer/合法 Cookie/格式错误 Authorization/空 Bearer/过期 Bearer/无效 Cookie）v1/v2 状态+code+msg+data 全等价；② `resolveV2ApiPolicy` 命中证据（两个商品能力 matched=true + capabilityId 直接断言，覆盖 mount-relative/完整 /api/v2 前缀/query/参数路径/尾斜杠五种形态）；③ 未知 v2 路由 matched=false 明确走既有 fallback；④ v1 ratePlan/switchKey 硬编码 characterization 表（41 行，锁定重构前既有行为，含 admin 分桶与 method 不误命中）。Backend 全量 **182/182**（161 + 21）；C2b 19/19；C2c 34/34；Admin 28/28 + build；Flutter 13/13；`verify-all.ps1` 15/15（node --check 106 文件）。
  - **数据库/安全**：village.db 指纹前后一致（FAEECC...E96 / 1155072B / 2026-08-07T08:34:59Z）；Prisma schema/migrations 零改动；`backend/prisma/.test-*` 残留 0；未改 116d/116e 状态；`HARD_COVERAGE_GATE_ALL_ENVIRONMENTS` 未提前翻转。
  - **未实施**：116f-D（Flutter typed DTO 样板）及后续批次、Flutter/Admin 调用方迁移、feature_catalog 生成、OpenAPI、`aiDetectRecord` 去重与 B20；本轮未 commit、未 push。
