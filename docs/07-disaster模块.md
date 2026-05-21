# 分段 07 — disaster 模块 API（气象灾害）

> 状态：✅ 完成

## 任务目标

实现板块四「气象灾害与应急」8 个功能模块的后端 API。

## 执行内容

### 模块化目录
```
src/modules/disaster/
├── disaster.routes.js       路由汇总（20 接口）
├── alert.controller.js      预警/冻害/火险/干旱
├── report.controller.js     灾情上报
├── claim.controller.js      保险理赔
└── emergency.controller.js  应急预案 + 一键求助
```

### API 清单（20 接口，覆盖 8 模块）

| 模块 | 接口 |
|---|---|
| 极端天气预警 | GET /disaster/alert/list |
| 冻害防护建议 | GET /disaster/frost/advice |
| 火险预警 | GET /disaster/fire/risk |
| 干旱监测指数 | GET /disaster/drought/index |
| 灾情快速上报 | POST /disaster/report、GET report/list、:id、PUT :id/status |
| 保险智能理赔 | POST /disaster/claim/assess、GET claim/list、:id |
| 应急预案查询 | GET /disaster/emergency/guide、:id |
| 一键求助联络 | POST /disaster/sos、GET sos/list、PUT :id/status |

### 设计要点
- 灾情上报按受灾面积/损失自动定级（轻/中/重），并广播通知村委
- 行级数据权限：村委查本区域全部灾情/求助，普通用户仅查自己
- 保险理赔 AI 评估：按损失金额规则定级 + 赔付比例，离线版（分段 11 接入视觉模型）
- 火险/干旱指数为离线生成的演示数据；冻害建议联动低温/霜冻/寒潮预警
- 一键求助返回离线常备紧急联系人清单（村委/农业站/保险/120/119）

## 验证

冒烟测试 **20/20 通过**：预警/指数、应急预案、灾情上报与定级、行级权限校验、保险理赔、一键求助全流程。

## 下一步

分段 08：policy 模块 API（惠农政策党建 10 模块）
