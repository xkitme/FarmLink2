# Claude 跨会话交接簿

> 每个会话结束前,把"当前未提交状态 / 待办 / 坑"写到这里**最上方**(新会话在最前,带日期)。
> **新会话开工前必读本文件 + `docs/进度总览.md`。** 这是用户指定的交接入口。

---

## 2026-08-15 · 116f-C 实施并全部验收通过（market product 只读 v2 样板；未 commit、未 push）

**分支/工作树**：`codex/refactor-farmlink`，HEAD=`1d6f3341` 不变。116f-C 全部验收通过，**未 commit**。GitHub 网络未重试（本地仍 ahead 3）。

**做了什么（116f-C 交付）**：
- **外部路径**：`GET /api/v2/market/products`、`GET /api/v2/market/products/:id`（mount-relative；与工作单建议一致，无别名冲突）。
- **薄适配器**：新增 `backend/src/modules/market/market.v2.routes.js`——只有 2 条挂载，直接 `optionalAuth + wrap(product.list|detail)` 复用 v1 `product.controller.js`，零业务逻辑复制。挂载进 `routes/v2/index.js`（`router.use(marketV2Routes)` + `V2_ROUTE_DEFS` 扩到 5 条）。
- **注册表/目录/限流/开关**：`gen-capabilities.mjs` overlay 新增 `cap.v2.market.products`、`cap.v2.market.products.detail`（auth=optional、ratePlan=global、switchKey=null，与对应 v1 能力同语义——v1 list/detail 无开关规则、global 桶）。`apiControl.js` 新增 `V2_API_INDEX`（注册表 v2 元数据索引）+ 纯函数 `v2RateBucket`/`v2SwitchKeyFor`；v1 分类逻辑提取为纯函数 `v1RateBucket`/`v1SwitchKeyFor`（行为不变，供测试直接断言）；`ratePlan`/`matchedSwitch` 仅加 v2 分支，v1 regex 逻辑不动。
- **口径**：v1 保持 242/242；v2 3→**5**（5/5 登记）；capability 总数 245→**247**；两个 --check drift 门禁通过；ADMIN 安全投影含新条目且无内部字段泄露。
- **测试**：新增 `backend/test/contract-v2-market.test.js`（21 项，独立临时 SQLite，接入 npm test 普通 node --test）：list/detail v1/v2 完整 payload 等价（code/msg/data deepEqual + timestamp/traceId 结构性）；status=1、createdAt 降序、分页五字段、category/keyword、images 数组、seller 投影、404 与边界 id（abc/-1/0）一致；POST/PUT/DELETE 两个 v2 路径均 404 且无写库副作用；ratePlan/switchKey 纯函数直接断言 + X-RateLimit-Policy=global 头实证；GET 不产生操作日志。**聚焦整改新增 4 项**：① 七类认证输入（无凭据/合法 FARMER Bearer/合法 Cookie/格式错误 Authorization/空 Bearer/过期 Bearer/无效 Cookie）v1/v2 状态+code+msg+data 全等价——`optional` 的真实语义是 optionalAuth「尽力解析凭据，非法/过期忽略不阻断」，v1 与 v2 同链（market.routes.js 与 market.v2.routes.js 均显式挂 optionalAuth）；② `resolveV2ApiPolicy(method,path)` 纯函数命中证据（matched=true + capabilityId 直接断言，覆盖 mount-relative/完整 /api/v2 前缀/query/参数路径/尾斜杠五种形态；生产 v2RateBucket/v2SwitchKeyFor 走同一实现）；③ 未知 v2 路由 matched=false → 明确 fallback（global/null），不假装已登记；④ v1 ratePlan/switchKey 硬编码 characterization 表（41 行含 admin-read/write 分桶、method 不误命中、参数路径），锁定重构前既有行为（非从 RULES 动态生成）。**Backend 182/182**（161+21）；C2b 19/19；C2c 34/34；Admin 28/28+build；Flutter 13/13；verify-all 15/15（node --check 106 文件）。
- **数据库/安全**：village.db 指纹不变（FAEECC...E96 / 1155072B / 2026-08-07T08:34:59Z）；Prisma schema/migrations 零改动；`.test-*` 残留 0；116d/116e 状态未动；`HARD_COVERAGE_GATE_ALL_ENVIRONMENTS` 未翻转；B19/B20 与 aiDetectRecord 未动。

**⚠️ 下个会话注意**：① 116f-C 改动未 commit（11 个 M + 2 个 ??：market.v2.routes.js、contract-v2-market.test.js），等人工审查；② 下一步 116f-D（Flutter typed DTO 样板：core/dto + repository + ApiClient.v2 + 样板页迁移），需人工确认后再开；③ 边界 id（非数字）在 v1/v2 都返回 50001（Prisma validation error），是既有行为、等价契约已锁定，不算缺陷；④ 116f 完成前仍要把覆盖缺口升级为全环境硬门禁；⑤ 推送缺口未关（ahead 3）。

---

## 2026-08-15 · 116f-B 实施并全部验收通过 + 集中审查整改（未 commit、未 push）

**分支/工作树**：`codex/refactor-farmlink`，HEAD=`fe79c6a2` 不变。116f-B 全部验收通过并经集中审查整改，**未 commit**。GitHub 网络未重试（本地仍 ahead 2）。

**统一数量口径（代码注释/测试/docs 三处一致）**：v1 实际路由 **242**、注册表 v1 登记 **242/242**；v2 实际路由 **3**（GET /ping、/capabilities、/api-catalog）、注册表 v2 登记 **3/3**；注册表 capability 总数 **245 = 242(v1)+3(v2)**。禁止再用「242/242」含糊描述总注册表。

**做了什么（116f-B 交付 + 审查整改）**：
- **盘点脚本** `backend/scripts/inventory-routes.mjs`（--write/--check）+ 纯静态扫描器 `backend/src/contracts/route-scanner.js`（只读源码、不执行业务、不连库）。六项门禁：总数 242 / 已登记 242 / 未登记 0 / 重复 method+path 0 / 源路由未挂 requireAuth 的公开端点 6（/auth/login|register|refresh|reset-password|logout、GET /ping，逐项人工确认的 116e 公开契约，注册表显式登记 optional——**独立指标「注册表缺 auth 元数据」= 0**）/ 非法定义 0。确定性：打乱文件列表逐字节一致；连跑两次产物逐字节一致；--check 一致时退出 0；fixture 构造重复/非法定义精确失败含 file:line。
- **注册表** `backend/src/contracts/capabilities.js`（schemaVersion=1，242 v1 + 3 v2，由 `gen-capabilities.mjs` 生成；switchKey 复用 apiControl.RULES；`migrationNotes.aiDetectRecordResourceGroups` 只记录 D2 方案，未实施）。
- **校验器** `backend/src/contracts/registry.js`（D6：结构错误/重复 ID/非法角色/重复 method+path/v2 未登记即挂载 → 全环境 fail-fast；覆盖缺口 dev/test fail-fast、demo/release 告警；`HARD_COVERAGE_GATE_ALL_ENVIRONMENTS` 预留在 116f 完成前升硬门禁）。`app.js` 启动打印三口径。
- **v2 三端点** `backend/src/routes/v2/index.js`：GET /v2/ping 公开最小健康（断库后仍 200）；/v2/capabilities、/v2/api-catalog requireAuth+ADMIN；显式投影不含 routesFile/line/ratePlan/switchKey/regex/密钥/安全配置。**生产不存在 POST /api/v2/ping**：真实请求 404（接口不存在），注册表 + V2_ROUTE_DEFS 仅 3 个 GET，挂载未登记 POST /ping 全环境 fail-fast。
- **operationLog**：v1/v2 双前缀；v2 写记录 `/api/v2/...` 完整路径 + module 归一（system）；v1 行为不变；XFF 伪造仍被既有可信代理策略忽略。**v2 写契约测试用测试专用 middleware harness（`POST /api/v2/__contract/write`）**——不挂载进生产 app、不进正式注册表。
- **backend/.gitignore 本轮零改动**：临时测试库一律 finally/after 确定性清理（contract 测试 rmSync + fixture mkdtemp finally），不用 gitignore 隐藏残留；inventory-report.json/capabilities.js 是已提交契约产物，必须可见可 diff。
- **测试**：新增 50 项（`contract-registry.test.js` 33 + `contract-v2-skeleton.test.js` 17），接入 `backend/package.json` npm test（**无 --test-isolation 标志**）。**Backend 161/161**（原 111）；C2b 19/19；C2c 34/34；Admin 28/28 + build；Flutter 13/13；`verify-all.ps1` **15/15**（比基线多 1 个 drift 门禁步骤，该步骤 Note 标明 inventory--check 与 gen--check 两个子检查均执行，失败传播非零）。
- **数据库/安全**：village.db 指纹前后一致（FAEECC...E96 / 1155072B / 2026-08-07T08:34:59Z）；Prisma schema/migrations 零改动；`backend/prisma/.test-*` 残留 0；全仓库额外 DB 文件检查通过；resourceGroups/B20 未动。

**⚠️ 环境坑（本会话实测，已解决）**：
- 早期沙箱（workspace-write）禁止子进程 stdio 管道，曾用 `--test-isolation=none` 临时跑单文件；**当前会话已切 danger-full-access，正式口径一律用普通 `node --test` / `npm test`，不用 isolation=none**。
- `verify-all.ps1` 被 Windows PowerShell 5.1 按 ANSI 读取：**该文件保持纯 ASCII**（新增说明用英文），中文只出现在 docs/业务文件。
- Flutter 工具链 `flutter --version` 会自动 `git fetch --tags`（flutter 官方仓库），离线打 stderr 但 exit 0——不是 FarmLink 仓库操作，无需处理。

**下个会话注意**：① 116f-B 改动未 commit（git status 清单：9 M + 9 个新增文件 + 2 个新目录），等人工审查决定；② 下一步 116f-C（market product v2 只读样板 + 薄适配器复用 v1 controller），需人工确认后再开；③ 116f 完成前把 `HARD_COVERAGE_GATE_ALL_ENVIRONMENTS` 翻 true；④ B19/B20 与 aiDetectRecord 去重仍未动（D2 延后到实施批次）；⑤ 推送缺口未关（ahead 2）。

---

## 2026-08-15 · 116f-A 决策冻结：工作单 D1~D9 人工确认（docs-only 单条提交，未 push）

**分支/工作树**：`codex/refactor-farmlink`。本轮只改 3 个 docs 文件，以单条 commit（`docs: 冻结 116f API v2 与能力注册表方案`）入库、未 push；GitHub 网络缺口未重试（按 D8：网络恢复后先 fetch 复核无分叉再 push，分叉则停手报告）。

**本轮人工审查结论**：
- **D1/D3/D4/D5/D7/D8 已确认**，采用推荐方案：注册表静态文件 / market product 样板 / 116f 只冻结 OpenAPI 格式 / feature_catalog 构建期生成+提交产物 / 每批独立 commit 默认不 push / 推送缺口按 D8 处置。
- **D2 确认**：`aiDetectRecord` 唯一 primaryGroup=agri；ai 作为 tag/secondaryGroup 表达；注册表内能力 ID 全局唯一；既有 B20 characterization 契约修改等实施批次正式开始后进行，本轮只记录迁移方案。
- **D6 修订**：① 注册表 schema、重复 ID、非法权限元数据 → 所有环境启动时 fail-fast；② 「已有路由尚未登记」覆盖缺口 → 116f 迁移期间 dev/test fail-fast、demo/release 告警；③ 116f 标记完成前，覆盖完整性必须升级为所有环境硬门禁。
- **新增 D9**：`GET /v2/ping` 公开且只返回最小健康信息；`GET /v2/capabilities`、`GET /v2/api-catalog` 第一阶段 requireAuth + ADMIN；响应不得暴露 controller 路径、内部正则、密钥、限流实现细节或安全配置。
- **「235+ 端点」降级为当前估算**：116f-B 由可重复执行的盘点脚本产出精确数量，六项契约门禁——实际路由总数、已登记数量、未登记路由列表、重复 method+path、无鉴权/角色元数据的路由列表、输出不受文件扫描顺序影响。
- **116f-B 退出条件强化**：v1 业务语义完全不变；v1/v2 薄适配器复用同一 controller/service、不复制业务逻辑；operationLog 同时覆盖 /api/v1 与 /api/v2 写请求并有契约测试；Cookie/Bearer/CSRF/角色权限/限流/代理来源策略在 v2 不得弱化；正式 village.db 指纹不变；无 Prisma schema/migration 改动。

**验证**：`git diff --check`、`git diff --cached --check` 通过；`git status -sb` 复核仅 3 个 docs 文件；未跑长测试、未重试 GitHub 网络。

**下个会话注意**：① 116f-A（源码盘点、工作单与决策冻结）已完成；注册表、API v2 与任何业务代码尚未实施，下一步 116f-B（先写可重复执行的盘点脚本，产出 §6.3 六项契约门禁数据）；② 推送缺口未关（D8）；③ 不要重复跑 116d/116e 长测试；④ B19/B20 契约本轮不动，更新等实施批次正式开始后。

---

## 2026-08-11 · 116f 只读盘点与工作单建立（未实施、未提交；116d 推送缺口未关闭）

**分支/工作树**：`codex/refactor-farmlink` 干净，HEAD=`679a87d8`（116d 收口），跟踪分支 `origin/codex/refactor-farmlink`=`6dd9f0b3`，本地 ahead 1。**GitHub 443 连接失败（fetch/ls-remote 两次重试均超时重置），推送未执行，未声称成功**。网络恢复后先 fetch 复核无分叉再 push；分叉则停手报告。

