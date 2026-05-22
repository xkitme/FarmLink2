# 分段 25 — Flutter 农机共享修复与服务页接入

## 本次目标

读取 `docs/进度总览.md` 与 `docs/设计参考.md` 后，先检查当前未提交的农机共享相关改动，修复影响运行与编译的断点，并延续「Agro-Modernist Tech」移动端视觉规范。

## 发现的问题

1. `app/lib/core/router.dart` 已引入 `MachineryServicePage`，但没有注册 `/machinery/service` 路由，导致农机页右上角入口不可达，并触发 Flutter unused import。
2. `app/lib/pages/machinery/machinery_service_page.dart` 是新增页面，但尚未纳入路由闭环。
3. `app/lib/pages/disaster/disaster_page.dart`、`app/lib/pages/market/market_service_page.dart` 存在 lint 问题，`flutter analyze` 会失败。
4. Flutter 界面里仍有开发过程文案，不符合正式成品口径。

## 完成内容

- 在 `router.dart` 中接入 `/machinery/service`，使农机共享页右上角「农机服务」按钮可以进入服务页。
- 保留并整理 `machinery_service_page.dart`：维保提醒、故障诊断、成本核算、作业轨迹、土地流转、农机投保、机手认证均对接已有本地后端 API，并支持离线同步队列兜底。
- 清理 Flutter lint：灾害页 const 构造、流通销售服务页字符串插值与控制流花括号。
- 将界面中的开发过程文案调整为正式成品表达：例如语音问答提示改为「语音问答正在接入本地识别服务」。
- 清理管理台源码和早期 docs 中的临时场景口径，统一改为「本地运行」「离线可用」「业务验证」「测试账号」等正式成品表达。

## 涉及文件

- `app/lib/core/router.dart`
- `app/lib/pages/machinery/machinery_page.dart`
- `app/lib/pages/machinery/machinery_service_page.dart`
- `app/lib/pages/disaster/disaster_page.dart`
- `app/lib/pages/market/market_service_page.dart`
- `app/lib/pages/ai/ai_page.dart`
- `app/lib/widgets/common.dart`
- `backend/admin/src/apiCatalog.js`
- `backend/admin/src/pages/ApiSwitchPage.jsx`
- `backend/admin/src/pages/OperationLogPage.jsx`
- `backend/admin/src/pages/Placeholder.jsx`
- 早期 docs 中的产品口径修订

## 验证记录

- `C:\dev\flutter\bin\flutter.bat analyze lib`：通过，No issues found。
- `C:\dev\flutter\bin\flutter.bat build web --pwa-strategy=none`：通过，已生成 `app/build/web`。
- `npm run build:admin`：通过，Vite 构建成功；仅保留大 chunk 体积提示，不影响运行。
- `node --check backend\src\server.js`：通过，无语法错误输出。
- 成品口径文案检查：无临时开发背景相关文案残留。
- 浏览器验证：`http://localhost:5000/#/machinery` 可正常渲染；`/machinery/service` 受登录守卫保护，未登录状态会回到登录页。

## 下一步

进入分段 26，继续按 `docs/设计参考.md` 补齐惠农政策、乡村生活等剩余 Flutter 板块，并继续保持本地离线运行闭环。
