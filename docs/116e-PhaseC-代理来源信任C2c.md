# 116e-PhaseC-代理来源信任 C2c

> 状态：✅ 完成
> 上位工单：[116e-身份安全与权限矩阵.md](116e-身份安全与权限矩阵.md)
> 前置依赖：C2a（CORS/上传/日志/HTTPS）+ C2b（HttpOnly Cookie 迁移）
> 分支：`codex/refactor-farmlink`，基线 `6e441ac4`

## 目标

关闭 116e Phase C 最后一个待办项：禁止后端无条件信任客户端自报的 `X-Forwarded-For`，统一来源 IP 解析为 Express 验证后的 `req.ip`/`req.ips`，并按实际部署拓扑配置受信代理范围。

## 背景与风险

### 当前缺陷

`backend/src/middleware/apiControl.js:47-49` 的 `clientIp()` 函数直接读取客户端可伪造的 `X-Forwarded-For` 请求头，且 Express 从未调用 `app.set('trust proxy', ...)`：

```js
function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown'
}
```

**攻击面**：
- 任意客户端发送 `X-Forwarded-For: <伪造IP>` 即可欺骗限流键（绕过全局限流、登录爆破限制、AI 配额、上传配额）。
- 审计日志 `operationLog.ip` 写入伪造值，失去溯源能力。
- Express 默认 `trust proxy = false` 时 `req.ip` 是直连 IP（正确值），但 `clientIp()` 优先取原始 XFF 头，导致信任倒置。

### 限流的影响

| 策略 | 键 | 当前伪造风险 |
|---|---|---|
| global (100/min) | `ip:<clientIp>` | 攻击者每次换 XFF 即可重置计数 |
| auth-login (10/min) | `ip:<clientIp>` | 可爆破任意账号 |
| sms (5/hour) | `ip:<clientIp>` | 绕过短信限制 |
| ai (20/hour) | `user:<id>` 或 `ip:<clientIp>` | 未登录用户可无限调用 AI |
| upload (30/hour) | `user:<id>` 或 `ip:<clientIp>` | 绕过上传配额 |
| admin-read/write | `user:<id>` | 不受 XFF 影响（已登录校验） |

### 审计日志风险

`operationLogMiddleware` 第 235 行 `ip: clientIp(req)` 直接写入伪造 XFF → 攻击溯源不可信。

## 部署假设

| 部署场景 | trust proxy 配置 | 说明 |
|---|---|---|
| **本机开发（默认）** | `false` | 无反向代理，直连 Express |
| **本机 nginx/caddy 反向代理** | `loopback` | 信任 `127.0.0.0/8` 和 `::1` |
| **局域网反向代理** | 显式 IP/CIDR | 如 `TRUST_PROXY=192.168.1.1` |
| **云环境 CDN/ALB** | 显式 CIDR | 如 `TRUST_PROXY=10.0.0.0/8,172.16.0.0/12` |
| **公网无代理** | `false` | 最安全，不信任任何 XFF |

## 配置契约

### 环境变量 `TRUST_PROXY`

| 值 | 行为 | 安全性 |
|---|---|---|
| 未设置 / 空 / `false` / `0` | `trust proxy = false`，忽略所有 XFF | ✅ 安全默认 |
| **`true` / `1`** | **拒绝启动** | 🔴 危险，主动拦截 |
| `loopback` | `trust proxy = ['loopback']`，信任 `127.0.0.0/8`、`::1` | ✅ 本机反向代理安全 |
| IP 地址列表 | 逗号分隔，如 `10.0.0.1` 或 `10.0.0.0/24,172.16.0.1` | ✅ 显式受信范围 |
| 非法值 | 拒绝启动并提示正确格式 |

### Express trust proxy 语义

配置后 Express 从受信代理的 `X-Forwarded-For` 最右端（最靠近服务端的一跳）逐级向左解析，`req.ip` 返回最左端（原始客户端）IP，`req.ips` 返回中间代理链。

### 来源解析统一契约

所有来源 IP 消费者必须通过单一函数 `clientIp(req)` 获取，该函数只读取 Express 验证后的 `req.ip`：

```js
function clientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown'
}
```

- `trust proxy = false` → `req.ip` = 直连 `remoteAddress`
- `trust proxy = ['loopback']` + nginx → `req.ip` = 真实客户端 IP（nginx 的 XFF 最左端）
- XFF 在多级代理链中由 Express 按信任链逐跳验证

### Fail-fast 原则

- `TRUST_PROXY=true` 启动即报错，不允许悄悄降级。
- 无法解析的 IP/CIDR 格式启动即报错，不允许部分生效。
- 错误消息包含正确的配置示例。

