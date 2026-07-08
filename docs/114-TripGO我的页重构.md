# 114 - TripGO 我的页重构

## 背景

用户要求按 TripGO 的“我的”页重构 FarmLink 的“我的”页面。参考来源为本地只读参考仓库：

- `.runtime/reference/TripGo2---Reload/frontend/app/(tabs)/mine.tsx`

本次只复刻视觉结构和交互层级，不复制 TripGO 源码或图片资产；FarmLink 既有数据来源、后端接口、路由入口保持不变。

## 改动

- `app/lib/pages/profile/profile_page.dart`
  - 头部改为 TripGO 式绿色个人中心：顶部标题与通知/设置入口、头像昵称、等级徽标、角色/村庄徽标、成长值进度条。
  - 修复重构过程中的 Web 渲染崩溃：`Stack` 子节点全部 `Positioned` 后必须给 hero 明确高度，避免 `RenderBox was not laid out` 连锁异常。
  - “我的订单”从两张大入口卡改为 TripGO 式白色分区卡，提供待付款、待发货、待收货、已完成、售后 5 个快捷入口。
  - “我的发布”改为同款分区卡，提供我的发布、农事记录、互动消息、个人资料 4 个快捷入口。
  - 原“我的事务”不规则三栏改为“更多服务”四列宫格，包含政策申请、数据看板、农事记录、灾情记录、农机服务、消息通知、适老模式、设置。
  - 保留数据同步卡，位置调整到订单/发布分区之后，避免业务入口丢失。

## 验证

- `dart format lib\pages\profile\profile_page.dart`
- `flutter analyze lib/pages/profile/profile_page.dart`
- `flutter build web --pwa-strategy=none --no-web-resources-cdn --dart-define=FARMLINK_API_BASE_URL=http://localhost:8000`
- `flutter analyze lib`
- `flutter test`
- CDP 隔离 Chrome 实测：
  - 使用 `farmer / 123456` 登录接口 token 注入 Web 登录态。
  - 进入 `http://localhost:5000/?v=tripgo-ui-profile-cdp4#/profile`。
  - 首屏截图：`.runtime/profile-cdp.png`。
  - 下滑截图：`.runtime/profile-cdp-scrolled.png`。
  - 未捕获 `EXCEPTION CAUGHT`、`Null check`、`RenderBox`、`RenderFlex overflowed` 等 Flutter 异常事件。
