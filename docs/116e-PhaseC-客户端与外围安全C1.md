# 116e Phase C1 - 客户端与外围安全（凭据生命周期/管理台 stopgap）

> 关联主工单：[116e-身份安全与权限矩阵.md](116e-身份安全与权限矩阵.md)
> 实施时间：2026-08-02

## 工单边界确认

本批不做“半套 Cookie”。Flutter 先把 access/refresh 的本地生命周期收口到系统安全存储；管理台先删掉未参与续期的 refresh 明文、阻断调试器外带凭据、把退出改成先撤销服务端会话再清本地。完整 HttpOnly Cookie / CSRF / Origin / 多标签页 rotation 作为下一批一次性切换门槛，不在本批切半改。

## 已完成

### Flutter

- 新增 `flutter_secure_storage`，凭据统一写入单一 JSON 安全键。
- Android `allowBackup=false`，避免备份把令牌带出设备。
- 旧 `SharedPreferences` 明文 `token/accessToken/refreshToken/refresh_token` 支持迁移：
  - 首先读取安全存储；
  - 安全存储存在则立即删除旧明文键；
  - 旧值迁移只在安全写成功后删除旧键，写失败保留旧值供下次迁移重试。
- `AuthState` 改为注入式凭据存储，init/login/refresh/logout 全部走新的存储接口。
- `ApiClient` 增加：
  - access 快照发送；
  - 单飞 refresh 去重；
  - 旧 401 late response 不重复 rotation；
  - refresh 失败后清 session；
  - `postBytes` / multipart / SSE 统一走同一刷新链。
- Web 预览不再落 localStorage，改为页面生命周期内存态。

### 管理台 stopgap

- refresh 不再写入 localStorage。
- `rawRequest` 对外部绝对 URL 不自动附带管理 token，避免 API 在线调试把管理凭据带到外部地址。
- 401 过期态回跳到 `/admin/login?reason=expired`，登录页展示明确提示。
- 退出改成：原始请求撤销服务端会话成功后再清本地 token/user，并回到 `/admin/login?reason=logout`。
- 非管理员登录先撤销刚创建的会话，再清本地并报错，不保留半套登录态。
- 用户菜单改为 click 触发，确保退出入口可稳定操作。

## 后续 Cookie 契约

下一批如果切完整 Cookie，必须一次性完成：

1. 管理台专用认证端点与同源 Cookie 策略。
2. refresh 使用 HttpOnly + Secure + SameSite cookie。
3. access 仅内存保存，刷新后更新单飞状态。
4. CSRF / Origin / Referer 校验到位。
5. CORS allowlist 与代理来源信任同步收口。
6. 多标签页 rotation 与启动恢复有一致契约。
7. 禁止留下“refresh 明文已删，但 cookie 方案只做一半”的半成品。

## 验证

- `C:\dev\flutter\bin\flutter.bat analyze lib`
- `C:\dev\flutter\bin\flutter.bat test`
- `C:\dev\flutter\bin\flutter.bat build web --debug --pwa-strategy=none`
- `npm run build --prefix backend/admin`
- `scripts/verify-all.ps1`
- 真实浏览器截图：
  - 登录失效提示页
  - 管理台 dashboard
  - 退出后返回登录页

## 备注

- 本批没有数据库结构变更。
- 后续 Phase C2 再做 CORS allowlist、代理来源信任、日志脱敏复核和上传安全。
