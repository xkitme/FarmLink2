# 分段 04 — agri 模块 API（农业生产）

> 状态：✅ 完成

## 任务目标

实现板块一「AI 农业生产」13 个功能模块的后端 API。

## 执行内容

### 1. 文件上传基础设施
- `src/middleware/upload.js`：multer 磁盘存储，限制大小，文件名随机化
- `src/app.js`：新增 `/uploads` 静态访问

### 2. 模块化目录
```
src/modules/agri/
├── agri.routes.js       路由汇总（26 接口）
├── plot.controller.js   地块管理
├── record.controller.js 农事记录 + 碳汇
├── detect.controller.js 病害/杂草/种子/长势 识别
├── advise.controller.js 施肥/墒情/灌溉/产量预测
└── info.controller.js   农事日历/农药/气象/年度报告
```

### 3. API 清单（26 个接口，覆盖 13 模块）

| 模块 | 接口 |
|---|---|
| 地块/GIS管理 | GET/POST/PUT/DELETE /agri/plot |
| 农事记录本 | GET/POST/PUT/DELETE /agri/record |
| 农业碳汇计算 | POST /agri/carbon/calc、GET /agri/carbon/list |
| 病虫害AI识别 | POST /agri/disease/detect、GET /agri/disease/list、/agri/disease/:label |
| 杂草识别 | POST /agri/weed/detect |
| 种子质量鉴别 | POST /agri/seed/detect |
| 作物长势监测 | POST /agri/crop/monitor |
| （识别记录） | GET /agri/detect/records |
| 土壤墒情建议 | POST /agri/soil/advise |
| 智能施肥配方 | POST /agri/fertilizer/advise |
| 灌溉计划助手 | POST /agri/irrigation/plan |
| 产量预测 | POST /agri/yield/predict、GET /agri/yield/list |
| 农事日历 | GET /agri/calendar |
| 农药安全指导 | GET /agri/pesticide、/agri/pesticide/list |
| 精细气象预报 | GET /agri/weather |
| 农事年度报告 | GET /agri/report/annual |

### 4. 设计要点
- **AI 识别（病害/杂草/种子/长势）**：本段为离线规则版——从知识库匹配 + 生成置信度，可完全离线运行；**分段 11 将接入 Ollama 视觉模型（minicpm-v）做真实图像推理**
- **施肥配方**：基于作物 NPK 基准 + 地力调整，折算尿素/过磷酸钙/氯化钾实物量
- **产量预测**：作物理论单产 × 面积 × 时序因子，给出置信区间
- **气象预报**：离线生成 7 日预报 + 联动当前生效的天气预警
- **年度报告**：聚合农事记录生成模板报告（分段 11 接入 LLM 润色）
- 农情语音助手归入分段 11（ai 模块语音接口）

## 验证

启动后端跑冒烟测试，**26 项全部通过**：地块 CRUD、农事记录、碳汇、四类 AI 识别（含图片上传）、施肥/墒情/灌溉/产量、日历/农药/气象/年报。

## 下一步

分段 05：market 模块 API（流通销售 12 模块）
