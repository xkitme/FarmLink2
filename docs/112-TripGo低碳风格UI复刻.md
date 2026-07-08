# 112 · TripGo 低碳风格 UI 复刻

## 目标

按用户给定参考仓库 `Rw0ter/TripGo2---Reload` 的视觉方向，对田园通 Flutter App 做一轮主界面样式重构：

- 把全局色板从原 Agro-Modernist 强农业绿，调整为低碳旅行感的柔和森林绿 + 米色背景。
- 首页复刻参考项目的沉浸式绿色头部、搜索胶囊、天气/问候卡、整块服务宫格与凸起发布按钮。
- 我的页复刻参考项目的深绿沉浸式 hero、白色浮层统计卡和入口卡。
- 保留田园通现有业务结构、路由、数据接口与中文产品语义，不复制参考项目代码和素材。

## 参考与边界

- 参考项目：`https://github.com/Rw0ter/TripGo2---Reload/`
- 本地只读参考目录：`.runtime/reference/TripGo2---Reload/`
- 参考仓库未发现 LICENSE 文件；前端/后端 `package.json` 均为 `private: true`。因此本次只做视觉语言复刻，不拷贝源代码、图片、图标素材或文案实现。
- 复刻范围限定在 Flutter App 的全局 token、首页、我的页、底部导航和通用搜索/标题组件；后台、认证页与深层业务页不在本轮大改范围内。

## 改动

1. **全局设计 token**
   - `app/lib/core/constants.dart`
   - 主色改为 `#386641`，补齐 `#52B788`、`#40916C`、`#2D6A4F`、`#D8F3DC` 等低碳绿层级。
   - 背景改为 `#F4F1E4`，文字/描边改成暖灰棕，圆角新增 `R.pill`。
   - hero 渐变与按钮渐变改为森林绿到薄荷绿，阴影改成参考项目接近的柔黑环境光。

2. **主题与通用组件**
   - `app/lib/core/theme.dart`
   - `app/lib/widgets/common.dart`
   - AppBar、输入框、按钮、Chip 统一收敛到 16px 圆角 / 胶囊搜索框 / 低饱和描边。
   - `FarmAppBar` 图标从农机改为叶片，标题字号降低、字重提高。
   - `AppSearchField` 改成白底胶囊 + 阴影 + 圆形搜索按钮。

3. **首页**
   - `app/lib/pages/home/home_page.dart`
   - 移除传统 AppBar，新增全宽绿色渐变 hero：居中「发现」、弱化品牌名、右侧通知入口。
   - 搜索框放入 hero；问候天气卡叠在 hero 内。
   - 主内容用米色背景上移压住 hero 底部，决策卡改绿色渐变。
   - 核心服务从 8 个独立卡片改成一张白色大卡内的 4 列图标宫格。

4. **底部导航**
   - `app/lib/pages/home/shell_page.dart`
   - 底栏改为平直白底 + 顶部柔阴影。
   - 中间「发布」改为凸起渐变按钮，贴近参考项目的主行动样式。
   - 激活态去掉旧胶囊底色，改为图标/文字颜色切换。

5. **我的页**
   - `app/lib/pages/profile/profile_page.dart`
   - 移除传统 AppBar，个人信息区改为全宽沉浸式 hero。
   - 顶部加入「个人中心」与通知/设置图标；横幅图加深色渐变遮罩保证白字可读。
   - 统计卡、订单/发布入口、同步卡、事务区整体上移叠压 hero。

## 验收

- `dart format lib\core\constants.dart lib\core\theme.dart lib\widgets\common.dart lib\pages\home\shell_page.dart lib\pages\home\home_page.dart lib\pages\profile\profile_page.dart`：通过。
- `flutter analyze lib`：`No issues found`。
- `flutter test`：`All tests passed`。
- `flutter build web --debug --pwa-strategy=none`：通过。
- 本地 Web：`node app/serve_web.mjs` → `http://localhost:5000`。
- 浏览器实测 411×731：
  - 首页绿色 hero、搜索胶囊、问候卡、核心服务宫格、凸起发布按钮正常渲染。
  - 我的页沉浸式 hero、浮层统计卡、入口卡和底部导航正常渲染。

## 实施备注

- 本次属于视觉样式大重构，刻意不碰业务接口、状态管理和深层功能页，降低回归面。
- 参考项目是 Expo / React Native / NativeWind，田园通是 Flutter；复刻采用抽取视觉 token 与布局结构的方式完成，而不是移植实现。
- 旧 `Agro-Modernist Tech` 仍保留为历史设计系统说明；从本段起，移动端主界面视觉以 `TripGo 低碳风格覆盖说明` 为准。