**本轮产出（全部未 commit，待人工审查）**：
- 新增 `docs/116f-APIv2与能力注册表.md`：正式工作单，含真实基线/9 项缺口与源码证据/注册表 schema 草案/映射矩阵/116f-A~F 分阶段/决策 D1~D8。
- 更新 `docs/进度总览.md`：加 116f 行 + 当前状态/下一步。

**盘点关键事实（写工作单时用）**：v1 前缀唯一 `config.apiPrefix='/api/v1'`；10 模块 244 行路由注册；中间件链 app.js L19-40（trust proxy→cors→optionalAuth→rateLimit→apiSwitch→opLog→originGuard→csrfGuard）；限流/开关是 `apiControl.js` 里的 method+regex 手工清单（20 个 switch key 存 DB apiSwitch 表）；`aiDetectRecord` 在 resource.config.js L12/L47 与 admin resourceGroups.js L10/L45 双组重复（116d B20 锁定的 gap）；Flutter 135 处 ApiClient 调用、71 项 feature_catalog 与后端 assistant.service.js 的 ROUTE_CATALOG/ROUTE_FEATURES 是手工镜像；admin apiCatalog 手写 24 条；无 OpenAPI；无能力注册表。village.db 指纹复核一致（SHA256 FAEECC...E96 / 1155072B / 2026-08-07T08:34:59Z）。

**下个会话注意**：① 116f 未实施，等人工审查工作单（重点决策：注册表静态文件落点、aiDetectRecord 去重、v2 样板选 market product、OpenAPI 工具链延后）；② 推送缺口未关；③ 不要重复跑 116d 长测试（工作树无变化）。

---

## 2026-08-02 · 116e Phase C1 完成：客户端凭据生命周期 + 管理台 stopgap

当前实施分支仍为 `codex/refactor-farmlink`。本批已按后端 / Flutter 客户端 / 管理台拆成三个本地里程碑提交：

- `33ebfd32`：后端 `POST /auth/logout` 同时支持 access/refresh 撤销，补齐同 refresh 并发 rotation 只允许一个后继会话、refresh-only logout 幂等撤销的回归。
- `e520fc26`：Flutter 凭据迁到系统安全存储，旧 `SharedPreferences` 明文迁移，refresh rotation 去重、失效清理与 logout 清本地全部接通。
- `ede249c0`：管理台 stopgap 收口：refresh 不再写 localStorage，外部绝对 URL 调试不自动带管理 token，退出先撤销服务端会话再清本地，登录页加过期/退出提示。

**浏览器验收**：真实浏览器截图已完成，包含登录失效提示页、管理台 dashboard、退出后返回登录页三态。

**验证**：`scripts/verify-all.ps1` 已完整通过；Flutter analyze/test/Web build、后端 79 个 JS 语法检查、16 项后端测试、管理台 build 均通过。管理台 bundle >500k 仍是已知 P1 警告。`flutter pub get --offline` 依赖解析已稳定，`app/pubspec.lock` 仅保留新增安全存储依赖。

**下一步**：继续 `docs/116e-身份安全与权限矩阵.md` Phase C2。优先做完整 HttpOnly Cookie 契约、CORS allowlist、代理来源信任、日志脱敏复核和上传安全；不要再把 refresh token 明文长期留在 SharedPreferences/localStorage。

---

## 2026-08-02 · 116e Phase B 完成：可撤销会话与一次性重置码

当前实施分支仍为 `codex/refactor-farmlink`。本批已按后端和双端界面拆成两个里程碑提交：

- `ae0a013c`：新增 `AuthSession` / `PasswordResetCode` 正式迁移、历史 `passwordChangedAt` 漂移修复、refresh rotation、设备会话撤销、ADMIN 一次性重置码、改密全会话下线和 13 项安全回归测试。
- `aed2461a`：Flutter 忘记密码页改用 6 位重置码，手动退出调用服务端；管理台新增“账号安全”页，提供重置码票据和按账号强制下线。
- `90d8d0b5`：补齐 `resetCode` / `verificationCode` / `otp` 审计脱敏并新增回归，最终后端测试为 14 项。

**额外关闭的 P0**：`PUT /user/profile` 曾允许本人写 `regionCode`，VILLAGE 角色可借此逃逸区域边界；现已明确返回 403，数据库值不变，并加入集成测试。`villageName` 仍是展示资料，不参与授权判断。

**数据库**：`npm run db:deploy --prefix backend` 已在本机演示库执行。安全迁移脚本识别到历史库已有 `passwordChangedAt` 列但缺迁移记录，先补记迁移历史，再创建会话/重置码表；没有清空业务数据。以后生产启动会先执行同一安全迁移入口。

**验收**：管理台账号安全页空态/生成结果态、Flutter 重置页均已完成浏览器截图验收；统一脚本通过 Flutter analyze/test/Web build、后端 79 个 JS 语法检查、14/14 测试和管理台生产构建。收口时另修复审计日志会记录 `resetCode` 明文的问题，现与 password/token/secret 一并过滤。已知剩余基线缺口仍是后端 lint、管理台 test/lint，以及管理台 bundle >500k 警告。

**下一步**：继续 `docs/116e-身份安全与权限矩阵.md` Phase C。优先做 Flutter 凭据安全存储与迁移、管理台安全 Cookie，再收 CORS/代理来源、日志脱敏复核、上传 MIME/解码/重编码/EXIF/配额，以及 demo HTTP / release HTTPS 构建策略。不要把 refresh token 明文长期留在 SharedPreferences/localStorage 作为最终方案。

---

## 2026-08-02 · 116 已开工：M0 完成、M1 Phase A 完成

用户已明确回复“开工”。旧 116 删除型代码 WIP 已完整封存在 `codex/archive-116-wip`（`74ac4423`，约 10003 行删除及原有用户改动均保留）；当前实施分支为 `codex/refactor-farmlink`，不得把归档 WIP 直接合回重构分支。

**已完成**：

- `e27c5096`：冻结 116/116a/116b/116c 计划与决策。
- `d0901332`：新增 `docs/116d-基线与统一验证入口.md` 和 `scripts/verify-all.ps1`。
- `0063038b`：公开注册固定 FARMER；忽略 role/region；兼容 `displayName`；access/refresh token 分密钥、分类型；新增 dev/demo/release 安全配置门禁和 Node 安全测试。
- `e659627c`：管理台不再预填 admin/123456；种子密码改用环境策略，demo 必须显式提供，release 禁止执行种子脚本。

**验证**：统一脚本完整通过；Flutter analyze/test/Web build、后端 75 个 JS 语法、5 个安全测试、管理台 build 均通过。管理台 bundle >500k 警告是已知 P1；后端 lint、管理台 test/lint 仍是基线缺口。

**下一步**：继续 `docs/116e-身份安全与权限矩阵.md` Phase B。优先把旧“账号+手机号直接重置密码”替换为 ADMIN 生成、5 分钟过期、最多 5 次、只能使用一次的重置码；同时新增持久 `AuthSession`、refresh rotation、logout/改密撤销。必须先写 migration 和回归测试，不能只改 Flutter 表单。

---

## 2026-08-02 · 116 大重构方案冻结（未开工）

用户完成 `117` 与 `117a` 两轮问卷，正式冻结新的 116 大重构方向。**实际验收对象是评委，目标用户是农户**：界面必须按正式农户产品呈现，不出现比赛/Demo/开发文案；设计与演示流程优先让评委快速看懂价值并稳定完成操作。

**状态**：只新增/更新 docs，尚未实施业务代码。正式计划为 `docs/116-大重构总计划.md`，配套 `116a` 决策记录、`116b` 三档方案、`116c` 风险报告。旧 `116-核心功能收敛.md` 已标记为历史草案。

**基线硬约束**：

- 正式代码基线是 `0b23591f`。
- 当前工作区约一万行未提交 116 删除 WIP 必须保留，用户以后明确要求时才能删除；不得直接在 dirty tree 上开工。
- 用户未回复“开工”前，不得修改业务代码、切换/清理当前 WIP 或自动 commit/push。
- 开工后第一步是 M0：安全保存 WIP，再从 `0b23591f` 创建 `codex/refactor-*` 干净分支。

**方向**：Flutter Android 正式端，Web 仅预览；Express ESM + Prisma + SQLite 模块化单体；无 Docker；交易与 AI 植保为双头牌；AI 不强依赖本地大语言模型，改走轻量植保模型 + 规则知识库 + 离线意图，云 Provider 默认关闭；sherpa 模型随 APK，APK 上限 600MB。

**本机配置**：i7-14650HX / 约16GB RAM / RTX 5060 Laptop 8151MiB / Windows 11；Flutter 3.32.1 位于 `C:\dev\flutter`，未加入 PATH；D 盘剩余约53GB。

---

## 2026-06-20 · 语音助手「四级全功能接入」(doc107)

用户拍板四级全做：①AI 问答直接答 ②语音全局搜索 ③页面内动作真执行 ④导航全覆盖。

**状态**：改 4 文件（后端 `assistant.service.js`+`assistant-config.service.js`、前端 `voice_assistant_layer.dart`+`search_page.dart`+`router.dart`），**未提交**（待 commit+push）。后端 8000 由本会话裸 `node src/server.js` 跑着（日志 `.voice-verify.log`，非 nodemon，改后端要手动重启）；ollama 11434 down，provider=auto 走 DeepSeek 已端到端验过。

**做了**：新增命令 `search{keyword}`（带词进 `/search?q=` 自动检索，SearchPage 加 initialQuery）、`toggle_linkage{ruleName,enabled}`（按名解析真实规则 id→真调 `/iot/linkage/rules/:id/toggle`，前端 `_resolveLinkageRule` 去标点空白做强匹配+字重叠兜底）；DEFAULT 提示词加规则 8/9/10（直接答/搜索/启停联动）。L4 导航本就到位（`availableRoutes` 走用户提示词）。

**⚠️ 最大坑（务必记住）**：DB `SiteSetting:ai_assistant_config` 里存了一份**陈旧 systemPrompt**（老 FarmLink 版/8 路由/无 features），`loadAssistantConfig` 是「库里有就用库里、否则 DEFAULT」，所以**改 DEFAULT 不生效**！我已把库里 systemPrompt 清空（`=''`）回落 DEFAULT。seeds 不写这个键→全新比赛机本就用 DEFAULT 不受影响；只有本机历史 admin 存值脏。**以后改助手提示词先确认 DB 没存自定义 prompt。**

**验收**：DeepSeek 四级命令映射全对（search/直接答空命令/toggle_linkage 两向/open_page agri）+ IoT toggle 真改状态 round-trip + node --check + analyze。**语音 STT(sherpa=APK only)+覆盖层 UI 下的导航/搜索自动检索/朗读只能 APK 真机验**；前端改动**必须重打 APK**。

---

## 2026-06-19(续3) · 重构语音助手回复逻辑（用户不让再打补丁）(doc105+106)

用户怒：①上次 AI 回答还残留在回复框 ②仍先出一个答案又被第二个替换 ③「不想修这个BUG了，叫你重构」。期间还插了个**功能点请求**（doc105，已做）：朗读时点左下角=打断并切回聆听（`_interruptAndListen`→`TtsService.stop()`）。

**doc106 重构（改 voice_assistant_layer.dart + tts_service.dart，不是补丁）**：
- 根因：`_replyMarkdown` 单字段跨轮持有、一轮内被多次写（模型回复→命令 show_message/create_order 等覆盖→回声二轮），且提交不清空。TTS `speakAndWait` 依赖引擎完成回调，模拟器上不可靠（不触发→等到 15s 超时=麦克风留守识别不到；提前触发→开麦时还在响=回声）。
- **回复装配改一轮一答只写一次**：`_submitRecognized` 提交即清空 `_replyMarkdown`/`_hasReply`（治残留）；命令不再就地写 `_replyMarkdown`，改在返回值带 `reply`；`_executeCommands` 收集 reply 覆盖列表；`_applyAssistantResponse` 先执行命令再决定唯一答案(命令覆盖取最后一条 else 模型 replyMarkdown)、**只 setState 一次**；气泡仅 `_hasReply && 非空` 时显示。
- **TTS 等待重写**：不再 await 完成回调，改按字数预估时长(中文 240ms/字, clamp 900ms~30s)轮询、每 80ms 查 `_seq` 可被打断。等待窗口=朗读时长，治留守(不空等15s)+回声(朗读期间麦克风关)。
- ⚠️ 仍是前端改，**必须重打 APK**。analyze 通过，回声/TTS/识别链路只能设备验。
- ⚠️「第一次(助手没朗读时)就识别不到」若还在=模拟器没把真麦克风喂给 sherpa（开 "Virtual microphone uses host audio input" 或真机），非代码问题。
- 退路（设备仍偶发回声）：朗读后取消自动开麦、改点按再聆听。

---

## 2026-06-19(续) · 「又生成第二个答案」真根因=TTS 回声自激环 (doc104)

用户重打 APK 后报 doc103 的去重**没用**：悬浮语音助手一条指令仍出**两个答案**、「上一个气泡还保留着」。→ doc103 的 command-result 不是主因。结合「TTS 有噪音」+ 模拟器 + `offline_stt_io.dart` 的 `echoCancel:false/noiseSuppress:false`，真根因=**回声自激**：助手朗读完→finally 自动开麦→**麦克风录到自己刚朗读的 TTS**→sherpa 转文字→静音后自动提交→又回答一轮。代码触发点多半是 flutter_tts 在模拟器上「播放完成」回调提前触发，`speakAndWait` 提前返回、在 TTS 仍出声时就开了麦。

