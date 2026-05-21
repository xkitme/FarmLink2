# 分段 06 — machinery 模块 API（农机共享）

> 状态：✅ 完成

## 任务目标

实现板块三「农机农资共享」8 个功能模块的后端 API。

## 执行内容

### 模块化目录
```
src/modules/machinery/
├── machinery.routes.js      路由汇总（26 接口）
├── machinery.controller.js  农机 CRUD
├── booking.controller.js    预约 + 轨迹 + 维保 + 故障诊断
├── transfer.controller.js   土地流转 + 成本核算
└── service.controller.js    保险投保 + 机手认证
```

### API 清单（26 接口，覆盖 8 模块）

| 模块 | 接口 |
|---|---|
| 农机预约租赁 | GET/POST/PUT/DELETE /machinery、/machinery/mine、POST /machinery/booking、booking/list、booking/:id/status |
| 农机轨迹记录 | POST /machinery/track、GET /machinery/track/list |
| 农机维保提醒 | GET /machinery/maintain/remind |
| 农机故障诊断 | POST /machinery/fault/diagnose |
| 土地流转平台 | GET/POST/PUT/DELETE /land/transfer、/land/transfer/list、:id |
| 成本核算 | GET /machinery/cost/summary |
| 农机保险投保 | POST /machinery/insurance、GET /machinery/insurance/list |
| 机手技能认证 | POST /machinery/cert/apply、GET /machinery/cert/list |

### 设计要点
- 预约按起止日期算天数 × 日租金；机主/承租双视角查询
- 上报作业轨迹自动累加农机 `totalHours`
- 维保提醒：基于累计工时预测（常规保养每 250h、大修每 2000h），剩余 ≤30h 标 DUE
- 故障诊断：离线关键词规则库（启动/黑烟/过热/异响/液压/漏油等），分段 11 接入 LLM
- 成本核算：聚合农事记录 cost，传 income 参数即算利润率
- `:id` 通配路由放在具体路由之后，避免吞掉 /machinery/booking 等

## 验证

冒烟测试 **26/26 通过**：农机 CRUD、预约流转、轨迹累计工时、维保提醒、故障诊断(命中/未命中)、成本核算、土地流转、保险、机手认证。

## 下一步

分段 07：disaster 模块 API（气象灾害 8 模块）
