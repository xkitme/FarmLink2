# 分段 86 — APK 上机部署排查 + 模拟器适配 + 启动体验修复

> 一批围绕「把 App 打成 APK、装进比赛用模拟器跑起来」过程中暴露的问题与修复。
> 涉及部署文档、APK 打包、ABI/渲染器适配、启动广告与协议流程、重复按钮、滚动条。

## 一、目标

让 APK 在比赛用的 Android 模拟器上**能装、不闪退、UI 正常、启动流程顺**，并把
部署踩坑沉淀进 README，避免换机再犯。

## 二、改动与背景（按问题逐条）

### 1. 服务器 `/user/growth` 500 + README 部署说明
- **现象**：远端 `D:\FarmLink` 报 `PrismaClientValidationError: Unknown field 'growth'`，
  `/user/growth`、`/user/profile` 500。
- **根因**：拉了带 `growth`/`bannerUrl` 的新代码，但**没同步数据库结构 / 没重生成 Prisma 客户端**。
- **修复**：`README.md` 新增「六.4 更新代码后必读」：停后端 → `cd backend && npm run db:push`
  （补列 + 自动 generate）→ 重启；并说明本项目用 `db:push` 维护、勿用 `migrate deploy`
  （无迁移基线会重建已存在表而失败）；常见报错块加交叉引用。
- **App 侧加固**：`profile_page.dart` 的 `/user/growth` 改为**独立容错拉取**——它失败只让
  hero 等级条降级，不再拖垮整个「我的」页加载。

### 2. APK 打包
- `scripts/build-apk.ps1 -ApiBaseUrl http://<IP>:8000 -Mode release`，产物 `dist/FarmLink.apk`。
- 后端地址经 `--dart-define=FARMLINK_API_BASE_URL` 写死进包。最终 IP 为 **`10.178.46.24`**
  （中途误用 `.45`，已纠正重打）。

### 3. 32 位 x86 模拟器闪退 → 换 x86_64
- **现象**：Pixel 2 模拟器一启动闪退；logcat：
  `UnsatisfiedLinkError: ... libflutter.so is for EM_ARM (40) instead of EM_386 (3)`。
- **根因**：该 AVD 是 **32 位 x86** 镜像（`abilist=x86,armeabi-v7a,armeabi`）；Flutter 早已
  砍掉 32 位 x86，APK 只含 `arm64-v8a/armeabi-v7a/x86_64`，x86 进程加载不了 ARM 的 .so。
- **解法**：装 `system-images;android-30;google_apis_playstore;x86_64`、建 `Pixel2_x64`
  AVD（同 Pixel 2、API 30，但 64 位）→ APK 的 x86_64 原生匹配，跑通。**无法靠改 APK 修**。
- **License 坑**：命令行喂 `y` 在 Win 上传不进 Java 进程，改为直接写 `licenses/` 哈希文件
  （含 `intel-android-extra-license`）再 `sdkmanager` 安装。

### 4. Impeller→Skia：模拟器上渐变 hero 渲染失败（发白）
- **现象**：「我的」页绿色渐变 hero 在模拟器上不渲染、白字白头像看不见（网页版正常）。
- **根因**：模拟器用 **SwiftShader 软件 GPU**，Flutter 默认 **Impeller** 渲染器画不出渐变/阴影
  （logcat 刷屏 `Impeller validation: ... invalid command to the render pass`）。
- **修复**：`AndroidManifest.xml` 加 `io.flutter.embedding.android.EnableImpeller=false`，
  回退 Skia（软件 GPU 上稳）。重打包后 hero 正常渲染。

### 5. 启动广告页：未登录时「跳过」按钮闪现
- **现象**：未登录首启，跳过按钮先出现一帧 → 消失 → 弹服务协议。
- **过程**：先改成「未登录直接进协议、不渲染广告」；用户反馈「不渲染广告图怪」，
  最终定为——**广告图照常渲染作背景**，未登录时不启动倒计时、不渲染「跳过」按钮
  （新增 `_countdownActive` 门控），服务协议弹窗直接浮在广告图上。

### 6. 去重复按钮
- 编辑资料页有两个保存（顶栏「保存」+底部「保存修改」）：删顶栏那个，留底部。
- 退出登录有两处（我的页 + 设置页）：删我的页那个，统一走设置页退出。

### 7. 协议模态框滚动条常显 + 可拖拽
- **现象**：APK 里协议弹窗滚动条不显示、拖不动（同意按钮需读到底才激活）。
- **修复**：`agreement_dialog.dart` 的 `Scrollbar` 加 `thumbVisibility:true` + `interactive:true`
  + `thickness:6` + 圆角，常显且可手动拖。

## 三、影响文件

```
README.md                                              # 部署说明(六.4)
app/lib/pages/profile/profile_page.dart                # growth 容错 + 删退出登录
app/lib/pages/profile/settings/account_edit_page.dart  # 删顶栏保存
app/lib/pages/ad/startup_ad_page.dart                  # 广告图保留+不闪跳过
app/lib/widgets/agreement_dialog.dart                  # 滚动条常显可拖
app/android/app/src/main/AndroidManifest.xml           # 关 Impeller
```

> ABI/镜像/AVD 属本机环境配置，不入库（仅记录于本 doc）。

## 四、验收

- `flutter analyze lib` 全过；各 APK 重打包 `exit 0`。
- 模拟器（**必须 x86_64**，本机建 `Pixel2_x64`）实测：
  - 不再 `UnsatisfiedLinkError` 闪退，进程存活、UI 正常。
  - 「我的」hero 绿色渐变正常渲染（Impeller 已关，无 `render_pass` 报错）。
  - 未登录首启：广告图作背景 + 协议弹窗浮其上 + **无跳过按钮**。
  - 协议弹窗右缘**常显圆角滚动条**（裁图放大确认），可拖。
  - 「我的」页无退出登录；编辑资料页无顶栏保存、只底部「保存修改」（网页版同码确认）。
- 后端：远端按 README「六.4」`db:push` 后 `/user/growth` 恢复 200。

## 五、不在范围内

- **比赛环境若仍是 32 位 x86 模拟器**：任何 Flutter 包都跑不了，需主办方换 64 位镜像/真机。
- 关 Impeller 对真机略损动画顺滑度，但换稳定 Skia——模拟器场景下是正确取舍。
- 成长值「自动累加规则」仍未做（用户说后面再加）。

## 六、实施备注

- IP 几经反复：最终 `10.178.46.24`。换 IP 只需 `build-apk.ps1 -ApiBaseUrl http://<IP>:8000` 重打。
- 模拟器 SwiftShader 下 adb 盲点击很不稳（文字常输不进、易误触发系统搜索）；故第 6 项
  用**网页版**（同码、可注入登录态）截图确认。
- 相关提交：`4fa37364`（growth 容错）/ `eb873c5f`（Impeller）/ `aeaa18de`+`2a4e121e`（广告页）/
  `00484275`（去重复按钮）/ `19636e70`（滚动条）/ `90fecdd2`（README）。