**修法(doc104，两道防线，保留连续聆听)**：
1. `tts_service.dart` `speakAndWait`：即使完成回调提前来，也至少阻塞到按字数预估的播放时长(中文~260ms/字)再返回→开麦时 TTS 已静音。只影响 speakAndWait，不影响聊天页 speak。
2. `voice_assistant_layer.dart`：`_muteAutoSubmitUntil`(每轮结束开麦前 900ms 静默窗) + `_looksLikeSpokenEcho`/`_lastSpokenPlain`(识别文本≈刚朗读回复→子串或长度相当且≥80%字命中→判回声)。**两判据只拦 auto 自动提交，人工点「提交」不拦**。

**验收**：analyze 通过；**回声/TTS 链路只能 APK 设备复验**——说一条指令应只回一个答案、只朗读一次、不被自己朗读触发第二轮。
- ⚠️ 若设备仍复现：退路=**取消「朗读后自动重开麦」**，改用户点小球/提交再说下句（彻底断环，代价失连续免提）。
- ⚠️ doc103/104 都是前端改，**必须重打 APK**；后端功能点映射(doc103)是 nodemon 热载已生效。

---

## 2026-06-19 · Claude 修语音助手「接入不完全 / 第二个答案 / TTS 噪音」(doc103)

### 状态：本会话 1 处代码批次，**未提交**（待 commit+push）。后端 8000 由 **nodemon** 跑（PID 38332，改动已热载）；ollama 11434 未起，但语音助手 provider=auto 走 **DeepSeek(deepseek-v4-flash)** 优先，已配置可用。工作树另有**非本会话**的 `backend/uploads/site/auth-hero.jpg`（历史遗留，没动）。

用户报三连：①ai 接入不完全 ②ai 输出后又生成第二个答案 ③tts 生成有噪音。**环境=APK 模拟器**，DeepSeek 已配。澄清后「接入不完全」真意=**功能点接入不完全，很多 App 自带功能助手不认识**。

**根因 + 修法（doc103，改 3 文件）**：
1. **功能点不认识**：doc101 的 `open_page` 只喂模型 **35 个静态页面名**（ROUTE_CATALOG）；但 `app/lib/core/feature_catalog.dart` 有 **69 个功能点**（实时行情/农事日历/补贴申请/村医问诊/交水电费/灾情上报/农机故障/遥感分析…），从没喂给模型。**所有 feature route 都能映射回助手现有 routeKey、前端 `_routePaths` 已支持**，只需喂功能点。→ 后端 `assistant.service.js` 新增 `ROUTE_FEATURES`（routeKey→功能点中文别名数组，含口语别名）、`buildUserPrompt` 的 availableRoutes 每项带 `features`；`assistant-config.service.js` 的 DEFAULT_SYSTEM_PROMPT 加规则7（说功能点名就开所属页面，别回「不支持」）。
2. **第二个答案**：`voice_assistant_layer.dart` 的 `_executeCommands` 执行完任意命令后会回传 `/ai/assistant/command-result` 跑**第二轮 LLM**，其回复**覆盖**第一轮气泡文案。doc102 只把「播报」收敛成一次，但**文案仍被覆盖**=视觉上答两次。导航(open_page)最常见、且本批功能点映射让几乎所有指令都产 open_page，故必须去除。→ **移除** `_executeCommands` 里整段 command-result 回传逻辑（事务命令 create_order/mock_pay 已在 `_executeCommand` 就地写结果文案）；删 `_commandResultDepth`；`_applyAssistantResponse` 去掉只剩默认值的 `speakAfterCommands` 参数。**`/ai/assistant/command-result` 后端端点保留，只是 App 不再调。**
3. **TTS 噪音**：APK **模拟器**音频 HAL 杂音是常见伪影；提交→网络往返→朗读之间录音器早已释放，代码层无录音/播放重叠。**没盲改播放代码**，建议真机复验。

**验证**：farmer/123456 登录 DeepSeek 端到端 5 条功能指令映射全对（实时行情→market、农事日历→agri、交水电费→life、我的订单→orders、农机维修→machinery_service）；node --check + flutter analyze 通过。**第二个答案的去除是纯前端逻辑改，语音整链路只能 APK 真机最终验。**

### ⚠️ 下个 session 注意
- `ROUTE_FEATURES`(后端) 是 `feature_catalog.dart`(前端) 的镜像，前端功能墙增删功能点要同步后端这份。
- 本批没改 STT/TTS 实现、没改路由表/命令白名单。
- 工作树那个 `auth-hero.jpg` 不是我动的，用户自己定要不要提交。

---

## 2026-06-18 · Claude 语音全链路本地离线化 + AI 语音助手 P1 业务闭环

### 状态：origin/main 在 `f29fdd49`(已 push)。本会话 5 commit:`53bb3bc9`(97 TTS)+`7c42c5a9`(98 STT)+`a8f79c8d`(交接簿)+`f29fdd49`(99 助手P1)。工作树仍有**非本会话**改动未提交:`backend/uploads/site/auth-hero.jpg`(图变大,不是我动的)。**会话末重启过 `npm run dev` 栈**(为 prisma generate 停过、已重启,后端:8000/admin vite 在跑;web :5000 serve_web 独立进程全程没动)。web build 产物新(release)。

### 续:AI 语音助手 P1 业务闭环(doc99,commit `f29fdd49`)
用户追问「AI 语音助手呢?不是没写完吗?」——指 doc92 的 P1 没做(进度总览一直挂🔄)。核实后真实缺口:订单页占位、无 shippingAddress、订单确认没读地址、无手链/玩偶商品、后端 create_order 硬要 receiverInfo。做了:User 加 shippingAddress(手写迁移+migrate deploy+generate)、资料编辑页加收货地址、新建「我的订单」页 `/market/orders`+集市顶栏入口、语音助手 show_order_confirm 读资料地址/空引导 + create_order 用资料 receiverInfo 兜底、后端放宽 create_order 必填 + 提示词改「App自动填地址」、seed 手链/玩偶。**后端订单模型+API(下单/列表/状态机/物流)P0 后早已完整**,P1 主要是地址+订单页+接线。
- **验证**:后端端到端(地址中文 round-trip 200、手链/玩偶 id70/71 在列表、order/list 200)+ **浏览器实测**(注入 farmer token:订单页渲染真实订单「李大姐阳光番茄 ￥64 已支付」、编辑页收货地址回显「四川…青禾村3组18号」)+ analyze + web build。**语音整链(说话→确认→下单→支付→播报)只能 APK 真机**(STT 是 sherpa/APK only + 要麦克风)。
- ⚠️ 没 reseed(避免清用户测试数据);手链/玩偶用幂等脚本补进活库。重置环境 `npm run seed` 会带上。

### 语音本地化(97/98)经过

用户「继续完善 ai 语音」。开工发现工作树里有**一截没收尾的在途迁移**(非我所建):TTS 已改 flutter_tts(代码完整未提交)、STT 加了 sherpa_onnx 等依赖但 lib 里**一行没写**、`_asrdl/model.tar.bz2`(487MB)是用户下的 sherpa 流式 zipformer 中英双语模型。方向=**语音全链路本地离线化**(甩后端 Kokoro + 浏览器云识别)。用户拍板:**先收尾 TTS 再做 STT**;web 语音留 speech_to_text 当临时测试不投入;模型打进 APK assets。

**doc97(commit `53bb3bc9`)TTS 回设备本地 flutter_tts**:tts_service 重写走系统原生引擎(Android TextToSpeech/web SpeechSynthesis),即时出声、离线、不依赖后端,治 Kokoro CPU RTF≈3「一句一卡」;入口加 `_plainText` 清 Markdown(不念 `**`/`#`/竖线);**API 保持 speak/stop/speakingId 不变**调用方零改;Manifest 补 TTS_SERVICE 可见性;backend dev 脚本去掉自动起 tts sidecar(/ai/tts 端点保留但 App 不再调)。**这等于把 06-15 那条「Kokoro 替换 flutter_tts」又反转回来了**——因为 Kokoro 本机 CPU 长回答确实慢。

**doc98(commit `7c42c5a9`)STT 换 sherpa-onnx 离线**:新增 `core/offline_stt.dart` 门面——**条件导出** `export 'offline_stt_io.dart' if (dart.library.js_interop) 'offline_stt_stub.dart'`,把 sherpa 的 **dart:ffi 挡在 web 编译外**(关键,否则 web build 炸);io 真实现=initBindings+首启拷模型到应用支持目录+OnlineRecognizer(zipformer/endpoint)+record 取 16k 单声道 PCM16 流转 Float32 喂 acceptWaveform+decode/getResult 实时出字+isEndpoint 静音断句自动提交;stub=web 恒不可用回落 speech_to_text。voice_input + voice_assistant_layer 按 `kIsWeb` 分流。

### ⚠️ 坑/要点(下个 session 必看)
1. **用户首份模型 tar 截断损坏**(`bzip2 -t` 报 file ends unexpectedly,int8 encoder 是归档末位被切)。我从官方 release 重下 `_asrdl/model_full.tar.bz2`(511,274,346B,校验过)。**列目录 `head` 会提前关流不暴露截断,务必 `bzip2 -t` 或比对 Content-Length。**
2. **int8 encoder 173MB > GitHub 单文件 100MB 硬上限**,没法 push。照 Kokoro `tts/*.onnx` precedent:`app/assets/models/asr/*.onnx` **gitignore**(只提交 tokens.txt 56KB);`_asrdl/`、`docs.zip` 也 gitignore。pubspec 声明的是**目录** `assets/models/asr/`(缺 onnx 也能 build,运行时 ASR 优雅不可用)。
3. **build APK 前必须先解压模型**到 `app/assets/models/asr/`(命令见 doc98 七),否则 ASR 无模型;APK 体积会 +~190MB(模型)+四 ABI 原生 .so,**建议 `--target-platform android-arm64` 或 `--split-per-abi`** 砍体积。
4. **sherpa 走 ffi=APK only**,web 用不了真识别(已分流,web 留 speech_to_text)。**真识别/真朗读都只能 APK 真机验**——本会话只做到 analyze 干净 + web build 通过(证不破坏 web),麦克风/ffi 无头测不了。
5. **reference 记忆 `reference-tts-kokoro-*` 现已不是 App 的 TTS 路径**(App 改 flutter_tts 了);Kokoro sidecar 代码/端点还在仓库但 App 不调。别再按那条给 App 推 Kokoro。

### 下一步(主要靠 APK 真机)
1. 解压模型 → `--target-platform android-arm64` 打 APK → 真机验:mic 弹层离线识别、语音助手聆听→静音自动断句提交、AI 回答 flutter_tts 朗读。
2. 端点手感(rule2 1.2s 静音断句)真机调;嫌断太急调大 `rule2MinTrailingSilence`。
3. `backend/uploads/site/auth-hero.jpg` 那个改动不是我的,用户自己定要不要提交。

---

## 2026-06-15 (续) · 本地 Kokoro 中文 TTS(离线)替换 flutter_tts

### 状态：origin/main 在 `da7f466c`(已 push)。新增本地 TTS sidecar 跑在 **127.0.0.1:11435**(我本会话起的,health ok);后端 8000 已重启(PID 变)加载了 /ai/tts;web 5000 release 含本批;ollama 11434 仍 down(本批没用到)。

用户问「能不能部署一个本地 TTS」。选型(用户拍板):**引擎 Kokoro**(音质),**范围 web 先全链路跑通**。

**架构(仿 ollama 本地常驻服务)**:`tts/tts_server.py` Python sidecar(kokoro-onnx,onnxruntime CPU,**不拖 torch**)常驻加载模型 → 后端 `/api/v1/ai/tts` 代理返 audio/wav → App `tts_service.dart` 用 audioplayers 播 WAV。web+APK 用同一把离线中文嗓子,替掉旧 flutter_tts(借浏览器/系统的嘴,音色不一)。

**关键坑(已解)**:kokoro-onnx 默认 G2P 走 phonemizer+espeak,**espeak 不支持中文**(报 `language "zh" is not supported`)。正解:用官方 `misaki[zh]` 生成拼音音素,再 `k.create(phonemes, is_phonemes=True)` 喂模型(Kokoro 中文就是这套音素训练的)。默认女声 `zf_xiaobei`,24kHz,CPU 实时率 ~0.25。

**改动**:后端 config.tts + tts.service.js + ai.controller(tts/ttsStatus) + ai.routes(/ai/tts,/ai/tts/status) + apiControl 单独 tts 限流桶 300/h(不挤 AI 20/h)。App ApiClient.postBytes(二进制响应) + tts_service 重写(同样静态 API,ai_chat 调用处不变) + audioplayers ^6.1.0。

**验证**:浏览器源(5000)→/ai/tts(跨域 8000) 200 audio/wav,`<audio>` readyState4 可解码播放;后端 Node/curl 端到端 RIFF wav 非静音。⚠️ 我用 `audio.play()` 验证时**声音真从音箱放出来吓到用户了**——以后浏览器验证 TTS 别触发 play(),只验 readyState/duration。

### 启动顺序(重要)
ollama(如需问答)→ **tts sidecar(`cd tts; .\start.ps1`,等 `[tts] ready`)** → 后端(8000)→ web(5000)。
后端不强依赖 sidecar:离线时 /ai/tts 返错,App 静默降级不崩。sidecar setup/音色见 `tts/README.md`。venv/模型(311MB onnx+27MB voices)gitignore,离线机拷整个 tts/ 或重跑 setup(联网一次)。

