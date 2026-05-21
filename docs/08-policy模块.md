# 分段 08 — policy 模块 API（惠农政策党建）

> 状态：✅ 完成

## 任务目标

实现板块五「惠农政策与党建思政」10 个功能模块的后端 API。

## 执行内容

### 模块化目录
```
src/modules/policy/
├── policy.routes.js        路由汇总（27 接口）
├── policy.controller.js    政策推送 + 补贴申请 + AI问答 + 法律咨询
├── party.controller.js     党建学习打卡 + 乡村振兴积分
├── village.controller.js   村务公开 + 文明乡风榜
└── training.controller.js  职业农民培训 + 乡村人才库
```

### API 清单（27 接口，覆盖 10 模块）

| 模块 | 接口 |
|---|---|
| 三级政策推送 | GET /policy/list、/policy/:id |
| 补贴申请引导 | POST /policy/subsidy/apply、GET /policy/subsidy/list |
| 政策AI问答 | POST /policy/ai/ask |
| 法律援助咨询 | POST /policy/legal/ask |
| 党建学习打卡 | GET /party/lesson/list、:id、POST :id/finish、GET /party/learn/log |
| 乡村振兴积分 | GET /policy/points/rank、/items、POST /points/exchange |
| 村务公开公示 | GET/POST /village/affairs |
| 文明乡风榜 | GET/POST /village/honor、POST :id/vote |
| 职业农民培训 | GET /training/course/list、:id、POST :id/enroll、:id/progress、GET /training/my |
| 乡村人才库 | GET /talent/list、POST /talent |

### 设计要点
- **政策 AI 问答**：规则版 RAG —— 提取问题 2/3 字 n-gram，检索 PolicyChunk 切片并按命中数打分取 Top-5 组装答案；分段 11 接入 Ollama LLM
- **法律咨询**：关键词主题匹配（土地/劳资/农资/婚姻继承/征收补偿），分段 11 接入 LLM
- **党建打卡**：首次完成奖励积分（写 PointsLog + 累加 user.points），重复打卡不再奖励
- **积分排行**：按 user.points 排序，附本人排名；积分可兑换商品目录
- **培训结业**：学习进度达 100% 自动结业发证（生成 certNo）
- 村务公开仅村委可发布；好人好事村委直接发布、村民上报需审核

## 验证

冒烟测试 **29/29 通过**：政策列表/筛选/详情、补贴申请、AI问答(RAG命中2条政策)、法律咨询、党建打卡(含重复打卡判定)、积分排行/兑换、村务公开(权限校验)、乡风榜点赞、培训报名结业发证、人才库。

## 下一步

分段 09：life 模块 API（乡村生活 12 模块）
