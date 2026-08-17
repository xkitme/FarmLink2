# PR 模板（四轨协作 · 必填项）

> 提交 PR 前请逐项填写。任何一项缺失或「待补」都会导致审查/门禁挂起。
> 生成产物（capabilities.js / apiCatalog.js / assistant-catalog.generated.js / feature_catalog.dart / inventory-report.json）
> 一律由 Integration 经生成器 `--write` 重建，任何 Agent 不得手改；本 PR 若包含生成产物变更，必须在
> 「生成产物 drift」栏给出对应生成器 `--check` 的通过证据。

## 0. 分支与范围

- **Lane（四轨之一）**：`backend` / `flutter` / `admin` / `integration`
- **分支**：`collab/<lane>-<任务>`
- **Base 完整 hash**：`<40 位完整 hash，禁止缩写>`
- **Head 完整 hash**：`<40 位完整 hash，禁止缩写>`
- **Base 是否为 Head 祖先**：是 / 否（否 = 分叉，PR 直接打回）

## 1. 变更清单（A/M/D 精确文件）

| 状态 | 路径 |
|---|---|
| A |  |
| M |  |
| D |  |
| R（旧 → 新） |  |

> 必须与 `git diff --name-status <base> <head>` 逐行一致；越界文件（不属于本 lane 允许路径、
> 生成产物、backend/data/**、Prisma）即使 1 个也须如实列出并说明原因，不得隐藏。

## 2. 测试计数闭合（tests / suites / 文件数）

- Backend：`<通过>/<总数>` tests · `<N>` suites · `<N>` 文件
- Flutter：`<通过>/<总数>` tests · `<N>` suites · `<N>` 文件
- Admin：`<通过>/<总数>` tests · `<N>` suites · `<N>` 文件
- 本 PR 新增/删除的测试：`<N>` 新增 · `<N>` 删除（与 A/M/D 对账）
- verify 步骤数：`<N>/<N>`（如本地无法全跑，写明 CI 子门禁替代口径）

> 禁止用「exit code 0」「status 200」「数组非空」代替语义断言；计数必须与测试运行器输出一致。

## 3. 安全影响

- 认证 / CSRF / Cookie / Origin / 代理信任 / 限流 / 上传 策略是否触碰：无 / 有（逐项说明）
- 若触碰：给出对应既有安全测试（116e C1/C2b/C2c）的通过证据与新增断言
- 是否引入新的密钥、token、明文凭据：否 / 是（是则 PR 打回）

## 4. 数据库指纹（backend/data/village.db）

- SHA256：`<before>` → `<after>`
- Size / Mtime(UTC)：`<before>` → `<after>`
- 结论：不变 / 变化（变化必须有用户+工作单授权并说明）

## 5. Prisma diff

- schema/migrations 变更：无 / 有
- 若有：`npx prisma migrate diff` 输出摘要 + 回退说明；无用户授权一律打回

## 6. 生成产物 drift

| 生成器 `--check` | 结果 |
|---|---|
| inventory-routes.mjs | 通过 / 失败 |
| gen-capabilities.mjs | 通过 / 失败 |
| gen-admin-api-catalog.mjs | 通过 / 失败 |
| gen-assistant-routes.mjs | 通过 / 失败 |
| gen-feature-catalog.mjs | 通过 / 失败 |

> 本 PR 未触碰生成产物时也须给出 5/5 通过证据（CI backend-drift job 截图/链接即可）。

## 7. 截图（UI 变更必填）

- 变更页面：`<页面名>`；视口：`<宽×高>`；明/暗/适老：`<覆盖情况>`
- 截图批准门禁：UI 行为/布局变更必须附前后对照截图；无截图 = 不合并

## 8. 回滚方式

- 单文件 revert / 整批 revert / 生成器重建：`<说明精确回滚路径>`
- 是否有迁移/数据回退：无 / 有（描述）

## 9. 自检清单

- [ ] 工作树干净（无未提交、无未跟踪）
- [ ] 未 force / rebase / reset 覆盖远端
- [ ] 未直接 push main
- [ ] 未上传数据库 / token / 日志 / 敏感产物
- [ ] 已运行 scope checker 并通过本 lane 范围校验
- [ ] 未手改任何生成产物（如 PR 含生成产物，必为生成器 `--write` 产出）