### TTS 后续 / APK 结论(已厘清)
1. **APK 不需要塞模型、不需要 sherpa-onnx**。本 App 架构=「手机/web 都是本地后端的瘦客户端」(登录/集市/AI 全靠连本地后端 8000)。所谓离线=不连公网,但手机与后端在**同一局域网**互通。所以 **TTS 的 Kokoro 留后端即可,APK 同样调 /ai/tts**——本次的 TtsService+audioplayers(安卓原生支持)APK 已能用,只需打包时 `--dart-define=FARMLINK_API_BASE_URL=http://<笔记本局域网IP>:8000` + 手机连同 WiFi(与其它所有功能前提一致)。后端 `app.listen(PORT)` 默认绑 0.0.0.0,手机连得上(首连不上多半 Windows 防火墙挡入站 8000,放行 Node)。
   - 已用 `scripts/build-apk.ps1 -ApiBaseUrl http://10.178.46.24:8000 -Mode debug` 出 debug APK(产物 `dist/FarmLink.apk`,gitignore)。用户会自行改成正确局域网 IP 重打。
   - 仅当要做「真·无后端单机 App」(手机不连任何笔记本)才需端上 sherpa-onnx + 模型进 APK——那是动全 App 的大改,非当前需求。
2. 适老点读真机/浏览器走一遍 UI(本批因 ollama down 无新 AI 回答 bubble,只在 HTTP+audio 层验证了链路,Dart→audioplayers 那段靠 analyze + 同源 Audio 可播推断)。
3. 音色/语速可调(config.tts.voice / TTS_VOICE 环境变量;server 支持 speed 参数)。

---

## 2026-06-15 · Claude+Codex 并行赶工:广告模态卡顿 + 登录页 Pixel2 布局 + #18-21 收尾 + git 规范

### 状态：origin/main 同步在 `2aa50f12`(已 push)。后端 8000/web 5000(release 重编含本批,06-15 夜)在跑;ollama 11434 **down**(本轮未用到);admin 5173 未起。工作树干净。

赛前赶工。用户要「和 codex 一起开 subagent 超速赶工」,本轮 **3 轨并行**(我主线程 + 1 Claude worktree agent + 1 Codex):

**轨②(我, 主线程)当前批 bug/打磨**:
- **广告页模态框卡顿**(用户:广告页模态卡、登录页不卡)。根因=协议弹窗遮罩半透明(`barrierColor black0.62`)+CRT 动画每帧重绘,广告页背后是**全屏 `Image.network` 大图未隔离层**→每帧透遮罩重采样大图(web/CanvasKit 尤贵);登录页背景简单故不卡。修法:`startup_ad_page.dart` 把背景 Image+渐变包 `RepaintBoundary` 合成缓存层(commit `28b20ed0`)。零视觉变化,浏览器验弹窗渲染无回归。
- **登录页 Pixel2(411×731) 一屏装不下**(用户报)。`login_page.dart` 46% 大 hero 仅 ~820+ 高屏放得下表单,731 一类中等机型底部「注册账号」按钮被挤出需滚。修法:`compact` 阈值 `680→820`,该 band 改 34% 矮 hero(commit `2aa50f12`)。411×731 浏览器实测:注册按钮完整可见+底部留余量,一屏装下。
- login/forgot/ai_chat/machinery 做了异步&释放类 bug 扫描,mounted/dispose/controller 均到位,无硬 bug。
- 另:`28b20ed0` 含当前批 WIP 检查点(忘记密码/登录/AI聊天/农机改造 + serve_web.mjs 路径穿越加固),analyze 干净。

**轨③(Claude worktree agent, 已合 `704da7b2`)#18-21 关闭前收尾**:四 issue 接线代码级全核验到位(file:行号见 git log),建议可关;两小修:`iot_page.dart` FarmAppBar 传 `title:'智能物联'`(组件本就支持 title 形参)、`elder_mode_page.dart` 三功能 icon 圈改实心深绿底+白 icon(原浅绿0.16偏淡)。

**轨①(Codex gpt-5.5)#16 操作型弹层迁独立页 轨B**:Codex 核验后发现 `data_service`(_openStatForm/_openSyncLogs)、`publish`(_openComposer)**早已迁成 `Navigator.push` 独立页**,残留 `_sheet` helper 不存在 → **本任务实为已完成,进度总览未同步**。Codex 诚实返回 no-op,worktree 无改动已清理。(data_service:165 的 sheet 是 `_yearPicker` 轻量选择器,按工单保留;publish:610 是确认框,保留。)

### 另:git 上传规范(commit `e5995892`)
删根目录无用验证截图;`.gitignore` 加策略:根 `*.png`/PPT(市赛PPT、市赛路演-全新)/原型素材(design_assets、icons_svg)/工具链产物(.agents/.cdp/.claude/.playwright-mcp/outputs)/`app/assets/images.zip` 不上传;`promo-video/.thumbnails`(误传的生成缩略图)`git rm --cached` 取消跟踪(本地保留)。
> 旁注:用户要画 XD 原型,把 App 实际用的 242 个 Material 图标 SVG 下到了 `icons_svg/`(gitignored),`icons_svg/iot/` 是物联页专用 16 个。

### 仍需后续(主要靠真机/APK)
1. 用户拍板关 #18/#19/#20/#21(代码侧均到位+大部分浏览器验)。
2. #22 兑换积分 BUG:web 不复现,待 APK 复测(本轮用户未选,未动)。
3. #18 STT 真识别 / #20 TTS 真朗读 / iot 标题与适老 icon 肉眼 —— 无头测不全,需 APK 或在线环境。
4. 广告模态「流畅度」是性能特性,截图只能证渲染无回归;真机滑动手感建议 demo 前在目标机过一眼。

---

## 2026-06-13 · Claude 并行 3 轨清 open issue #18/#19/#20/#21(2 worktree agent + 主线程)

### 状态：本地/origin/main 同步在 `b456ac72`(已 push)。后端 8000(`node src/server.js`,日志 `backend/.backend-out.log`)/web 5000(release,build/web 重编于 05:04 含本批)/ollama 11434(在线但模型冷,未预热)在跑。admin 5173 未起。工作树仅原有未跟踪临时文件,没动。

用户「继续写,加快,多开子代理,前后端没弄全」。**先查实**:后端 10 模块 50 路由零 TODO/桩、app 占位极少——代码其实很成熟,用户实感「没弄好」=未真机验 + 几个 open issue。读 5 个 open issue,#21/#19 是 06-12(昨天)二次反馈。逐条定位真缺口后开 **3 轨并行**(2 个 worktree agent + 我):

**轨A(worktree agent, 已合 `22f9eb52`)#18 真语音 + #20 适老模式 + AI回答TTS**:
- #18 发现**「语音输入」是假的**——`ai_chat_page.dart` 旧代码是 `enabled:false`+「准备中」占位 ListTile,publish/search 的语音是方言mock调 `/ai/voice/recognize` 返套话 + 用了**脉冲光 `_VoicePulseIcon`**(违反「禁脉冲光」)。新建 `core/voice_input.dart`(`VoiceInput.listen`,真 `speech_to_text ^7.4.0`,不可用优雅降级)替换 ai_chat/publish 占位;**主线程顺手把 search_page 的 mock+脉冲也清了**(commit `b456ac72`)。
- #20 旧只是设置里内联开关。新建 `core/tts_service.dart`(`flutter_tts ^4.2.5`,zh-CN 慢速) + `pages/profile/settings/elder_mode_page.dart`(介绍页:Hero+三功能+底部启用开关);settings_home 内联开关改为行项→push 介绍页;适老模式开启时 AI 文本回答气泡可点朗读(再点停)+「点按朗读」提示。主线程在 router.dart 注册 `/profile/settings/elder→ElderModePage`。
- ⚠️ **web 语音 STT 依赖浏览器 Web Speech API(多数走云端,离线/无网 initialize 返 false 走降级提示,不崩)**——Playwright 无头测不到真识别是预期,真识别要 APK/在线。TTS(flutter_tts)web 走浏览器 SpeechSynthesis 离线可用。原生麦克风权限(Android RECORD_AUDIO 等)agent 没补 manifest,上 APK 要补。

**轨B(worktree agent, 已合 `97e59acf`)#19 IoT 联动可发现性**:用户「我没找到在哪里」根因=联动埋三层(首页→数据看板→物联网→下滚)。agri 页加「智能物联·设备联动」入口卡(仿 `_photoFlowEntry`)直达 `/iot`;iot_page 顶部加「设备联动」快捷跳转锚点卡(`Scrollable.ensureVisible`);feature_catalog 补「智能物联」「设备联动」两条(route `/iot`,全局搜索/全部服务/板块chip 可搜)。home 没合适位没硬塞。

**轨C(主线程)#21 二次反馈**:用户 06-12 评论抱怨「顶部搜索框分层 / 底栏无指示 / 二级页该去底栏」。**浏览器实测发现这些早被 `be5988eb` 修了**——评论是修复前发的。现状(release 真机截图验):搜索页=单一利落搜索框无分层、**无底栏**(二级页 idx=-1 不显示);首页底栏「首页」**明确高亮**(绿+容器底+加粗)、消息带未读角标。#21 视为已解决,待用户拍板关。

### 已浏览器真机验(farmer token 注入 + 清SW/缓存 + about:blank 硬重载,新 bundle 3.93MB 05:04)
- #20 适老介绍页 ✓(深绿 Hero+放大字号/朗读AI回答/更大点击区 三卡+启用开关+诚实说明,0 错)
- #20 设置页适老行 ✓(行项「未开启」+箭头,副标题含「朗读 AI 回答」)
- #19 iot 页「设备联动」快捷卡 ✓(进 /iot 即见「1条规则已触发,点击查看联动详情」)
- #21 搜索页/首页底栏 ✓(见上)
- #18 语音/适老TTS:代码接线全确认(准备中已消失、VoiceInput/TtsService 已接、analyze 干净、web 编译过),但**音频/麦克风交互无头测不了**——诚实结论:实现完成且编译通过,真识别/朗读需 APK 或在线环境实跑。

### 坑/备注
- iot 页顶栏标题还是泛用「田园通」(非「智能物联」),pre-existing 小不一致,本批没改,可后续给 FarmAppBar 传 title。
- 2 个 worktree(.claude/worktrees/agent-*)被 agent 进程锁着没删成,留 harness 自动清,分支已合并进 main。
- 适老介绍页三功能 icon 显示为浅绿空圈(浅绿底上浅绿icon 偏淡),极小视觉,未改。

### 下一步建议
1. 用户拍板关 #18/#19/#20/#21(都已处理+大部分浏览器验);#22 兑换积分 web 早证不复现,待 APK 复测。
2. 真机/APK 跑一遍语音输入(STT)与适老 TTS 朗读(无头测不到的就这两条)。
3. demo 前老规矩:预热 ollama(冷载 ~160s)、确认 E: 在位、release 包、canvaskit 自托管(LOCAL)。

---

## 2026-06-11 · Claude 复验 0611 早间三连改 + 补提交品牌 Logo + 恢复大模型链路

### 状态：本地/origin/main 同步在 `d7bbe655`。工作树仅原有未跟踪临时文件（disaster*.png/home.png/probe1.png/outputs/市赛PPT 等，非本会话产物，没动）。后端 8000(已由我重启,日志 `backend/.backend-out.log`) / web 5000(release) / admin 5173 / **ollama 11434 已起**。

用户「继续优化项目」。交接簿之后还有一批 0611 早间会话的 commit（引导页登录态 f5c1c6a3、黛青次色 c889c612、关于页品牌名片 26cca231、去无据宣称 d23b5938、kAppVersion 1.8.0 d451f776）——全部"playwright 断连未实测"。本会话逐项补验 + 收尾：

**1) 补提交品牌 Logo（commit `d7bbe655`，已 push）**：`backend/uploads/site/farmlink-mark.png` 工作树里是 62KB 高清绿拖拉机品牌标（关于页品牌名片那批经管理台上传落盘），但仓库里还是 1.6KB 小芽占位图——漏提交，比赛机拉库会拿旧图。已提交。

**2) 浏览器复验全过（farmer token 注入 + SW/CacheStorage/CDP HTTP 缓存全清，release bundle 3.9MB 含 0611 全部 commit）**：
- **引导页登录态逻辑 ✓**：未登录冷启动确定性出引导页（AI 智慧种田/下一步/跳过，渲染在 /splash 路由内）；注入登录态后冷启动直进 /#/home 不出引导。
- **关于页品牌名片 ✓**：深绿面板+田垄纹理、白方块里新拖拉机 Logo（SiteImage 走后端加载成功）、v1.8.0 徽章、无"稳定版/云端服务运行中"、品牌主张黛青条、8/76/24 数据条、页脚 Logo 回声，0 控制台错误。
- **黛青次色/首页 ✓**：首页正常，黄色预警卡琥珀金底（灾害预警按等级配色——docs/65 观察项3 已在早间会话修掉，`_alertColor` 红/橙/黄/蓝映射）。docs/65 观察项4（管理台识别记录 404）也已修（seed `imageUrl:''`）。

**3) 大模型链路恢复**：发现 ollama 没起、后端走知识库兜底。起 ollama(0.30.0)→杀旧后端(pid 19052)→重起 `node src/server.js`（`✓ Ollama 在线`）→真实 /ai/chat 验证 `modelUsed: qwen2.5:3b-instruct-q4_K_M` 秒回。**问答主模型已是 3b**（docs/65 的 8G 缓解方案已被采纳）。

