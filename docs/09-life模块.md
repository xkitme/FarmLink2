# 分段 09 — life 模块 API（乡村生活服务）

> 状态：✅ 完成

## 任务目标

实现板块六「乡村生活服务」12 个功能模块的后端 API。

## 执行内容

### 模块化目录
```
src/modules/life/
├── life.routes.js          路由汇总（33 接口）
├── health.controller.js    村医问诊 + 养老关爱
├── service.controller.js   快递代收 + 水电气缴费 + 乡村旅游
├── job.controller.js       就业 + 农业贷款 + 教育辅导
└── community.controller.js 邻里互助 + 二手交易 + 民俗文化 + 环境举报
```

### API 清单（33 接口，覆盖 12 模块）

| 模块 | 接口 |
|---|---|
| 村医在线问诊 | GET /life/clinic/list、POST /life/clinic/consult、GET /life/consult/list、PUT :id/reply |
| 养老关爱服务 | GET /life/elder/services、POST /life/elder/checkin |
| 快递代收站 | GET /life/express/list、/life/express/query |
| 水电气缴费 | GET /life/utility/bill、POST /life/utility/pay |
| 乡村旅游推广 | GET /life/tourism/list、:id、POST /life/tourism、/life/tourism/promote |
| 就业信息平台 | GET /life/job/list、POST /life/job、/life/job/match |
| 农业贷款服务 | GET /life/loan/products、POST /life/loan/assess、GET /life/loan/applications |
| 子女教育辅导 | POST /life/edu/ask |
| 邻里互助 | GET /life/help/list、POST /life/help、:id/accept |
| 二手交易市场 | GET /life/secondhand/list、POST、PUT :id |
| 民俗文化记录 | GET /life/folk/list、:id、POST /life/folk |
| 环境问题举报 | POST /life/env/report、GET /life/env/list、PUT :id/status |

### 设计要点
- AI 能力（岗位匹配/贷款评估/旅游文案/教育答疑）为离线规则模板版，分段 11 接入 Ollama
- 贷款资质评分：基础分 + 积分加成 + 注册时长加成的规则模型
- 岗位匹配：技能分词与岗位文本匹配打分排序
- 水电气缴费、快递查询为离线 mock（无支付网关/物流接口）
- 环境举报广播通知；村委可查全部并处理
- 互助响应、二手售出等状态流转完整

## 验证

冒烟测试 **32/32 通过**：村医问诊、养老打卡、快递、缴费、旅游(含文案)、就业(含AI匹配)、贷款评估、教育答疑、邻里互助全流程、二手交易、民俗记录、环境举报与处理。

## 下一步

分段 10：data 模块 API（数据管理 6 模块）
