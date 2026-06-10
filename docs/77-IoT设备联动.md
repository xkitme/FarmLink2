# 77 - 物联网设备联动（#19）

## 背景

GitHub issue #19「物联网设备联动」。原 `/iot` 页只有**设备监测**（土壤墒情仪/空气温湿度站/虫情测报灯/水位计/气象站/育苗棚控制器 6 台，实时读数 + 趋势详情），缺少 issue 要求的「**联动**」——即设备数据越过阈值自动触发动作。本批补齐设备联动（自动化规则 + 触发记录）。

## 后端（`backend/src/modules/iot/`）

IoT 为合成数据生成器（无 DB 表，内存模板 + 随机抖动）。联动同样用内存规则模板，启用态运行期 Map 覆盖（重启回默认，demo 足够）。

### 5 条联动规则（`LINKAGE_RULES`）

| 规则 | 设备·指标 | 条件 | 动作 | 默认 |
|---|---|---|---|---|
| 墒情自动滴灌 | 东区土壤墒情仪·土壤湿度 | < 45% | 联动东区滴灌阀开启 15 分钟 | 启用·待命 |
| 虫情活跃·植保预警 | 北渠虫情测报灯·诱捕量 | > 15 只 | 推送植保预警·建议无人机统防统治 | 启用·常触发 |
| 棚室高温通风 | 育苗棚控制器·冠层温度 | > 31℃ | 联动育苗棚顶窗通风降温 | 启用·待命 |
| 低温霜冻保温 | 西坡空气站·气温 | < 12℃ | 联动育苗棚保温帘·推送防冻提醒 | 启用·待命 |
| 水位过高排涝 | 南沟水位计·水位 | > 1.8m | 联动南沟泵站启动排水 | 停用 |

阈值留足余量，保证 demo 稳定呈现「1 条已触发 + 3 条待命 + 1 条停用」的组合（不靠随机碰运气）。

### 接口

```
GET  /api/v1/iot/linkage/rules
  resp.data: [{ id, name, desc, deviceId, deviceName, deviceType,
                metricKey, metricLabel, op, threshold, unit,
                action, actionType, currentValue, enabled,
                status: 'triggered'|'idle'|'disabled' }]
GET  /api/v1/iot/linkage/logs
  resp.data: [{ id, ruleId, ruleName, deviceName, message, value, unit,
                metricLabel, result, createdAt }]   // 仅启用规则，时间倒序
POST /api/v1/iot/linkage/rules/:id/toggle
  body: { enabled: bool }   resp.data: 更新后的 rule（同 rules 元素结构）
```

`status` 由实时读数与阈值实时判定：未启用→`disabled`；启用且满足条件→`triggered`；否则→`idle`。

## 前端（`app/lib/pages/iot/iot_page.dart`）

- `_load()` 在拉 `/iot/devices` 后**并行 best-effort** 拉 `/iot/linkage/rules`+`/iot/linkage/logs`（联动失败不影响设备监测主流程）。
- 设备监测下方新增「**设备联动**」区：
  - 区头 StatusChip 汇总（N 条已触发 / N 条已启用）。
  - **规则卡**：动作图标（按 actionType）+ 规则名 + 关联设备·说明 + 启用 `Switch`；下方条状容器展示状态徽章（已触发/待命/已停用）+「触发条件 指标 op 阈值 · 当前值」+「⚡动作」。
  - **联动记录** AppCard：时间倒序列出最近自动执行的动作（规则名·结果 / 设备·指标值·时间）。
- `_toggleRule()` POST 启停，成功后就地更新该规则 + 重拉 logs；切换期间 `Switch` 禁用防抖。
- 兼容性：`Switch` 用 `activeColor`（开发机 3.32.1 无 `activeThumbColor`，比赛机 3.44 仅 deprecated 警告不报错）。

## 验证

- `node --check` 后端两文件通过；接口实测：rules 返回 1 触发(虫情 20.1>15)/3 待命/1 停用；logs 5 条带时间；toggle 启停 disabled↔idle 正确。
- `flutter analyze lib`：No issues found（全量）。
- **release 浏览器实测通过**：`/iot` 页设备监测下方正确渲染「设备联动」区——区头「1 条已触发」徽章；5 条规则卡（墒情待命/当前63.4%、虫情**已触发**/当前23.1只、棚温待命、霜冻待命、水位**已停用**），每条含状态徽章+触发条件+当前值+⚡动作+启用开关；「联动记录」5 条倒序（规则·结果 / 设备·指标值·时间）。
- **端到端 toggle 验证**：经 API 停用「虫情」规则后重载页面，前端正确联动——区头变「3 条已启用」、虫情卡变「已停用」、联动记录中虫情两条按启用态过滤消失；验后已还原。（注：canvas 上直接点开关受 Playwright 命中精度限制未逐一点测，但写端接口 curl 验过、`onChanged→_toggleRule→POST` 已接线、读端渲染 toggle 后状态已证。）
