# 分段 16 — Flutter App 骨架 + 主题 + 路由

> 状态：✅ 完成

## 任务目标

搭建移动端 Flutter App 骨架：项目脚手架、田园主题、API 客户端、登录态、路由、底部导航与五大 Tab。

## 执行内容

### 1. 项目脚手架
- `flutter create app`，项目名 `farmlink`，包名 `com.farmlink`，平台 android + web（web 便于联调）
- Flutter SDK：C:\dev\flutter

### 2. 目录结构
```
app/lib/
├── main.dart                入口
├── core/
│   ├── constants.dart       色板 / API 地址 / 八大板块 / 角色
│   ├── theme.dart           田园绿主题（适老高对比）
│   ├── api_client.dart      HTTP + multipart + SSE，对接 {code,msg,data}
│   ├── auth_state.dart      登录态 Provider（token 持久化）
│   └── router.dart          go_router 路由表 + 登录守卫
├── models/user.dart         用户模型
├── widgets/common.dart      Loading/Empty/ErrorRetry/SectionTitle/AppCard/toast
└── pages/
    ├── splash/              启动页（动画 + 自动跳转）
    ├── auth/                登录 / 注册
    ├── home/                shell 底部导航 + 首页
    ├── agri / ai / service / profile  四个 Tab 页
```

### 3. 核心能力
- **API 客户端**：统一解析后端 `{ code, msg, data }`，非 200 抛 `ApiException`；支持 GET/POST/PUT/DELETE、图片 multipart 上传、SSE 流式
- **登录态**：`AuthState` Provider，token + user 持久化到 SharedPreferences
- **路由守卫**：go_router redirect —— 未登录跳登录页，已登录跳首页
- **底部导航**：首页 / 农事 / AI 助手 / 服务 / 我的 五 Tab（ShellRoute）

### 4. 界面
- 启动页：渐变背景 + Logo 动画
- 登录 / 注册：账号密码（对接后端 `/auth/login`、`/auth/register`）
- 首页：顶部问候 + 天气卡 + 常用功能宫格 + 八大板块入口
- 服务大厅：八大板块卡片网格
- 我的：用户信息 + 功能菜单 + 退出登录
- 农事 / AI：占位页（板块功能页于分段 17+ 实现）

### 主题
田园绿主调（`#3D8B40`）+ 丰收金点缀，浅米绿背景，大字体高对比，适配适老需求。

## 验证

`flutter analyze lib`：**0 错误 0 警告**（仅 11 条 const/withOpacity info 级提示）。
APK 构建验证通过。

## 配置提示

比赛现场需修改 `app/lib/core/constants.dart` 的 `kBaseUrl` 为后端笔记本局域网 IP。

## 下一步

分段 17：Flutter App 各板块功能页面（农事 / AI / 服务等）