## 文件级改动

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/116e-PhaseC-代理来源信任C2c.md` | **新建** | 本工作单 |
| `docs/handoff-c2b-cookie-migration.md` | 修改 | 重写为历史交接说明，明确 C2b 已提交推送 |
| `docs/116e-身份安全与权限矩阵.md` | 修改 | 实施记录更新 |
| `docs/进度总览.md` | 修改 | 116e 标为 ✅ |
| `backend/.env.example` | 修改 | 新增 `TRUST_PROXY` 配置块及注释 |
| `backend/src/config/index.js` | 修改 | 新增 `resolveTrustProxy()`（node:net isIP）+ `config.trustProxy` |
| `backend/src/app.js` | 修改 | 新增 `app.set('trust proxy', config.trustProxy)` |
| `backend/src/utils/client-ip.js` | **新建** | 统一来源 IP 解析模块 |
| `backend/src/middleware/apiControl.js` | 修改 | 导入 `clientIp` + 导出 `clearRateLimits()` |
| `backend/src/middleware/uploadQuota.js` | 修改 | `req.ip` → 统一 `clientIp(req)` |
| `backend/test/proxy-trust.test.js` | **新建** | 代理信任全场景测试 |
| `backend/test/c2b-cookie-auth.integration.test.js` | 修改 | 移除 `X-Forwarded-For` 伪造限流绕过，改用 `clearRateLimits()` |
| `backend/test/auth-session.integration.test.js` | 修改 | 同上 |
| `backend/package.json` | 修改 | test 脚本加入 proxy-trust 测试 |

### 不改的文件

- Prisma schema / migration — 不涉及
- Flutter / 管理台前端 — 不涉及
- `client-detect.js` / `auth.js` / `csrf.js` / `originGuard.js` — 不涉及

## 测试与验收

### 新增代理信任测试（`backend/test/proxy-trust.test.js`）

| # | 场景 | 预期 |
|---|---|---|
| 1 | 默认直连：伪造 XFF 被忽略，req.ip = 127.0.0.1 | `clientIp()` 返回直连 IP |
| 2 | 默认直连：多次请求伪造不同 XFF，IP 相同 | 不能通过改 XFF 绕过限流 |
| 3 | `TRUST_PROXY=true` 配置拒绝 | 启动抛错 |
| 4 | `TRUST_PROXY=loopback`：XFF 来自 127.0.0.1 的请求 | req.ip 正确解析客户端 IP |
| 5 | `TRUST_PROXY=loopback`：XFF 来自非回环地址的请求 | XFF 被忽略，req.ip = 直连 IP |
| 6 | 显式可信代理 IP：XFF 来自该 IP | req.ip = 真实客户端 IP |
| 7 | 显式可信代理 IP：XFF 来自非可信 IP | XFF 被忽略 |
| 8 | 多级代理链（可信代理 + 不可信中间跳） | 符合 Express 信任模型 |
| 9 | `clearRateLimits()` 清空所有限流计数器 | 调用后计数器归零 |
| 10 | 限流在默认直连下同一 IP 正常生效 | 同一 IP 达到上限后返回 429 |
| 11 | 审计日志 ip 字段使用 req.ip | 不受 XFF 伪造影响 |
| 12 | `config.trustProxy` 在 dev 环境默认 `false` | 本地启动安全 |

### 已有测试修复

- C2b Cookie 测试：移除 `X-Forwarded-For: c2b-test-N` 伪造，替换为 `clearRateLimits()` 调用
- auth-session 测试：移除 `X-Forwarded-For: phase-b-test-N` 伪造，替换为 `clearRateLimits()` 调用

### 验收命令

```bash
node --check backend/src/config/index.js
node --check backend/src/app.js
node --check backend/src/middleware/apiControl.js
node --check backend/test/proxy-trust.test.js
npm test --prefix backend                              # 全量测试（含新增 proxy-trust）
npm test --prefix backend -- --test-name-pattern="C2b" # C2b 专项
npm run build --prefix backend/admin                   # 管理台构建
```

## 回滚（安全保留）

安全回滚：`TRUST_PROXY=false`，保留统一来源解析和测试修复；不得恢复直接读取原始 XFF 或测试伪造 XFF 绕限流。

- 设 `TRUST_PROXY=false`（默认值，忽略所有 XFF）
- 保留 `backend/src/utils/client-ip.js` 统一来源解析模块
- 保留 `clearRateLimits()` 模块级导出供测试隔离
- 保留 C2b/auth-session 测试的 `clearRateLimits()` 调用（不恢复 XFF 伪造）
- 可删除 `backend/test/proxy-trust.test.js`（被测特性已禁用）
- 不恢复 `apiControl.js` 直接读取原始 XFF 头
- 不恢复测试中通过伪造 XFF 绕限流的反模式

已知漏洞不得回退：XFF 伪造限流绕过和审计日志造假均已修复。

## 不在范围内

- 不修改 Prisma schema 或数据库
- 不在后端暴露限流重置 API（`clearRateLimits()` 仅模块级导出供测试）
- 不修改 Flutter App
- 不修改管理台前端
- 不在本工作单补 116d characterization tests（116d 仍进行中，本单不阻塞 116e 完成）
- 不引入第三方 IP 地理库或 WAF
- 不改变现有限流策略的数值（只改变 IP 来源）

## 实施备注

### 实施日期

2026-08-10，Claude Code 实施，Codex 三轮独立审查与验收，在 `codex/refactor-farmlink` 分支完成。

### 改动文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/116e-PhaseC-代理来源信任C2c.md` | **新建** | 本工作单 |
| `docs/handoff-c2b-cookie-migration.md` | 修改 | 保留完整历史，仅修正过期状态（C2b 已由 6e441ac4 提交推送） |
| `backend/.env.example` | 修改 | 新增 `TRUST_PROXY` 配置块及详细注释 |
| `backend/src/config/index.js` | 修改 | 新增 `resolveTrustProxy()`（node:net isIP + 纯数字 CIDR 前缀 + 空段 fail-fast）+ `config.trustProxy` |
| `backend/src/app.js` | 修改 | 新增 `app.set('trust proxy', config.trustProxy)` |
| `backend/src/utils/client-ip.js` | **新建** | 统一来源 IP 解析模块，所有消费者共享 |
| `backend/src/middleware/apiControl.js` | 修改 | `clientIp()` 改为导入自 `client-ip.js`；新增 `clearRateLimits()` |
| `backend/src/middleware/uploadQuota.js` | 修改 | `req.ip \|\| req.socket.remoteAddress` → 统一 `clientIp(req)` |
| `backend/test/proxy-trust.test.js` | **新建** | 代理信任全场景测试（34 项：16 配置校验 + 18 HTTP/审计/配额/可信链） |
| `backend/test/c2b-cookie-auth.integration.test.js` | 修改 | 移除 XFF 限流绕过（删除 `requestSequence` + `X-Forwarded-For` 伪造），添加 `clearRateLimits()` 调用 |
| `backend/test/auth-session.integration.test.js` | 修改 | 同上（移除 XFF 伪造 + `clearRateLimits()` 调用） |
| `backend/package.json` | 修改 | test 脚本加入 `test/proxy-trust.test.js` |
| `docs/116e-身份安全与权限矩阵.md` | 修改 | 实施记录更新：C2b 已提交 6e441ac4、C2c 完成 |
| `docs/进度总览.md` | 修改 | 116e 标为 ✅ 完成 |

