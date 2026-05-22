# 分段 27 — Flutter 登录注册体验修复

## 本次执行前读取

- 已读取 `docs/进度总览.md`，确认最近完成到分段 26，后续移动端仍按 Flutter 继续补齐。
- 已读取 `docs/设计参考.md`，本次界面继续沿用 Agro-Modernist Tech：农田视觉资产、白色底部面板、叶绿主按钮、棕色描边次按钮、32px 大容器圆角。

## 本次完成内容

1. 登录页去除替代登录方式区块。
2. 删除登录页第三方登录圆形图标按钮与未开通提示。
3. 登录页新增清晰的“注册账号”描边按钮，并保留“没有账号？立即注册”文字入口。
4. 注册页升级为完整账号注册页：
   - 顶部农田图与品牌区，保持与登录页统一。
   - 底部白色表单面板，使用大圆角与柔和环境光阴影。
   - 表单包含昵称、手机号/账号、密码、确认密码。
   - 增加密码长度校验与两次密码一致校验。
   - 增加密码显示/隐藏按钮。
   - 注册成功后保持原有登录态写入，并进入首页。
   - 提供“已有账号，返回登录”入口。

## 涉及文件

- `app/lib/pages/auth/login_page.dart`
- `app/lib/pages/auth/register_page.dart`
- `docs/进度总览.md`

## 校验记录

- `dart format app/lib/pages/auth/login_page.dart app/lib/pages/auth/register_page.dart`：通过。
- `flutter analyze lib`：通过。
- `flutter build web --pwa-strategy=none`：通过。
- `node --check backend/src/server.js`：通过。
- 构建产物启动临时静态服务后，已检查 `/auth/login` 与 `/auth/login/register` 路由加载。

## 备注

本次仅调整 Flutter 端账号入口与注册体验，不修改后端接口；继续复用已有 `/api/v1/auth/register` 与 `/api/v1/auth/login`。
