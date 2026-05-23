# 分段 28 — Flutter 乡村生活服务页补齐

## 本次执行前读取

- 已读取 `docs/进度总览.md`，确认分段 28 为乡村生活等板块继续补齐。
- 已读取 `docs/设计参考.md`，页面继续沿用 Agro-Modernist Tech：农田视觉资产、白色卡片、叶绿主按钮、棕色描边次按钮、柔和环境光阴影。

## 本次完成内容

1. 新增 Flutter 页面 `app/lib/pages/life/life_page.dart`。
2. 新增 `/life` 路由，并把首页“乡村生活”入口从 `/publish` 调整为 `/life`。
3. 生活服务页覆盖 12 个模块入口与交互：
   - 村医在线问诊
   - 快递代收站
   - 水电气缴费
   - 养老关爱服务
   - 就业信息平台
   - 农业贷款服务
   - 子女教育辅导
   - 乡村旅游推广
   - 邻里互助
   - 二手交易市场
   - 民俗文化记录
   - 环境问题举报
4. 页面首屏聚合后端生活服务数据：
   - `/life/clinic/list`
   - `/life/express/list`
   - `/life/tourism/list`
   - `/life/job/list`
   - `/life/loan/products`
   - `/life/help/list`
   - `/life/secondhand/list`
   - `/life/folk/list`
   - `/life/elder/services`
5. 增加离线缓存 `life:service-home`，后端不可用时优先回显最近一次生活服务数据。
6. 写操作沿用离线同步队列：
   - 问诊、养老打卡、招工、旅游、互助、二手、民俗、环境举报均可在离线时入队。
7. AI/智能类交互接入现有后端：
   - 岗位智能匹配 `/life/job/match`
   - 贷款资质预评估 `/life/loan/assess`
   - 教育答疑 `/life/edu/ask`
   - 旅游推广文案 `/life/tourism/promote`

## 涉及文件

- `app/lib/pages/life/life_page.dart`
- `app/lib/core/router.dart`
- `app/lib/pages/home/home_page.dart`
- `docs/进度总览.md`

## 当前校验记录

- `dart format app/lib/pages/life/life_page.dart app/lib/core/router.dart app/lib/pages/home/home_page.dart`：通过。
- `flutter analyze lib`：通过。
- `flutter build web --pwa-strategy=none`：通过。
- `node --check backend/src/server.js`：通过。
- `http://localhost:5004/` 本地静态服务状态：HTTP 200。

## 下一步

继续做后续板块体验优化与联调，包括路由可达性、页面视觉细节、离线缓存一致性和本地构建产物验证。