### ⚠️ 本会话重要实测发现：3b 也救不了双模型常驻
docs/65 假设"3b(~2G)+minicpm-v(4.9G)=6.9G<8G 可双驻"——**实测不成立**：3b 实际加载 2.4G（含 KV cache），warm 谁 `/api/ps` 就只剩谁，互踢依旧。但缓解了一半：文件页进 RAM 后重载只要 **~47s**（非 E: 冷加载 160s）。**demo 指导**：开演前把要用的模型预热（`keep_alive:"60m"`），文字问答↔识图切换仍有 ~47-60s 等待，脚本里别来回切；首次冷加载仍是 ~160s。

### ⚠️ 环境坑（新踩）
- bash 里 curl 直接 `-d '中文'` 会乱码进后端（question 变 `ˮ����`），要 `printf > file` + `--data-binary @file`；读响应也要落盘后 `encoding='utf-8'` 读，控制台 print 中文乱码只是显示问题。
- 我重启的后端是裸 `node src/server.js`（非 nodemon），改后端要手动重启；stdout/err 在 `backend/.backend-out.log` / `.backend-err.log`（已 gitignore）。

### 下一步建议
1. open issue #18-#22 都已处理完且验证过，等用户拍板关闭。
2. demo 前：预热要用的模型、确认 E: 在位、canvaskit 走 LOCAL、release 包。
3. 0611 早间会话没写交接簿条目——若那批还有未验改动（除本会话已验 5 个 commit 外）由用户提。

---

## 2026-06-10 · Claude 收尾 doc76 配图批 + 清 GitHub issue（release 真机逐页验证）

### 状态：本地/origin/main 同步在 `29c8f408`，工作树仅未跟踪临时文件（`.playwright-mcp/`、`design_assets/`、若干 *.png demo 截图、`市赛PPT/`、`outputs/`，均非本会话产物）。后端 8000 / web 5000(release) / admin 5173 / ollama 全程在跑。

用户「继续写项目，你和 Codex 一起，可开 subagent」。开工发现 doc76 配图批在飞（Codex 早上做好未提交），核实+真机验证后提交，再清 GitHub open issue。本会话未派 Codex/subagent——可并行的活要么已做完(doc76)、要么是 1 行改(#21)、要么是非 bug(#22)，拆活开销大于收益。

**1) doc76 前端业务配图重生成与接入（commit `e6b1f1ba`）**：19 张专业农业摄影配图(`app/assets/images/generated/`)替换旧 `_x_x.jpg` 占位图，接入引导页/首页横幅/登录注册/设置/政策/农机/生活/集市；pubspec 收窄资产清单(只打包 generated/ + 正式Logo + ai_1.jpg 测试样本)；market/policy/machinery/life/商品详情支持服务端 `/uploads` 相对图(走 `ApiClient.resolveImageUrl`)；seeds 商品图同步切 SKU 图。**核实**：源码 lib/ + seeds 无残留旧图引用(只 .dart_tool 陈旧 bundle 里有)，build 产物 19 图全打包、旧图全不打包。**release 真机逐页验**(farmer token 注入+CDP 清缓存)：首页/集市(商品图语义全对)/农机(农田航拍地图底图)/政策/登录(auth-hero 暖光摄影招牌页) 5 页配图全部正常加载、0 控制台错误。集市 SKU 映射在更早 `389b412c`(doc66) 已提交。

**2) #21 首页搜索框用不了（commit `29c8f408`，已修验证）**：根因=`home_page.dart` 搜索框 onTap 是占位 `toast('全局搜索即将上线')`，但 `/search` 全局搜索页+`/search` API 早做好了。改成 `context.push('/search')`。**release 真机验**：点首页搜索框正确进全局搜索页(关键词框+语音mic+热门搜索 补贴/行情/病虫害/农机/天气)，不再弹占位。

**3) #22 兑换积分 BUG（结论：已被迁移顺手修掉，建议用户再测后关）**：报告「兑换时无论成功与否都跳首页」。**关键时间线**：issue 建于 06-09 **14:47**(北京)，而积分兑换 sheet→独立页迁移 `f5edbfa5` 在 06-09 **15:27**(晚 40min)。报 issue 时兑换还是 `showModalBottomSheet`(旧 sheet 的兑换 onTap 多半用 shell context 的 `Navigator.pop` 把 GoRoute `/policy/service` 弹掉→回落 `/home`=跳首页)。**当前代码**用 `Navigator.of(ctx,rootNavigator:true).push` 独立页、pop 正确。**release 真机验两条路径**(临时给 farmer 加分到 500 测成功、65 分测失败，验后已还原 65)：成功兑换(积分 500→400、排名刷新、URL 留 `/policy/service`)、失败(400 提示)，**都不跳首页**。⚠️ web 已证不复现；APK 未测但结构正确(rootNavigator.push 的 route 自己 pop)。

### 其它 open issue 落地核查 + 续作（用户第二次「继续」后）
- **#20 适老模式**：已落地且 **release 真机验过**——设置页开关打开后全局字号放大 1.3×(main.dart textScaler clamp)、布局自适应不溢出。方言入口/语音也在(`e734e4f3`)。建议可关。
- **#18 输入框语音输入**：已落地(ai_chat/publish/search/common)，全局搜索页就有 mic。建议可关。
- **#19 物联网设备联动（commit `2cb4ea98`，本会话新建特性，doc77）**：原 `/iot` 只有设备监测，缺「联动」。新建**设备联动**：后端 iot 模块加 5 条联动规则(墒情→滴灌/虫情→植保预警/棚温→通风/低温→保温/水位→排涝)+`GET /iot/linkage/rules`+`/logs`+`POST .../toggle`，实时读数判触发态，启用态内存 Map(重启回默认)，阈值留余量保证 demo 稳定(1触发+3待命+1停用)；前端 iot_page 设备监测下方加「设备联动」区(规则卡:状态徽章/触发条件/当前值/⚡动作/启用 Switch)+「联动记录」倒序表。**release 真机验过**：联动区/5规则卡/记录全渲染，API 停用虫情后重载→区头「3条已启用」/虫情「已停用」/记录按启用态过滤端到端联动正确。⚠️ canvas 上直接点 Switch 受 Playwright 命中精度限制没逐一点到(写端 curl 验过、onChanged 已接线、读端 toggle 后渲染已证)。⚠️ `Switch` 用 `activeColor`(开发机 3.32.1 无 `activeThumbColor`，3.44 仅 deprecated)。
- **#21 已修可关；#22 建议真机再测后关。**

### 续作（用户连续「继续」+ 配图/引导反馈）

**4) 站点配图后端实时化 + 管理台配图管理（commit `f5cc2894`，doc78）**：用户要「所有图片资产可从后端实时更新」+「管理台要有改图入口」。
- 前端 `core/site_images.dart` 新增 `SiteImage` 组件（后端 `/uploads/site/<名>` 网络优先 + `Image.asset` bundled 兜底），13 处 `Image.asset` 全替换；bundled 资产保留作离线兜底。
- 后端 `platform/site.controller.js`：`GET /site/images` 清单 + `POST /site/images/:key`（管理员 multipart 上传替换，覆盖 `uploads/site/<key>`）。站点图入库 `backend/uploads/site/`(20张)随仓库发布（`.gitignore` 加 `!uploads/site/` 例外）。
- 管理台新增「站点配图」页（`SiteImagePage.jsx`，系统治理菜单，PictureOutlined）：网格预览+上传替换+时间戳破缓存。
- **实测**：admin 上传接口 200 且磁盘文件实际覆盖；release 浏览器换后端图后仅重载页面登录 hero 实时变新图（App 未重编）。
- ⚠️ **顺带修真问题**：web build 默认从 gstatic CDN 拉 canvaskit/字体，**离线环境白屏**；改用 `flutter build web --no-web-resources-cdn` 自托管 canvaskit（已同步 `start-local.ps1`）。字体仍可能联网拉 Google Fonts，离线回落系统字体。**本机本会话后期 gstatic 不可达过**，清浏览器缓存会连带清掉 canvaskit 导致白屏——若遇白屏先确认 canvaskit 走 LOCAL。

**5) 引导页首启不显示/随机（commit 见下，改 `splash_page.dart`）**：用户反馈"第一次打开 APP 不显示引导页、有时随机不显示"。排查：`onboarding_seen` 是**一次性持久标记**（看过永久为真，APK 升级/之前打开过都保留），代码层面首启必显示但该标记一旦置真就再不显示→表现为"首启不显示/随机"。修法：splash 判据由 `onboardingSeen` 改为 **`isLoggedIn`**——未登录冷启动一定显示引导、已登录直接进首页，确定性消除随机。⚠️ 没能浏览器实测（playwright 本会话后期断连），逻辑改动 + analyze 通过；待用户设备或 playwright 恢复后验。

### ⚠️ 环境坑（本会话踩的，下次注意）
- **服务会挂**：本会话后端 8000 + web 5000 中途双双挂掉（000），重启用 `node src/server.js`（backend）+ `python -m http.server 5000 --directory build/web`（app）。注意手动起的 node 非 nodemon，改后端要手动重启。
- **playwright MCP 会断连**：断了就没法浏览器实测，靠 analyze + curl + 逻辑。
- **gstatic 不可达 + 清缓存 = 白屏**：见上 #4。

### 下一步建议
1. 用户拍板 #18/#19/#20/#21/#22 哪些可关（#21 已修、#22 已验不复现、#19 已做）。
2. 引导页/配图改动待真机或 playwright 恢复后浏览器复验。
3. demo 前老规矩：预热 ollama 两个模型(冷加载 E: 盘 ~160s)、确认 E: 在位、release 包跑、确认 canvaskit 自托管(LOCAL)。

---

## 2026-06-07（深夜·自主）· Claude+Codex 并行：通宵 QA 扫描 + KB 广度扩充（用户睡前交代，明早 review）

### 状态：本地/origin/main 同步在 `bd8f36be` 之后（本条目对应的 docs commit 再 +1）。后端/ollama/web(5000 release) 全程在跑。工作树仅未跟踪 `.playwright-mcp/` `design_assets/`（QA 截图已清）。

用户睡前要求「继续派任务，你和 Codex 一起做，明早再 review」。分工零文件重叠：

**Codex（commit `bd8f36be`）KB 广度扩充 26 条**：`backend/seeds/index.js` 加茶叶4/猕猴桃3/梨3/茄子3/菜豆3/西瓜3/生姜2/大蒜葱3/莲藕2，覆盖**蒲江本地特产**（茶、猕猴桃）+ 常见菜果。`diseaseKnowledge` 总数 54→**94**。Codex 用自己 subagent 拆活、自验 seed+query、自己 commit+push。Claude 复核 DB：总数 94，茶炭疽病/西瓜枯萎病等新条目在。

**Claude · release 浏览器全流程 QA（docs/65-通宵QA报告.md）**：Playwright 真机走查全部核心页（home/ai文字问答/识图/data/agri/machinery/market/policy/life/disaster/publish/messages/profile/all + 5 tab）。**结论：app 很稳，无需改代码的客观 bug，无控制台报错**。
- ✅ AI 文字问答 release 确认：流式逐字 + **markdown 干净无 `**`/`***`**（#17.2/#17.3 再确认）。
- ✅ AI 识图两分支 release 确认：真识别（苹果黑星病95% VERIFIED+反馈+建档CTA）/ 截图→诚实「未能识别」卡（植物前置门生效）。
- ⚠️ **3 个观察项没擅改**（主观/数据，等用户拍板，详见 docs/65）：
  1. **运维（重要）**：qwen2.5:7b 文本模型也从 E: 冷加载 ~160s（首问流式光标转 ~80s 才出字）。demo 前两个模型都要预热。
  2. 集市 `/market` 商品图疑似种子占位复用：「张大叔…柑橘」等显示农户肖像不是产品图。
  3. 灾害 `/disaster` 预警卡【橙】【黄】【蓝】都红底，没按等级配色。

### 第2轮（同夜继续）：管理台 QA + Codex 农事日历
- **Codex（`97ddfb30`）补农事日历**：茶叶6 + 猕猴桃6 条 farmCalendar（→48 条），文字问答 RAG 现可答蒲江本地作物时令问题。
- **Claude 管理台 QA（:5173 vite dev）**：登录 admin → `/admin/ai-ops` AI 运维中心**完整正确渲染**（6 统计卡/模型配置含暖机tag/已识别模型/最近问答3/最近识别4/AI开关12）。暖机 tag 逻辑没 bug（按 /api/ps 存在判断）。新发现见下。
- **观察 4**：管理台「最近识别记录」4 张图 404——种子 `aiDetectRecord` 引用了不存在的 `/uploads/demo/*.jpg`，走「无图」兜底。修法：seed 里这些记录 imageUrl 置 null，或放占位图到 `backend/uploads/demo/`。

### ⚠️⚠️ 本夜最重要 demo 发现：8G 显存一次只能热一个模型
qwen2.5:7b(4.7G)+minicpm-v(4.9G)=9.6G>8G，**装不下两个**。`/api/ps` 实测验证：测完文字问答后 minicpm-v 被驱逐、空闲后全空。**demo 时文字问答↔拍照识图来回切，每次都驱逐+从 E: 冷加载 ~160s**，比单纯冷启动更坑。
- 缓解（**需你拍板，没擅改**）：①**问答主模型 7b→qwen2.5:3b(~2G)**，则 3b+minicpm 6.9G<8G 两个可常驻、切换不再冷加载（代价 3b 答题略逊），改 `config.ollama.primaryModel`；②demo 脚本先文字后识图、不来回切、每段前预热；③确认比赛机显存（≥12G 则无此问题）。详见 docs/65。

