# 分段 93 —「我的」页 hero 渲染真实头像与背景横幅

> 用户反馈：「我的」页顶部 hero 没有渲染用户在「编辑资料」里设置的头像和背景横幅，仍是默认小人 + 绿渐变。本段让 hero 接入 `avatarUrl` / `bannerUrl`。

## 一、目标

- 「我的」页 hero：有 `bannerUrl` 时铺真实横幅图（加深绿渐变遮罩保证白字可读）；有 `avatarUrl` 时显示真实头像；都没有时回落到原观感（主绿渐变 + 昵称首字/人像）。

## 二、背景

- `User` 早已有 `avatarUrl` / `bannerUrl`（分段 84/85），「个人界面」`account_page` 用共享组件 `ProfileBanner` / `ProfileAvatar`（`settings/profile_media.dart`，内置 `ApiClient.resolveImageUrl` + 失败回落）正常渲染。
- 但 `profile_page.dart` 的 `_profileHero` 写死了 `AppColors.heroGradient` 背景 + 白环 `Icon(Icons.person)`，从未读取 `avatarUrl` / `bannerUrl` → 用户设置了也不显示。

## 三、改动

文件：`app/lib/pages/profile/profile_page.dart`（仅 `_profileHero`）

- 新增 `import 'settings/profile_media.dart'`，复用 `ProfileAvatar`（不再自绘白环小人）。
- hero `Container`：`clipBehavior: Clip.antiAlias`；`gradient` 改为「有横幅则 null（让图打底）/ 无横幅回落 `heroGradient`」。
- 背景层 `Stack`：`hasBanner` 时叠 `Image.network(resolveImageUrl(bannerUrl), fit: cover, errorBuilder→主绿渐变)` + 一层深绿渐变遮罩（`0xD9` 约 85% 不透明）保证白字/等级条/徽标可读；原 padding 内容（水印 + Row）整体上移为 `Stack` 的前景层。
- 头像：`ProfileAvatar(url: user.avatarUrl, initial: 昵称首字, size: 64)` —— 有头像显示头像，无头像显示昵称首字（如「李」），再兜底人像图标。

## 四、契约

- 数据来源不变：`avatarUrl` / `bannerUrl` 来自 `GET /user/profile`（`auth.refreshProfile()` 进页刷新，`context.watch<AuthState>` 更新即重建，编辑资料后回到本页即生效）。
- 图片 URL 走 `ApiClient.resolveImageUrl`（与 account_page 一致，支持 `/uploads` 相对路径）；加载失败回落渐变/首字，不崩。
- 无后端改动、无新增路由、无新组件。

## 五、验收

- `dart format` + `flutter analyze lib/pages/profile/profile_page.dart` → `No issues found!`。
- `flutter build web --no-web-resources-cdn --no-tree-shake-icons` → 成功。
- ⚠️ 浏览器实测本轮因 Playwright 断连未做；复用的是 account_page 已验证的 `ProfileAvatar`/`ProfileBanner` 同款组件与 URL 解析，可信度高。建议用已设置头像/横幅的账号（如 李响）开「我的」页确认 hero 显示真实头像 + 横幅图；未设置的账号显示昵称首字 + 绿渐变。

## 六、不在范围内

- 不改「个人界面」account_page / 编辑资料页 / 上传接口。
- 不改概览卡 / 入口卡 / 数据同步 / 我的事务区。

## 七、实施备注

- 横幅遮罩用深绿（`0xD92E7D32`→`0xD90D631B`）而非纯黑，保持品牌绿调统一、且白字可读。
- `bannerUrl` 经 `hasBanner` 判定后分析器已提升为非空，`resolveImageUrl(bannerUrl)` 不需 `!`。

## 八、追加（2026-06-17 hero 精修）

用户反馈横幅太矮、内容没垂直居中、头像略小，连续微调（均在 `_profileHero`）：

- hero `Container` 加 `constraints: BoxConstraints(minHeight: 168)`——原高度仅由头像行撑起（≈108），横幅图被压矮。
- `Stack` 改 `alignment: Alignment.centerLeft` 让内容垂直居中；内容 padding 底部 `22→46` 补偿概览卡叠压的 24px，使其在**可见区域**内观感居中（否则真居中会偏低）。
- 头像 `ProfileAvatar(size: 64→76)`。
- `flutter analyze` 通过；像素值（168/76）凭真机观感，用户可再调。
