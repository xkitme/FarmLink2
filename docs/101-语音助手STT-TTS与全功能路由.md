# 分段 101 — 语音助手 STT / TTS 与全功能路由

> 执行日期：2026-06-19

## 一、目标

- 修复 APK 内语音助手一直聆听但不出识别文字的问题。
- 严格保证 AI 回复先朗读完成，再重新打开麦克风。
- 让朗读内容与屏幕最终显示内容一致。
- 把所有现有静态功能页纳入 AI 助手安全路由白名单。

## 二、改动

### STT

- 保持这套 2023 streaming Zipformer 模型要求的 `modelType: zipformer`。
- 录音显式使用 Android 普通 `MIC`，关闭蓝牙接管、回声消除和降噪；TTS 已串行，
  不再需要可能压低虚拟麦克风人声的效果链。
- 手动停止录音时调用 sherpa `inputFinished()` 并完成尾音解码，避免短句最后一段
  尚未输出就释放 stream。

### TTS 与屏幕一致性

- `TtsService` 新增 `speakAndWait`，通过 completion / cancel / error 回调的
  `Completer` 等待系统 TTS 真正结束，不依赖模拟器上可能提前返回的 Future。
- 助手先执行命令并得到最终屏幕文案，再朗读 `_replyMarkdown`；朗读完成后才恢复监听。
- 后端 `speakText` 与 `replyMarkdown` 使用同一内容源，避免模型生成两套不同文案。

### AI 助手路由覆盖

- `open_page` 白名单由 8 个入口扩展到全部现有静态功能页：全部服务、搜索、AI、
  集市/订单、农机、政策、灾害、农业、拍照识病、乡村生活、数据、IoT、发布、消息、
  个人中心及全部设置子页、村级数字驾驶舱等。
- 后端向模型提供 `availableRoutes`，并要求对语音转写的同音/近音错字结合真实功能名纠正。
- 商品详情、下单、支付等动态或写操作继续使用独立白名单命令，不允许模型任意提交。

## 三、验收

- `flutter analyze lib`：No issues found。
- `flutter test`：All tests passed（1 项）。
- 两个后端服务文件 `node --check` 通过。
- 助手接口实测“打开农业生产”返回 `open_page {routeKey: agri}`，且
  `replyMarkdown == speakText`。
- Android 11 x86_64 模拟器实测：普通 MIC 以 16 kHz 单声道启动，STT 已产生文字；
  扬声器回灌测试把“打开农业生产”识别为近音“充电生产”，证明识别链路不再为空。
- release APK 构建、覆盖安装、冷启动通过，应用进程存活，crash buffer 为空。
- 产物：`dist/FarmLink.apk`，SHA-256
  `6E9239697707085C8D25513E9DA8E9421F722054BAFCFA3472C58620B427F513`。

## 四、实施备注

- 曾尝试按新版示例切 `zipformer2`，原生日志明确报模型缺少 `query_head_dims` 并退出；
  该模型必须使用 `zipformer`，最终版本已恢复正确配置。
- 虚拟机需保持宿主麦克风输入开启；真实人声效果应优于“扬声器播放再由麦克风回灌”的测试。
