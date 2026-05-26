# 分段 37 — Flutter 主路径产品口径与集市详情优化

## 本次目标

继续推进 Flutter App 后续板块体验优化与联调，集中处理主路径中仍残留的开发视角文案，并补强乡村集市商品查看体验。

## 问题定位

1. 集市与农机主路径在服务数据更新时仍会出现“内置”“后端”等开发口径文案。
2. 政策页面加载态存在“正在从后端同步...”文案，不符合正式产品表达。
3. 乡村集市商品卡片点击后只弹轻提示，缺少可查看的商品详情层。
4. 农机样例资料的预约按钮直接置灰，用户不知道下一步该怎么做。

## 已完成内容

1. `app/lib/pages/market/market_page.dart`
   - 商品卡片点击改为打开商品详情底部弹层。
   - 详情弹层展示商品图片、标题、标签、卖家、价格和“加入合计”动作。
   - 商品资料未完成更新时，提示改为“商品资料更新中，请稍后下单”。
   - 下单备注改为“移动端下单”。
2. `app/lib/pages/machinery/machinery_page.dart`
   - 样例农机不再让预约按钮直接灰掉。
   - 资料未完成更新时，点击预约提示“农机资料更新中，请稍后预约”。
   - 预约备注改为“移动端预约”。
3. Flutter 主路径文案回扫
   - 政策页加载态改为“正在加载政策服务...”。
   - 移动端注释和业务备注中的“后端 / Flutter App”统一改为“服务端 / 移动端”。
   - 回扫 `app/lib`，不再命中“内置、后端、模拟、来自后端、等待同步、暂不能、Flutter App、cloud_off、$e、e.toString()` 等口径风险词。

## 涉及文件

- `app/lib/pages/market/market_page.dart`
- `app/lib/pages/machinery/machinery_page.dart`
- `app/lib/pages/policy/policy_page.dart`
- `app/lib/core/api_client.dart`
- `app/lib/core/constants.dart`
- `app/lib/pages/agri/agri_page.dart`
- `app/lib/pages/disaster/disaster_page.dart`
- `app/lib/pages/home/home_page.dart`
- `app/lib/pages/machinery/machinery_service_page.dart`
- `app/lib/pages/market/market_service_page.dart`
- `app/lib/pages/policy/policy_service_page.dart`
- `app/lib/pages/publish/publish_page.dart`

## 验证结果

- `dart format`：已执行，涉及 Dart 文件格式化通过。
- `flutter analyze`：通过，未发现问题。
- `flutter test`：通过，现有测试全部通过。
- 文案口径回扫：通过，`app/lib` 未命中本轮目标风险词。

## 当前结论

分段 37 已完成移动端主路径文案修复、集市详情交互补强与验证。