### 给用户的 review 清单（明早）
1. **docs/65** 的 4 个观察项 + 8G 单模型缓解方案拍板（尤其要不要把问答模型换 3b 让两模型常驻）。
2. 集市商品图占位 / 灾害预警卡配色 / 管理台 demo 图 404 —— 这 3 个都是数据/视觉，要不要改你定。
3. **issue #16/#17 可以关了**：#16 动画=debug 产物、卡片迁移4批完；#17 识图（真识别+诚实兜底+植物门+反馈+监控）、markdown、流式、数据全部 release 实测过。建议你 close。
4. 本夜共 **6 commit**（Claude 4 + Codex 2）全在 origin/main，可拉到比赛机复验。服务都还跑着（后端8000/ollama/web5000/admin5173）。

---

## 2026-06-07（下午）· Claude+Codex 并行：补 KB + 识图 release 真机实测 + 截图幻觉发现

### 状态：本地/origin/main 同步在 `5bc20932`。本会话 2 个 commit 全 push。工作树仅剩未跟踪 `.playwright-mcp/` `design_assets/` `.runtime/`。后端/ollama/web(5000 release) 全程在跑（demo 可直接用）。

分工：Codex 补病害 KB（后台自跑+自验），Claude 起全栈做 release 浏览器真机实测。两轨零文件重叠。

**Codex（commit `aef5b598`）补病害 KB 14 条**：`backend/seeds/index.js` 加苹果黑星/白粉/褐斑、香蕉黑斑/炭疽/叶斑、番茄灰霉/叶霉、黄瓜炭疽/细菌性角斑、草莓灰霉/白粉、马铃薯晚疫/早疫，全是 minicpm-v 实测会吐但旧库没有的中文病名。`resolveDiseaseLabel` 精确匹配 `diseaseName`/`modelLabel`，补后命中。

**Claude commit `5bc20932`**：首页搜索栏上移到天气问候卡之前（用户原有未提交改动，release 浏览器验过）。

### ✅ issue #17.1 识图 release 真机实测全过（farmer 账号，真 minicpm-v:8b 视觉）
- **苹果黑星病图**（PlantVillage 真病害样本）→ `苹果黑星病` recognized=true、conf **0.85（API）/95%（浏览器卡）**、`knownDisease.modelLabel=apple_scab id=363`（**正是今天新补的 KB 条目，旧库这里必是 null**）。浏览器卡片：`VERIFIED` 徽章 + 反馈三按钮「准/不准/?不确定」+ knownDisease 命中才出的「生成定制化施药建议」CTA + 用户气泡缩略图 + 删除按钮，全部正常。
- **反馈按钮**：点「准」→ `POST /ai/detect-feedback` 200，按钮变绿选中态；后端 `/ai/status` 的 `detect24h.feedbackCorrect` +1、`detectFeedbackTotal` 同步。
- **status 监控**：`ollama.visionWarm=true`（minicpm-v 4.9GB 在显存）、`detect24h{total,recognized,recognizeRate}` 全部真值刷新。

### ✅ 截图幻觉已修：识图加「植物前置判别门」（commit `3ba83d43`）
用户拍板「加植物前置判别门」。实现 `isAgriculturalPhoto(bytes)`：识图前先用视觉模型问一句 yes/no「画面主体是不是真实植物」（`format=json`、temperature 0、`{"isPlant":bool}`），**只在明确 false 时拦成「无法识别」，主识别 prompt 完全不动**；判别只看有无植物主体、不拿背景说事（避免误拦 PlantVillage 那种纯灰底单叶），出错/超时/判 true 一律放行保召回。判别实测 **4/4 正确**：苹果黑星/番茄叶霉/马铃薯晚疫真叶→true 放行，App 个人页截图→false 拦掉。代价：每次识图多一次视觉调用（暖模型 +~2s，可接受）。
- ✅ **全链路干净 GPU 实测已补做**：苹果→门放行→`苹果黑星病 0.85/0.95`+`knownDisease=apple_scab`+`reason:None`；截图→门拦截→`无法识别`+`reason:not-plant-photo`。release 浏览器也确认截图现在出诚实「智能识别·未能识别」卡片（无 VERIFIED/置信度/反馈/建档 CTA，只剩重拍+呼叫植保），不再幻觉「水稻稻瘟病 95% VERIFIED」。

### ✅ 澄清：ollama 并没有「丢 GPU」——是 sizeVram=0 显示 bug 把我骗了
本会话中途一度以为 ollama 退化 CPU-only，**那是误诊**。真相：ollama **0.30.0 的 `/api/ps` 把 `sizeVram` 恒显示成 0**（已 `size=4.92G` 但 `sizeVram=0`），看着像在内存其实在显存。权威判据是**暖推理延迟**：实测 minicpm-v 暖推理 **2.6s / 40 tok/s = 满 GPU 速度**；server.log 也写明 `library=CUDA`、`offloaded 29/29 layers to GPU`、`CUDA0 model buffer 4166 MiB`。之前的「慢/超时」只是 ① 从 E: 盘**冷加载一次性 ~160s** ② 我自己并发请求把模型挤来挤去触发反复 reload。**别再被 sizeVram=0 误导去重启机器**。判 GPU 是否在用：跑一次暖推理看 tok/s（>20 就是 GPU），别看 sizeVram。
- ⚠️ 仍要注意：模型在 **E: 可移动盘**，**冷加载真的慢（~160s）**。demo 前提前打一次识图把视觉模型预热进显存、并确认 E: 在位；别为小事反复 restart ollama（每次冷加载 160s）。预热用 `keep_alive:"60m"` 拉长留显存。

### （历史）原始发现：小视觉模型对「非植物垃圾输入」会**自信地幻觉一个病**（精度/召回硬跷跷板）—— 已由上面植物前置门解决
- 上传一张**纯 App UI 截图**（农户个人页，根本不是植物）→ minicpm-v 返回 **「水稻稻瘟病 95% VERIFIED」**。这正是批 64 想根治的「确信地说错」。诚实兜底只在 ① ollama 离线 ② 模型**自己**说无法识别 时生效；模型对垃圾输入不自报无法识别时，两道后端护栏（conf<0.4 降级、纯英文 label 不在 KB 降级）都绕过（它给的是 0.95 + 中文病名且在 KB）。
- **试过 prompt 加固**（扩约束#2 非农业枚举 + 加「示例4 截图→无法识别」few-shot）：截图能稳定修成「无法识别」3/3，**但同一改动把真苹果黑星病也压到 conf 0.3 → 被 <0.4 护栏砍成无法识别**（召回崩）。隔离验证：**原版 prompt 苹果 4/4 = 0.85 稳，任何截图加固都拖垮真植物召回**。→ **结论：已 `git stash drop` 丢弃 prompt 改动，保留原版**。原版对 demo 招牌路径（真叶片→95%）调得好，截图幻觉是窄边际风险（demo 输入受控，演示者拍真叶片）。
- **下一步若要根治截图幻觉**（不伤召回）：不能靠 prompt 单调，需要 ① 加一个独立「这是不是植物照片」前置判别（轻分类器/单独问模型 yes-no 再决定走不走识别）② 或 demo 用更大视觉模型（minicpm-v:8b 已是单机 8GB 极限）。优先级看用户对「演示中有人上传非植物图」的容忍度。

### 实测手法备忘
- 测试图用 PlantVillage 数据集（GitHub raw，URL 要 `urllib.parse.quote` 编码空格/三下划线），下到 `.runtime/apple-scab.jpg` 等。
- Playwright 驱动 Flutter 识图：`+` 是 canvas 用 `page.mouse.click(255,829)` → 弹 action sheet → 点「从相册上传」`(375,755)` → 触发 filechooser → `browser_file_upload` 传绝对路径。token 注入后 about:blank 整页重载（见 reference 记忆）。
- ollama 模型在 **E: 盘**（`OLLAMA_MODELS=E:\Ollama\models`），E: 是可移动盘，**拔了 ollama 全挂**（server 反复 exit）。demo 前确认 E: 在位。

---

## 2026-06-07 · Claude+Codex 并行 AI 识图链路全面收紧（已合并 6 条 commit）

### 状态：本地/origin/main 同步在 `c6ef1c6e` 之后（Codex 任务 3 在跑中可能再 +1 commit）。工作树只剩用户原有 `home_page.dart` 搜索栏排版改动 + 未跟踪 `.playwright-mcp/` `.runtime/codex-task-*.md`。

用户上传香蕉图被识成「tomato_magnesium_deficiency 81% VERIFIED」触发本批次。bug 根因：ollama 离线时 `imageAnalyze` 走 `fallbackImageResult` 随机抽 KB 一条病害返回 `modelLabel`（英文蛇形），假高置信度+VERIFIED 徽章 = 「确信地说错」。修后 6 个 commit 把链路从「不可用」推到「真识别 + warmup + 反馈 + 监控」全套：

**Claude 主导（3 commits, 后端为主）**
- `aba193bc` 兜底改诚实「无法识别」：`unavailableImageResult`、`resolveDiseaseLabel(modelLabel→diseaseName)`、`recognized=false` 契约字段；前端 `_detectReportCard` 加无法识别分支
- `3b617f24` 链路收紧：`format='json'` 透传给 ollama、`warmupVisionModel` 启动预热、prompt 重写为 schema+3 个中文 few-shot、超时 15→60s
- `3c921e39` 反馈接口 + status 增强：`POST /ai/detect-feedback`（复用 schema 历史预留 `feedback Int?`，1=correct/0=incorrect/2=unsure）；`/ai/status` 新增 `detect24h.{recognizeRate,feedbackCorrect/Incorrect}` + `ollama.{loadedInVram,visionWarm,primaryWarm}`
- `c6ef1c6e` 45b 招牌场景升级：`PhotoFlowPage` 从 `/agri/disease/detect` 改为 `/ai/image/detect`；imageAnalyze 识别命中 KB 时透传 `result.knownDisease` 全 DB 行；前端 `_recognized` 时才显示一键建档

**Codex 协作（2 commits, 前端为主）**
- `c27d1dac` 识图等待态+预览：`Timer.periodic` 每秒刷新 subText「已等待 12s · 首次 30-60s」、`InteractiveViewer` 大图预览、`_ChatMessage.subText` 字段
- `5dc14f83` 历史缩略图+反馈按钮：DETECT 类 `_Thread` 加 imageUrl 字段、48x48 缩略图、`_detectFeedbackRow` 三按钮（准/不准/不确定 → POST 我那个 feedback 接口）、`_DetectResult.recordId` 透传（注意：recordId 是 `AiDetectRecord.id` 不是 `AiQaRecord.id`）

### 实测对比（minicpm-v:8b-2.6-q4_K_M, 5060 Laptop 8GB）

| 输入 | 修复前 | 修复后 |
|---|---|---|
| 香蕉摆拍（实际无病害） | tomato_magnesium_deficiency 81% VERIFIED（番茄病害胡说）| 香蕉黑斑病 85%（4s, 中文）— 模型把成熟斑判为黑斑，错但可控 |
| 苹果叶白斑（真病害样本）| 同样随机抽 81% | 苹果黑星病 95%（20s, 中文）— 病害判断合理 |
| ollama 离线 | 仍假装 81% | 无法识别 0%（前端去 VERIFIED+CTA） |

启动 log 增加 `✓ 视觉模型预热完成 (369 ms)` / `⚠ 视觉模型 X 未拉取`，便于运维。

### ⚠️ 已知坑（下个 session 别踩）

1. **KB 覆盖率不全**：minicpm-v 常输出真实病害名（苹果黑星病、香蕉黑斑病），但 seeds/index.js 收录的只有腐烂/红蜘蛛/轮纹等。结果 `result.knownDisease=null`，前端走 adviceText 降级建档（cropType 空）。要扩 demo 关键作物常见病 KB（建议补：苹果黑星/白粉，番茄早疫/晚疫/灰霉，黄瓜霜霉/炭疽，水稻稻瘟/纹枯，香蕉黑斑/炭疽）。
2. **PowerShell pipe Codex 中文乱码**：`Get-Content` 不指定 `-Encoding UTF8` 时按 ANSI 解码，UTF-8 工作单变乱码。我第一次派 codex 就翻车（codex 还能从代码上下文推断意图但勉强）。约定：`Get-Content -Path X -Raw -Encoding UTF8 | codex exec`。
3. **vision model 5 分钟无访问自动卸载**：ollama 默认 keep_alive=5m。`status.ollama.visionWarm` 字段会自然衰减为 false。如果 demo 时 idle >5min，第一次识图又是冷启动。可以在 demo 前手动打一次 /ai/image/detect 预热，或后端跑定时 ping。
4. **小视觉模型对叶片病害判断错误率高**：苹果叶白斑被判「黑星病」其实形态特征不符。模型能力上限，本批没碰。后续可加 prompt 提示「叶片病害需结合症状形态判断」或换大模型（minicpm-v:8b 已经是单机 8GB 极限）。
5. **codex 派单约定**：用 `Get-Content -Encoding UTF8` 读 prompt 文件；`--dangerously-bypass-approvals-and-sandbox` 而不是 `-s workspace-write`（后者写不了 flutter 缓存）；写明文件域分离让 codex 避开 Claude 在并行改的文件。