### 设计选择

1. **统一来源解析（`client-ip.js`）**：`clientIp(req)` 只读 Express 验证后的 `req.ip`。全项目 `rg` 确认无其它来源 IP 自行解析。限流、审计日志、uploadQuota 全部导入同一个函数。

2. **`TRUST_PROXY` 配置模型**：
   - 使用 `node:net isIP()` 进行可靠校验，拒绝 999.999.999.999、10.0.0.1/99、::::、IPv6 /999 等非法值
   - 默认 `false`（直连安全）— 本地开发零配置
   - `true` 拒绝启动（fail-fast）
   - `loopback` — 快捷方式，用于本机 nginx/caddy
   - 显式 IP/CIDR 列表 — 生产部署精确控制

3. **测试隔离方案**：`clearRateLimits()` 为模块级导出，仅供测试使用，不暴露为 HTTP API。标注在 docstring 和测试中。

4. **代理信任测试设计（34 项）**：
   - 配置校验 16 项（含 999.999.999.999、/99、/999、::::、CIDR 非整数、空前缀 /+1/空格、空段仅逗号/尾逗号/双逗号）
   - HTTP 行为 18 项：默认直连限流精确键 + 伪造不同 XFF 限流 + traceId 轮询 OperationLog + clearRateLimits 隔离 + uploadQuota 真 HTTP + 4 种可信代理穿过主 App（loopback 受信/仅 10.0.0.1/混合链截断/全受信链）+ 2 种 OperationLog 端到端 + 恢复 false 后回归
   - 动态 import 隔离：先保存/设置环境变量，再 import，确保 Prisma 只连临时库
   - 可信代理测试使用主 App 服务器（`app.set('trust proxy', ...)` 临时切换），非自建 echo App
   - 只删除本测试精确创建的 testRoot

5. **回滚安全**：回滚方案已改：`TRUST_PROXY=false` 保留统一来源解析；不得恢复直接读取原始 XFF 或测试伪造 XFF 绕限流。

### 验证结果

- `npm test`：**69/69 pass**（auth-security 6 + PhaseB auth-session 9 + C2b 18 + proxy-trust 34 + 2 father）
- C2b 专项：**19/19 pass**（18 业务子场景 + 1 父 suite）
- Proxy 专项：**34/34 pass**（16 配置 + 3 默认直连 + 1 clearRL + 1 uploadQuota + 6 可信代理 + 1 恢复 + 6 父 suite）
- `node --check`：全部修改 src/ + test/ 文件通过
- `npm run build --prefix backend/admin`：构建成功
- `git diff --check`：仅 LF/CRLF 行尾警告（Windows 环境正常）
- `verify-all`：完整通过（Flutter 7 tests、Web build、后端 84 个 src JS check、backend tests、admin build）
- 正式数据库 `backend/data/village.db`：SHA256 / mtime / size 测试前后一致，未被测试写入
- 临时测试库 `prisma/.test-*`：零残留

### 仍存风险

1. 生产环境 TRUST_PROXY 配置遗漏：限流按代理 IP 聚合而非客户端 IP（好于信任伪造 XFF）。
2. `loopback` 模式对同机 SSRF 无额外防护。
3. `clearRateLimits()` 模块级导出，非 HTTP 端点，无外部调用风险。
