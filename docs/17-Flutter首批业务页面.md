# 分段 17 — Flutter App：首批业务功能页面

> 状态：✅ 完成
> 执行时间：2026-05-22
> UI 约束：严格遵循 `docs/设计参考.md` 的 Agro-Modernist Tech 设计系统。

## 本次任务目标

在 P16 Flutter 骨架基础上，补齐首批可运行业务页面，让移动端不再只停留在框架和占位：

- 首页增加八大板块核心服务入口。
- 新增惠农政策页面，对齐设计稿 `_3`。
- 新增乡村集市页面，对齐设计稿 `_4`。
- 新增农机共享页面，对齐设计稿 `_5`。
- 新增路由，使这些页面可从首页服务入口打开。

## 设计执行要求

本次所有新增页面沿用 `docs/设计参考.md`：

- 主色：叶绿 `#0D631B`
- 主容器：`#2E7D32`
- 次色：大地棕 `#7A5649`
- 麦金强调：`#FFBA38`
- 背景：`#F9F9F9`
- 卡片：白底、16px 圆角、柔和棕调环境光阴影
- 大容器：32px 圆角
- 按钮：胶囊形
- AI / 智能质检类卡片使用麦金或绿色强调
- 高对比、大触控目标，适配田间户外使用

## 实现内容

### 1. 首页核心服务入口

修改：

```text
app/lib/pages/home/home_page.dart
```

新增：

- “核心服务”区块。
- 八大板块入口卡片：
  - AI 农业生产
  - 流通销售
  - 农机共享
  - 气象灾害
  - 惠农政策
  - 乡村生活
  - 数据管理
  - AI 助手
- 已接入跳转：
  - `market` → `/market`
  - `machinery` → `/machinery`
  - `policy` → `/policy`
  - `ai/agri` → `/ai`
  - `life` → `/publish`
  - `data` → `/messages`

### 2. 惠农政策页面

新增：

```text
app/lib/pages/policy/policy_page.dart
```

页面能力：

- 顶部三段切换：
  - 惠农政策
  - 党建学习
  - 文明乡风
- 政策卡片列表：
  - 图片
  - 标题
  - 摘要
  - 发布时间
  - 标签
- 使用设计稿 `_3` 的政策新闻视觉：白底卡片、左侧图片、右侧大标题、底部标签。

使用资产：

```text
assets/images/_3_1.jpg
assets/images/_3_2.jpg
assets/images/_3_3.jpg
assets/images/_1_2.jpg
```

### 3. 乡村集市页面

新增：

```text
app/lib/pages/market/market_page.dart
```

页面能力：

- 顶部胶囊搜索框。
- 分类筛选：
  - 全部
  - 当季水果
  - 有机蔬菜
  - 土特产
- 商品双列网格：
  - 商品图
  - 标签
  - 标题
  - 价格
  - 卖家
  - 加入购物按钮
- 底部悬浮合计栏。

使用资产：

```text
assets/images/_4_1.jpg
assets/images/_4_2.jpg
assets/images/_4_3.jpg
assets/images/_4_4.jpg
```

### 4. 农机共享页面

新增：

```text
app/lib/pages/machinery/machinery_page.dart
```

页面能力：

- 卫星田块背景图。
- 顶部胶囊搜索框。
- 农机类型筛选。
- 地图点位标记。
- 底部农机详情卡：
  - 农机图片
  - 型号
  - 认证标识
  - 评分
  - 价格
  - 机手信息
  - 联系按钮
  - 预约时间
  - 立即预约按钮

使用资产：

```text
assets/images/_5_1.jpg
assets/images/_5_2.jpg
```

### 5. 路由接入

修改：

```text
app/lib/core/router.dart
```

新增 Shell 内路由：

```text
/market
/machinery
/policy
```

## 验证结果

### 依赖修复

首次执行 `dart format` 时，本机 Pub 缓存缺失 `flutter_lints` 配置文件，因此先执行：

```bash
flutter pub get
```

结果：依赖恢复成功。

### 格式化

执行：

```bash
dart format lib
```

结果：格式化完成。

### 静态分析

执行：

```bash
flutter analyze lib
```

结果：

```text
No issues found!
```

### Web 构建

执行：

```bash
flutter build web
```

结果：构建成功，产物生成于：

```text
app/build/web
```

Flutter Web 构建提示 `CupertinoIcons` 字体未找到，但项目代码未引用 `CupertinoIcons`，且构建成功，不影响当前页面。

### 浏览器检查

启动：

```bash
node app/serve_web.mjs
```

访问：

```text
http://localhost:5000
```

结果：

- 启动页正常渲染。
- 登录页正常渲染。
- 设计资产正常加载。
- 新增页面已通过 Flutter 编译、路由注册和 Web 构建验证。

## 产出文件

- `app/lib/pages/policy/policy_page.dart`
- `app/lib/pages/market/market_page.dart`
- `app/lib/pages/machinery/machinery_page.dart`
- `app/lib/pages/home/home_page.dart`
- `app/lib/core/router.dart`
- `docs/17-Flutter首批业务页面.md`
- `docs/进度总览.md`

## 下一步

分段 18：Flutter App 业务能力联调。

重点目标：

- 把政策、集市、农机页面从静态预置数据切换为后端 API 数据。
- 接入离线缓存兜底。
- 为 AI 问答、病害识别、农机预约、商品下单补交互闭环。