### 接口契约速查（next session 写新代码前看）

```
POST /api/v1/ai/image/detect (alias /ai/image/analyze)
  body: multipart image + detectType + cropType?
  resp: { recordId, detectType, imageUrl, serviceMode, modelUsed,
          result: { resultLabel, confidence, recognized, adviceText,
                    detail, knownDisease } }
POST /api/v1/ai/detect-feedback
  body: { recordId(=AiDetectRecord.id), feedback: 'correct'|'incorrect'|'unsure' }
GET  /api/v1/ai/status
  resp: { ollama: { online, models, loadedInVram, visionWarm, primaryWarm, ... },
          counters: { qaCount, detectCount, detectFeedbackTotal, ... },
          detect24h: { total, recognized, recognizeRate, feedbackCorrect, feedbackIncorrect } }
```

### 下一步建议

1. **Codex 任务 3 (后台运行中)**：管理台 AiOpsPage 增加识图监控（成功率/反馈率/warm tag/识图记录卡），等它完成后核对 build 通过。
2. **补 KB**：上面 ⚠️1 的病害列表，让 knownDisease 命中率提升。
3. **真机/release 实测**：本批所有前端改动 analyze 全过，但都是 debug build；按记忆 `feedback-verify-flutter-in-browser` 应在 release 真机点一遍：单会话页诊断卡（recognized 真/假两个分支）、列表页缩略图、反馈三按钮、45b PhotoFlowPage 建档闭环。
4. **demo 前预热**：开局先打一次 `/api/v1/ai/image/detect` 让视觉模型进显存，避免演示时 30-60s 冷启动。

---

## 2026-06-07 · Codex 收尾 AI 运维页识别率 / 反馈 / 暖机状态 / 最近识别

### 状态：只改 admin 页面与交接簿，未触碰 backend/src / Flutter / prisma

用户指定本批只改 `backend/admin/src/pages/AiOpsPage.jsx`，并要求 admin build 后 commit + push：
- **K · 指标卡补齐**：AI 运维中心顶部统计从 4 个扩到 6 个，`Row` 改为 `xs={24} sm={12} lg={4}`；新增「24h 识别率」（`detect24h.recognizeRate` 百分比，副标题 `24h 共 N 条`）和「反馈准确率」（24h correct / incorrect 计算，无反馈时 `-`，副标题使用 `detectFeedbackTotal`）。
- **L · 模型暖机 Tag**：模型配置表在 `type` 列 render 内追加暖机 Tag；问答模型读取 `status.ollama.primaryWarm`，视觉模型读取 `status.ollama.visionWarm`，检索模型 bge-m3 不展示 warm 状态；`modelRows.type` 仍保持普通字符串。
- **M · 最近识别记录**：`load()` 增加 `/admin/resource/aiDetectRecord/list?pageNum=1&pageSize=6`，新增「最近识别记录」Card；表格展示图片、结果标签、置信度、反馈与时间。图片 URL 使用 admin request 的 `API_BASE` 解析服务端 origin 后拼 `/uploads/...`，不硬编码 `localhost:8000`，缺图或加载失败显示「无图」占位。
- **验证**：`cd backend/admin && npm run build` 通过，退出码 0；Vite 仅提示 chunk 大于 500 kB 的体积 warning，非本批新增阻断。
---

## 2026-06-07 · Codex 收尾 AI 识图历史缩略图 + 反馈按钮

### 状态：窄范围前端收尾，未改 backend / prisma

用户指定本批只改 `app/lib/pages/ai/ai_threads_page.dart`、`app/lib/pages/ai/ai_chat_page.dart` 和本交接簿；工作区里其它未提交差异不要混入提交。

- **AI 历史 DETECT 缩略图**：`_Thread` 增加 `imageUrl`；`_load()` 对 `kind == 'DETECT'` 的记录解析 `referencesJson`（字符串 JSON）里的 `imageUrl` / `detect.imageUrl`，再兜底 `record.imageUrl`。`/uploads/xxx.jpg` 会用 `ApiClient.baseUrl` 的服务端 origin 拼成完整网络 URL，不拼 `/api/v1`。历史卡片保留原左侧日期/报告边框逻辑，DETECT 有图时在 preview 左侧显示 48×48 缩略图，含 loading 和 error fallback。
- **识图反馈按钮**：`_DetectResult` 增加 `recordId`，从 `/ai/image/detect` 返回的 `data.recordId` 读取，并写入 `referencesJson.detect.recordId`，历史打开时可从 `referencesJson.detect` 重建识图卡片。识图成功卡片新增 3 个 32px 胶囊按钮：`准` / `不准` / `? 不确定`，分别 POST `/api/v1/ai/detect-feedback` 的 `correct` / `incorrect` / `unsure`。`_feedbackSent` 按 `recordId` 防重复提交；404/403/参数错误只 toast，不 crash，并允许重试。
- **重要合同坑**：反馈接口吃的是 `AiDetectRecord.id`（`/ai/image/detect` 的 `recordId`），不是 `/ai/qa/records/detect` 保存到会话后的 `AiQaRecord.id`。后续不要把 QA 记录 id 当反馈 recordId。
- **验证**：`cd D:\dgitc_project\InkFlow\app; C:\dev\flutter\bin\flutter.bat analyze lib/pages/ai` 通过，输出 `No issues found! (ran in 1.5s)`。

---

## 2026-06-07 · Codex 收尾 AI 识图等待态 + 图片预览

### 状态：基于 HEAD `aba193bc` 做窄范围前端收尾，保留既有未提交改动不碰

用户要求只改 `app/lib/pages/ai/ai_chat_page.dart`，补两个 AI 识图 UX 点，并回填 `docs/46b-AI双层重构.md` 与本交接簿：

- **识图等待态**：`_pickAndDetect` 发送图片后，用户消息后立即追加 streaming bot 消息「正在识别图片内容...」；新增 `_ChatMessage.subText`，用 `Timer.periodic(const Duration(seconds: 1))` 每秒刷新「已等待 Ns」。等待 12s 后切换为本机视觉模型冷启动提示，说明首次识图通常需要 30-60s。识别成功/失败后替换原 bot 消息，`finally` 中取消 timer。
- **图片预览**：用户气泡内 160×160 缩略图增加点击预览；用 `showDialog(barrierColor: Colors.black87, barrierDismissible: true)` + `InteractiveViewer` + `Image.memory(fit: BoxFit.contain)`，右上角白色关闭按钮，未引入 `photo_view`。
- **验证**：`cd D:\dgitc_project\InkFlow\app; C:\dev\flutter\bin\flutter.bat analyze lib/pages/ai` 通过，输出 `No issues found! (ran in 2.4s)`。
- **工作树注意**：进入本批前已有非本批改动 `app/lib/pages/home/home_page.dart` 以及未跟踪 `.playwright-mcp/`、`design_assets/`；本批不应暂存或提交它们。

---

## 2026-06-07 · Claude+Codex 并行 session（批4迁移 + 动画诊断 + #17 实测）→ 用户睡前自主收尾后关机

### 状态：本地 main / origin/main 均在 HEAD `b9afcf1b`（批4），工作树仅剩未跟踪临时文件（已清）。本会话结束后按用户指令 `shutdown /s` 关机。

用户要求「自己和 Codex 同时并行、都能召唤 subagent」，随后「执行完再做两个任务，完了关机去睡觉」。分工：Claude 做 #16.1 动画（前端视觉，浏览器实测）+ Codex 做 #16.2 批4 卡片迁移（零文件重叠：Codex 只碰 info_detail_page/about_page/life_page，复用现有 `/detail/info` 路由不碰 router.dart）。

- **#16.2 批4 卡片迁移（已 commit+push `b9afcf1b`，docs/63）**：Codex 实施——`InfoDetailPage` 加可选底部主操作按钮（`actionLabel`/`onAction`，先 pop 再执行）；about_page 服务协议/隐私政策、life 邻里互助详情、life 水电气账单 由底部弹层迁为 `/detail/info` 独立页；删 life 内 `_sheet`。Codex 因 `-s workspace-write` 沙箱写不了 flutter 缓存，卡在跑 analyze，**代码已改好，analyze 由 Claude 自己跑（无沙箱）通过 No issues**。浏览器实测（release）：about→详情页 push + sections 渲染正常 ✓。⚠️ life 动作按钮分支（响应互助/确认缴费）因表单 sheet 交互摩擦**未点测**，代码 analyze-clean 且沿用已验证 push 模式。
- **#16.2 收尾判断**：全局扫描确认**已无剩余展示型卡片可迁**（home/profile/messages 无弹层；service 页展示卡 60-63 批已迁；剩 `showModalBottomSheet` 全是操作型——表单/图片源/购物车/年份选择/同步日志/积分兑换，按约定保留）。**批5 实际为空，#16 第2条「卡片改独立页」可视为基本完成。**
- **#16.1 动画不流畅（已诊断，结论：无需改代码）**：用 rAF 采样 + Playwright 实测。**关键坑：之前一直在跑 HTTP 缓存里的旧 debug bundle**（清 SW+CacheStorage 不够，main.dart.js 同名被缓存复用；必须 CDP `Network.clearBrowserCache`+`setCacheDisabled`，见新记忆）。修正后真 release（main.dart.js 3.8MB）实测：
  - 转场（自定义右进左出滑动，theme.dart `_SlidePageTransitionsBuilder`）重复进出 **0 掉帧**、滚动 **0 严重掉帧** → 转场/滚动本身丝滑。
  - 首访：数据管理/流通销售等多数页 max 6-7ms 顺滑；**仅气象灾害这类「数据回来后一次性堆渐变头+GridView+多区块」重页有 ~85ms 一次性顿挫**（debug 下放大到 290ms）。
  - **结论：reporter 的「不流畅」主要是 debug build 产物（Dart 执行慢 ~10×），release 基本顺滑。预览/比赛务必用 release（start-local.ps1 本就是 release，但批次验证用过 --debug）。转场代码不动。** 残留：灾害页等重页首访 85ms 可后续优化（拆分首帧构建），优先级低。
- **#17 AI 三条（实测：②③已修验证，①未测）**：发现 ollama 没在跑→Claude `ollama list` 把它起来了（已装 qwen2.5:7b/minicpm-v:8b/bge-m3）。**坑：后端必须在 ollama 起来后才启动**才会识别大模型，否则只走 knowledge-rule 兜底——本会话重启了后端（`✓ Ollama 在线`）。浏览器实测（farmer 账号，真 LLM）：
  - **#17.2 markdown***：✓ 已修复**——问稻瘟病防治，回 5 个 `**加粗**` 编号点全部渲染成真加粗，**无一个字面 `**`/`***`**（`_MarkdownText` 自定义解析生效）。
  - **#17.3 流式：✓** 逐 token 流式 + `_StreamingCursor` 光标正常（7b 冷启动首 token ~30-60s）。
  - **#17.1 识图：未测**——需相册/拍照文件上传，Playwright 难驱动；代码在（minicpm-v 视觉 + `_pickAndDetect`）。待真机。

### 下一步建议
1. **#16 可考虑关闭**：动画=debug 产物（建议用户在 release 包再感受一次）、卡片迁移已基本完成。关前最好让用户在 release 真机点一遍 + 确认灾害页 85ms 顿挫可接受。
2. **#17 关前只差 #17.1 识图真机测**（②③已验证）。
3. 灾害页等重页首访顿挫如需优化：把数据回来后的整树构建拆分（骨架先出/分帧构建），但优先级低。
4. 派 Codex 跑 flutter 时别用 `-s workspace-write`（写不了 flutter 缓存会卡 analyze）；让 Codex 只改代码、analyze 交给无沙箱的 Claude，或给 Codex `danger-full-access`/把缓存目录加 `--add-dir`。

---

## 2026-06-05 · Codex 接手核查 session

### 状态：本地 main / origin/main 均在 HEAD `5b7779de`，工作树仅剩 `.playwright-mcp/`、`design_assets/` 未跟踪

本会话按用户要求先问 `claude` 当前模型；`claude -p` 回答为 **DeepSeek V4 Pro**。因此没有让它直接改代码，只把它当低信任辅助。

- 已重点审查最新提交 `5b7779de`：`app/lib/pages/ai/ai_chat_page.dart` 的图片识别 `_pickAndDetect` 首次保存后不再 `context.go('/ai/chat/:id')`，只在页内记录 `_threadId`，与文本 `_send` 的修法一致。
- 契约核对：后端 `qaDetectRecord` 返回 `{ recordId, threadId, record }`；前端记录 `_threadId` 后，删除按钮可显示，后续文字追问会带同一 `threadId`，逻辑闭环。
- 验证：`cd app && C:\dev\flutter\bin\flutter.bat analyze lib` 通过，输出 `No issues found! (ran in 2.6s)`。
- GitHub API 临时不可用：`gh issue list` / `gh pr list` 均超时，未能实时核对远端 open issue 状态。当前只能按本地 docs 与本地 `origin/main` 判断。
- 用户随后要求“让 Claude 写代码，Codex 审查”。已让 Claude（DeepSeek V4 Pro）实现 58-4 G5：`backend/src/modules/ai/ai.controller.js` 收紧 App 端 AI 会话范围，ADMIN 也只能通过 `/ai/qa/*` 访问自己的会话；管理台全平台记录仍由 `/admin/resource/aiQaRecord/list` 提供。Codex 已审 diff，并跑 `node --check backend/src/modules/ai/ai.controller.js` + 临时 HTTP smoke（admin/farmer 各造 1 条记录，确认 admin App 只见自己、读/续写/删 farmer thread 均 404、admin resource 仍能见两条），临时记录已清零。该修复已 commit + push：`6f2d8eed fix: 收紧 ADMIN App 端 AI 会话范围`。
- 之后继续把 issue #16 第一批交给 DeepSeek：新增通用纯展示详情页 `/detail/info`，并把 agri/disaster/market_service/policy_service/life 中纯展示型 `_infoSheet`/`_sheet` 迁移为页面。Codex 审查后删掉 DeepSeek 越界生成的 `docs/60-国风UI大重构计划.md`，补了 `state.extra` 缺失时的路由兜底和详情页返回 fallback。验证：`flutter analyze lib` 通过、`flutter build web --debug` 通过、静态服务下 `/detail/info`/`main.dart.js`/`manifest.json` 均返回 200。工作单为 `docs/60-全局卡片详情页第一批.md`。
- 按用户“继续给 DeepSeek 排任务”要求，又把 issue #16 第二批交给 DeepSeek：农机列表卡进入 `/machinery/detail`，发布动态卡进入 `/publish/detail`，保留农机预约 sheet 与动态响应/拨号逻辑。Codex 审查后修了 DeepSeek 留下的 `AppColors` 路由导入缺失、农机页 unused `_openBookingSheet`、发布页旧 `_PostDetailSheet` 死代码；验证：`flutter analyze lib` 通过、`flutter build web --debug` 通过、静态服务下 `/machinery/detail`/`/publish/detail`/`main.dart.js`/`manifest.json` 均返回 200。工作单为 `docs/61-实体卡片详情页第二批.md`。
- 继续把 issue #16 第三批交给 DeepSeek：消息详情、政策详情、年度农事报告详情迁移到已有 `/detail/info`。DeepSeek 没有实际跑 analyzer；Codex 审查后确认未触碰年份选择、统计上报、同步日志、确认弹窗等操作型弹层，并补跑 `flutter analyze lib`、`flutter build web --debug`、静态服务 `/detail/info`/`main.dart.js`/`manifest.json` 200。工作单为 `docs/62-展示型详情页第三批.md`。

### 下一步建议

1. issue #16 尚未关闭。第一批覆盖纯展示详情页，第二批覆盖农机卡详情、发布详情，第三批覆盖消息、政策、年度报告详情；下一批可继续拆订单/购物相关卡片或其它高频卡片，但要先区分展示型与操作型。
2. issue #17 代码侧基本已落：markdown 加粗、数据/RAG、流式、图片识别首发不重导航都已处理；剩下是真机/浏览器最终确认后关 issue。
3. `45h/45l~45o` 仍属于故事化、视觉展示、话术/demo 脚本文档项；需要 Claude/用户拍版工作单后，Codex 再按工作单实施。

---

## 2026-06-04 · 浏览器实测 + AI 聊天/45c 修复 session

### 状态：全部已 commit + push 到 origin/main（HEAD `0a2753e8`），工作树干净（仅 .playwright-mcp/、design_assets/ 未跟踪）

本会话先实测 06-03 批次，再修两块 bug，逐个浏览器实测过：

- **45i/45j/45f 实测通过**：首页规模徽章带横滑不溢出；数据看板环形图（水稻48·74%/番茄12·18%/柑橘5·8%，48+12+5=65、加总100%、图例对）；板块头部 chip（/data /agri 通用）。
- **45c 村委数据驾驶舱页收尾**（commit `6d071b96`）：用户拍板「留作手机内页」（不是投屏大屏，是 App 内村委角色总览页，入口在数据看板）。① 指标卡改 `mainAxisExtent:122` 固定卡高，修「5块地/全年农事档案」副标题被裁切；② 删 `isWide>900` 宽屏响应式死代码（移动 App 跑不到）；③ data_dashboard 入口 tooltip「全屏大屏」→「驾驶舱视图」去"大屏"字样。
- **AI 历史聊天「进入动画重复」修复**（commit `0a2753e8`，issue#16 那条）：根因=新建会话**首次发送成功后** `context.go('/ai/chat/:id')` 把 URL 从 `/ai/chat/new` 切走 → GoRouter 默认 builder 重建整页 → 重放 Material 进入转场 + 重拉历史。实测复现（URL new→93）。修法：首发拿到 threadId 只在页内记 `_threadId` **不再导航**；删除按钮可见性+删除逻辑改用 `_threadId`。实测：发消息后 URL 停 `/ai/chat/new`、无重拉、删除按钮正常、markdown 加粗正常。

### 实测手法（重要，已存记忆 reference-flutter-web-sharedprefs-token-inject）
Flutter web 注入 token：SP 字符串值是 **JSON 编码**，`flutter.token`=`JSON.stringify(token)`、`flutter.user`=双重编码，裸串会全 401 走缓存。Canvas 文本输入用 `browser_run_code_unsafe` 调 `page.mouse.click`聚焦→`keyboard.type`→`press('Enter')`。注入后必须 about:blank 整页重载。

### issue#17 AI 三条仍 OPEN（待真机最终确认后关）
①识图 ②markdown*** ③数据+流式——代码侧早做了，本会话顺带看到 markdown 加粗渲染正常、流式正常（7b 冷启动慢，超时已设 180s）。识图未单独测（需相册/拍照）。

---

## 2026-06-03 · Codex 批量派单 session（招牌场景代码侧收尾）

### 状态：全部已 commit + push 到 origin/main，工作树干净
本会话用 `codex exec` 流水线派单，11 个提交全部落地 main（HEAD `85c757ba`）：
- **#59** 数据库知识补全（病害54/农药32/农事36/行情18品/政策18，亲跑 db:seed 验过）
- **ollama** 文本生成超时 90s→180s
- **45c** 村级数字驾驶舱大屏（/screen，village 账号入口在数据看板）
- **45d** 全局搜索 + 新建 `app/lib/core/feature_catalog.dart`（71 条功能清单，B/C 多处复用）
- **45e** 全部服务工具墙（/all）
- **45i** 可讲数字：`/data/dashboard` 加全平台口径 `platformStats` + 首页徽章带
- **45f** 板块头部工具 chip（新建 `widgets/section_tool_chips.dart`，铺 7 个板块主页）
- **45j** 数据看板「种植结构」柱图→手绘环形图（`_DonutPainter`，无图表依赖，删了 unused `_barRow`）
- 另把 **45b/45k** 进度总览订正为 ✅（实现早随 home 重写/cfc4f396/a2afab8c 落地，之前漏翻）

每个都自跑 `flutter analyze lib`（全绿）+ 后端项跑了 node --check / db:seed。**但全程没做浏览器实测**（用户要求 push 后叫别人在真机/浏览器查）。

### ⚠️ 待别人验（重点）
- **45j 环形图**：纯手绘视觉，analyze 绿≠画对。盯占比/百分比加总/单作物/空数据/窄屏图例溢出。
- **45c 大屏 / 45i 徽章 / 45f chip**：真机/浏览器看观感与不溢出。
- **比赛机 Flutter 3.44**：本地 3.32.1 analyze 过≠比赛机能编，让查的人留意编译。

### 招牌场景代码侧基本铺完，剩下的都不是 Codex 活
- **45h(C2)** AI 案例库 —— plan 标「缓冲项不做」
- **45l(D3)** 签名交互、**45m/45n/45o** 口号/技术话术/demo 脚本 —— 文档+产品判断，得人一起写
- **45j 后续刀**：月报/大屏环形图、行情趋势折线（要另开工作单）
- **GitHub issue #16**（动画不流畅 / 卡片改独立详情页）—— 前端视觉，建议 Claude 自己改+浏览器实测，别甩自主 Codex
- **issue #17** AI 问题：①识图超时兜底 ②markdown*** 渲染（68d45de4 早修）③数据(#59)+流式 —— 代码侧都做了，待真机确认后可关

### Codex 派单踩的坑（下次直接照做）
`codex exec` 传 prompt：**别用 PowerShell 管道**（中文 stdin 变 `???`）、**别让 stdin 开着**（卡等输入）。正解：纯 ASCII 引导 prompt 作参数 + 让 Codex 自己读磁盘上的 UTF-8 任务文件（`.codex-task-*.txt`）+ Bash `< /dev/null` 关 stdin + 后台跑 + Monitor 轮询 git log 等提交。

---

## 2026-06-01 · 农机页重构 session

### ⚠️ 最重要:一堆改动还没 commit
当前 `main`:
- **ahead 1 未 push**:`94ae53a9` chore: .claude/settings.json 移出版本库 + gitignore(本机插件配置误提交)
- **未提交工作区改动**(等用户在 App 里验完才提交,别擅自 commit/push):
  - `app/lib/pages/machinery/machinery_page.dart`(整文件重写 + 搜索框重设计)
  - `app/lib/pages/machinery/machinery_service_page.dart`(工具墙重排)
  - `docs/进度总览.md`(加 53 行 + 当前状态)
  - `docs/53-农机共享页重构.md`(新增工作单)

### 本会话做了什么(docs/53 农机共享页重构,2 轨并行)
- **轨1 `machinery_page.dart`**:K 真搜索 + 数据驱动筛选(删了把"植保机"错写成"无人机"的 switch)/ L 地图收到 ~0.28 屏 + 「地图功能即将上线」角标 + `SliverList` 列表卡(一屏3~4张)+ 真实预约 sheet(`showDatePicker` + 天数/租金/押金预览)/ M1 发布农机入口(`POST /machinery`)
- **轨2 `machinery_service_page.dart`**:7 项工具整合成 `GridView` 工具墙,业务逻辑未动
- **搜索框重设计**(用户特别满意✅,已成输入框标准,见记忆 `feedback-input-small-radius`):圆角 999胶囊 → `R.sm`(8)+1.5px描边、去阴影、TextField 显式 `filled:false`+三border全none、灰圆 tune 钮 → 方角品牌绿「搜索」按钮
- `flutter analyze lib` 整合后全绿;后端没动(发布/预约接口本就有)

### 你待会要做啥(按顺序)
1. **用户说"有另外的问题"** —— 他会在新会话提一个**新问题**,先听他说,优先处理。
2. 用户验完农机页 → 按工作单两条中文 commit 提交(轨1/轨2 可分可合),再问要不要 push(连 94ae53a9 一起)。
3. **验收盯的脆弱点**:预约/发布 sheet 是 `Navigator.pop(context)` 后再 `toast(context,…)`,pop 后用同一 context 弹 toast 可能不显示。若 toast 没弹 → 改成 pop 前先 `final m = ScaffoldMessenger.of(context)` 捕获再用(2 行)。
4. 农机页硬刷验收:`Remove-Item app\build\web\flutter_service_worker.js` → 全编 → **无痕窗口**。验 5 点:搜"收割"能滤 / 点"植保机"chip 出植保无人机 / 地图收小+角标 / 点卡选日期预约出 toast / 发布农机刷新列表 / service 7 tile。

### 后面排队的
- **48b**(P1:G4~G9,含 G6 controller 释放、G8 首页 AI 演示风险)、**48c**(P2 清理)—— 工作单已写好未实施,建议穿插清掉再上招牌场景
- **46d** 个人资料完整编辑 + 存储管理真值 —— **还没写工作单**
- 回 **45 招牌场景**:45b → 45c → 45d → 45e → 45k(工作单都写好了,待实施)
- GitHub open issue:#6农机/#7全局/#8政策/#10乡村生活。**#6 等 docs/53 落地后再回看**(Lane A 只盖了 7 子bug 中 1 条)

---

## 长期约定 / 环境(每个会话通用)

- 根目录 `D:\dgitc_project\InkFlow`;Flutter `C:\dev\flutter\bin\flutter.bat`;Flutter 工程在 `app/`(analyze 要 `cd app`)
- 后端 :8000 / 管理台 :5173 / 移动web :5000;启动 `scripts/start-local.ps1`
- 移动 Web 预览**只能使用 `http://localhost:5000`**；遇到旧资源先清浏览器缓存 / Service Worker 并强制刷新，禁止另起 5001 等临时端口。
- **commit 一律中文** + 结尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`;前缀 feat/fix/docs/chore 保留;**视觉/重写改动等用户点头再 commit**
- 设计系统 Agro-Modernist Tech:主绿 `AppColors.primary`(0xFF0D631B)/大地棕/麦金/背景 `background`;圆角 `R.sm=8/md=16/lg=32`;阴影 `ambientShadow`(柔棕,禁纯黑);公共件 `FarmAppBar(showBack)`/`AppCard`/`SectionTitle`/`StatusChip`。**禁** generic 渐变/半透明白浮层/脉冲光。**输入框要利落方正小圆角**。
- 导航:5 一级 tab `/home /ai /publish /messages /profile`;底栏只在精确等于这 5 路径显示;`showModalBottomSheet` 必带 `useRootNavigator:true`;tab 用 `context.go`、详情入口 `context.push`、back `canPop?pop:go(fallback)`
- 协作:Claude 出 `docs/NN-*.md` 工作单/审查;实施可派并行 agent(**按文件归属切轨,别让两个 agent 改同一文件**)或交 Codex;完成回填工作单「实施备注」+ 进度总览改 ✅

## 用户性格(重要)
- 直、急、会骂;说"review 什么"= 你光读源码没真运行 → **改完一定实地点过或叫他验**,别声称"能用"
- 给方向时通常已有结论,别问太多三选一,直接干
- 审美在线:讨厌大圆角胶囊、generic 渐变、半透明白浮层、脉冲光
- 闲聊/歌词能力要在线("dont break my heart 再次温柔"是歌词不是指令)

