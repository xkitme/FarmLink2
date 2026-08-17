// 本文件由 scripts/gen-capabilities.mjs 自动生成，请勿手工编辑。
// 重新生成：cd backend && node scripts/gen-capabilities.mjs --write
// 漂移检查：cd backend && node scripts/gen-capabilities.mjs --check
//
// 116f-B 单一能力注册表初版（schemaVersion=1）：
// - v1：全部现有路由的只读对账登记（盘点脚本生成，不改变 v1 任何行为）；
// - v2：仅 /ping、/capabilities、/api-catalog 三个骨架端点（D9）+ market product 样板；
// - featureCatalog（116f-F）：搜索/助手/功能墙数据源（人工可编辑事实源在本脚本 FEATURE_CATALOG overlay）；
// - 外部响应由 routes/v2 显式投影，v1.routesFile/line、ratePlan/switchKey、featureCatalog 不对外。
export const CAPABILITY_REGISTRY =
{
  "schemaVersion": 1,
  "apiVersions": [
    "v1",
    "v2"
  ],
  "roles": [
    "FARMER",
    "BIGFARMER",
    "VILLAGE",
    "EXPERT",
    "MERCHANT",
    "ADMIN"
  ],
  "ratePlans": [
    "global",
    "authLogin",
    "sms",
    "upload",
    "adminRead",
    "adminWrite",
    "ai",
    "tts"
  ],
  "switchKeys": [
    "ai_annual_report",
    "ai_chat",
    "ai_claim_assess",
    "ai_copywriting",
    "ai_disease_detect",
    "ai_fault_diagnose",
    "ai_grade_detect",
    "ai_policy_qa",
    "ai_seed_detect",
    "ai_voice",
    "ai_weed_detect",
    "ai_yield_predict",
    "community_post",
    "disaster_report",
    "machinery_booking",
    "market_order",
    "media_upload",
    "offline_sync",
    "subsidy_apply",
    "user_register"
  ],
  "sections": {
    "system": "系统",
    "platform": "平台服务",
    "agri": "农业生产",
    "market": "流通销售",
    "machinery": "农机共享",
    "disaster": "气象灾害",
    "policy": "惠农政策",
    "life": "乡村生活",
    "data": "数据管理",
    "iot": "智慧物联",
    "ai": "AI 能力"
  },
  "migrationNotes": {
    "aiDetectRecordResourceGroups": {
      "decision": "D2",
      "primaryGroup": "agri",
      "secondaryTags": [
        "ai"
      ],
      "status": "planned-not-implemented",
      "note": "aiDetectRecord 唯一 primaryGroup=agri，ai 作为 tag/secondaryGroup 表达；既有 resourceGroups 与 B20 characterization 本轮保持不变，去重与契约更新延至实施批次正式开始后。"
    }
  },
  "capabilities": [
    {
      "id": "cap.agri.agri.calendar.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/calendar",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.calendar.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/calendar",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 50
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.carbon.calc.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/carbon/calc",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.carbon.calc.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/carbon/calc",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.carbon.list.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/carbon/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.carbon.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/carbon/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.crop.monitor.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/crop/monitor",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.crop.monitor.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/crop/monitor",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 38
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.detect.records.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/detect/records",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.detect.records.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/detect/records",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 39
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.disease.detect.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/disease/detect",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.disease.detect.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/disease/detect",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_disease_detect",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 35
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.disease.label.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/disease/:label",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.disease.label.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/disease/:label",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 40
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.disease.list.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/disease/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.disease.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/disease/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 34
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.fertilizer.advise.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/fertilizer/advise",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.fertilizer.advise.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/fertilizer/advise",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 44
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.irrigation.plan.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/irrigation/plan",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.irrigation.plan.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/irrigation/plan",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 45
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.pesticide.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/pesticide",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.pesticide.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/pesticide",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 51
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.pesticide.list.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/pesticide/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.pesticide.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/pesticide/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 52
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.plot.id.delete",
      "section": "agri",
      "name": "农业生产 · DELETE /agri/plot/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.plot.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/agri/plot/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 21
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.plot.id.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/plot/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.plot.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/plot/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.plot.id.put",
      "section": "agri",
      "name": "农业生产 · PUT /agri/plot/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.plot.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/agri/plot/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.plot.list.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/plot/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.plot.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/plot/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 17
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.plot.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/plot",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.plot.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/plot",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 18
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.record.id.delete",
      "section": "agri",
      "name": "农业生产 · DELETE /agri/record/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.record.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/agri/record/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.record.id.put",
      "section": "agri",
      "name": "农业生产 · PUT /agri/record/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.record.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/agri/record/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 26
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.record.list.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/record/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.record.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/record/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 24
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.record.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/record",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.record.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/record",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.report.annual.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/report/annual",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.report.annual.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/report/annual",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 54
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.seed.detect.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/seed/detect",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.seed.detect.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/seed/detect",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_seed_detect",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 37
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.soil.advise.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/soil/advise",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.soil.advise.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/soil/advise",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 43
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.weather.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/weather",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.weather.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/weather",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 53
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.weed.detect.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/weed/detect",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.weed.detect.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/weed/detect",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_weed_detect",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 36
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.yield.list.get",
      "section": "agri",
      "name": "农业生产 · GET /agri/yield/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.yield.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/agri/yield/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 47
          }
        }
      ]
    },
    {
      "id": "cap.agri.agri.yield.predict.post",
      "section": "agri",
      "name": "农业生产 · POST /agri/yield/predict",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.agri.agri.yield.predict.post",
          "version": "v1",
          "method": "POST",
          "path": "/agri/yield/predict",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_yield_predict",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/agri/agri.routes.js",
            "line": 46
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.agri.ask.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/agri/ask",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.agri.ask.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/agri/ask",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_chat",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 22
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.assistant.command-result.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/assistant/command-result",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.assistant.command-result.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/assistant/command-result",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.assistant.config.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/assistant/config",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.assistant.config.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/assistant/config",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 18
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.assistant.turn.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/assistant/turn",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.assistant.turn.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/assistant/turn",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.chat.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/chat",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.chat.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/chat",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_chat",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 17
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.detect-feedback.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/detect-feedback",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.detect-feedback.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/detect-feedback",
          "auth": "required",
          "roles": null,
          "switchKey": "media_upload",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 41
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.image.analyze.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/image/analyze",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.image.analyze.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/image/analyze",
          "auth": "required",
          "roles": null,
          "switchKey": "media_upload",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 39
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.image.detect.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/image/detect",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.image.detect.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/image/detect",
          "auth": "required",
          "roles": null,
          "switchKey": "media_upload",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 40
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.kb.search.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/kb/search",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.kb.search.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/kb/search",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 24
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.legal.ask.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/legal/ask",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.legal.ask.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/legal/ask",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_chat",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 23
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.model.version.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/model/version",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.model.version.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/model/version",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 14
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.policy.ask.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/policy/ask",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.policy.ask.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/policy/ask",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_policy_qa",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 21
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.record-items.id.delete",
      "section": "ai",
      "name": "AI 能力 · DELETE /ai/qa/record-items/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.record-items.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/ai/qa/record-items/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 29
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.records.delete",
      "section": "ai",
      "name": "AI 能力 · DELETE /ai/qa/records",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.records.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/ai/qa/records",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 28
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.records.detect.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/qa/records/detect",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.records.detect.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/qa/records/detect",
          "auth": "required",
          "roles": null,
          "switchKey": "media_upload",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.records.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/qa/records",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.records.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/qa/records",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.records.id.delete",
      "section": "ai",
      "name": "AI 能力 · DELETE /ai/qa/records/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": true,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.records.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/ai/qa/records/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": true,
          "deprecatedSince": "2026-08-15",
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.threads.threadId.delete",
      "section": "ai",
      "name": "AI 能力 · DELETE /ai/qa/threads/:threadId",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.threads.threadId.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/ai/qa/threads/:threadId",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.qa.threads.threadId.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/qa/threads/:threadId",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.qa.threads.threadId.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/qa/threads/:threadId",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 26
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.status.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.status.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 13
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.tts.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/tts",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.tts.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/tts",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 34
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.tts.status.get",
      "section": "ai",
      "name": "AI 能力 · GET /ai/tts/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.tts.status.get",
          "version": "v1",
          "method": "GET",
          "path": "/ai/tts/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 35
          }
        }
      ]
    },
    {
      "id": "cap.ai.ai.voice.recognize.post",
      "section": "ai",
      "name": "AI 能力 · POST /ai/voice/recognize",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.ai.ai.voice.recognize.post",
          "version": "v1",
          "method": "POST",
          "path": "/ai/voice/recognize",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_voice",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/ai/ai.routes.js",
            "line": 38
          }
        }
      ]
    },
    {
      "id": "cap.data.data.annual-report.generate.post",
      "section": "data",
      "name": "数据管理 · POST /data/annual-report/generate",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.annual-report.generate.post",
          "version": "v1",
          "method": "POST",
          "path": "/data/annual-report/generate",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_annual_report",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 16
          }
        }
      ]
    },
    {
      "id": "cap.data.data.annual-report.list.get",
      "section": "data",
      "name": "数据管理 · GET /data/annual-report/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.annual-report.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/annual-report/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 15
          }
        }
      ]
    },
    {
      "id": "cap.data.data.dashboard.get",
      "section": "data",
      "name": "数据管理 · GET /data/dashboard",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.dashboard.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/dashboard",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 13
          }
        }
      ]
    },
    {
      "id": "cap.data.data.remote-sensing.get",
      "section": "data",
      "name": "数据管理 · GET /data/remote-sensing",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.remote-sensing.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/remote-sensing",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 14
          }
        }
      ]
    },
    {
      "id": "cap.data.data.statistics.get",
      "section": "data",
      "name": "数据管理 · GET /data/statistics",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.statistics.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/statistics",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.data.data.statistics.id.status.put",
      "section": "data",
      "name": "数据管理 · PUT /data/statistics/:id/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.statistics.id.status.put",
          "version": "v1",
          "method": "PUT",
          "path": "/data/statistics/:id/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 22
          }
        }
      ]
    },
    {
      "id": "cap.data.data.statistics.report.post",
      "section": "data",
      "name": "数据管理 · POST /data/statistics/report",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.statistics.report.post",
          "version": "v1",
          "method": "POST",
          "path": "/data/statistics/report",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 21
          }
        }
      ]
    },
    {
      "id": "cap.data.data.statistics.summary.get",
      "section": "data",
      "name": "数据管理 · GET /data/statistics/summary",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.statistics.summary.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/statistics/summary",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.data.data.sync.logs.get",
      "section": "data",
      "name": "数据管理 · GET /data/sync/logs",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.sync.logs.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/sync/logs",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.data.data.sync.post",
      "section": "data",
      "name": "数据管理 · POST /data/sync",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.sync.post",
          "version": "v1",
          "method": "POST",
          "path": "/data/sync",
          "auth": "required",
          "roles": null,
          "switchKey": "offline_sync",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.data.data.sync.status.get",
      "section": "data",
      "name": "数据管理 · GET /data/sync/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.data.data.sync.status.get",
          "version": "v1",
          "method": "GET",
          "path": "/data/sync/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/data/data.routes.js",
            "line": 26
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.alert.list.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/alert/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.alert.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/alert/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 12
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.claim.assess.post",
      "section": "disaster",
      "name": "气象灾害 · POST /disaster/claim/assess",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.claim.assess.post",
          "version": "v1",
          "method": "POST",
          "path": "/disaster/claim/assess",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_claim_assess",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 28
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.claim.id.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/claim/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.claim.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/claim/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.claim.list.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/claim/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.claim.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/claim/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 29
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.drought.index.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/drought/index",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.drought.index.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/drought/index",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 15
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.emergency.guide.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/emergency/guide",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.emergency.guide.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/emergency/guide",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 18
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.emergency.id.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/emergency/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.emergency.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/emergency/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.fire.risk.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/fire/risk",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.fire.risk.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/fire/risk",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 14
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.frost.advice.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/frost/advice",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.frost.advice.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/frost/advice",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 13
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.report.id.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/report/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.report.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/report/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 24
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.report.id.status.put",
      "section": "disaster",
      "name": "气象灾害 · PUT /disaster/report/:id/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.report.id.status.put",
          "version": "v1",
          "method": "PUT",
          "path": "/disaster/report/:id/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.report.list.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/report/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.report.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/report/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 23
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.report.post",
      "section": "disaster",
      "name": "气象灾害 · POST /disaster/report",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.report.post",
          "version": "v1",
          "method": "POST",
          "path": "/disaster/report",
          "auth": "required",
          "roles": null,
          "switchKey": "disaster_report",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 22
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.sos.id.status.put",
      "section": "disaster",
      "name": "气象灾害 · PUT /disaster/sos/:id/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.sos.id.status.put",
          "version": "v1",
          "method": "PUT",
          "path": "/disaster/sos/:id/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 35
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.sos.list.get",
      "section": "disaster",
      "name": "气象灾害 · GET /disaster/sos/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.sos.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/disaster/sos/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 34
          }
        }
      ]
    },
    {
      "id": "cap.disaster.disaster.sos.post",
      "section": "disaster",
      "name": "气象灾害 · POST /disaster/sos",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.disaster.disaster.sos.post",
          "version": "v1",
          "method": "POST",
          "path": "/disaster/sos",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/disaster/disaster.routes.js",
            "line": 33
          }
        }
      ]
    },
    {
      "id": "cap.iot.iot.devices.get",
      "section": "iot",
      "name": "智慧物联 · GET /iot/devices",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.iot.iot.devices.get",
          "version": "v1",
          "method": "GET",
          "path": "/iot/devices",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/iot/iot.routes.js",
            "line": 9
          }
        }
      ]
    },
    {
      "id": "cap.iot.iot.devices.id.get",
      "section": "iot",
      "name": "智慧物联 · GET /iot/devices/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.iot.iot.devices.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/iot/devices/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/iot/iot.routes.js",
            "line": 10
          }
        }
      ]
    },
    {
      "id": "cap.iot.iot.linkage.logs.get",
      "section": "iot",
      "name": "智慧物联 · GET /iot/linkage/logs",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.iot.iot.linkage.logs.get",
          "version": "v1",
          "method": "GET",
          "path": "/iot/linkage/logs",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/iot/iot.routes.js",
            "line": 14
          }
        }
      ]
    },
    {
      "id": "cap.iot.iot.linkage.rules.get",
      "section": "iot",
      "name": "智慧物联 · GET /iot/linkage/rules",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.iot.iot.linkage.rules.get",
          "version": "v1",
          "method": "GET",
          "path": "/iot/linkage/rules",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/iot/iot.routes.js",
            "line": 13
          }
        }
      ]
    },
    {
      "id": "cap.iot.iot.linkage.rules.id.toggle.post",
      "section": "iot",
      "name": "智慧物联 · POST /iot/linkage/rules/:id/toggle",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.iot.iot.linkage.rules.id.toggle.post",
          "version": "v1",
          "method": "POST",
          "path": "/iot/linkage/rules/:id/toggle",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/iot/iot.routes.js",
            "line": 15
          }
        }
      ]
    },
    {
      "id": "cap.life.life.clinic.consult.post",
      "section": "life",
      "name": "乡村生活 · POST /life/clinic/consult",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.clinic.consult.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/clinic/consult",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 13
          }
        }
      ]
    },
    {
      "id": "cap.life.life.clinic.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/clinic/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.clinic.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/clinic/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 12
          }
        }
      ]
    },
    {
      "id": "cap.life.life.consult.id.reply.put",
      "section": "life",
      "name": "乡村生活 · PUT /life/consult/:id/reply",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.consult.id.reply.put",
          "version": "v1",
          "method": "PUT",
          "path": "/life/consult/:id/reply",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 15
          }
        }
      ]
    },
    {
      "id": "cap.life.life.consult.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/consult/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.consult.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/consult/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 14
          }
        }
      ]
    },
    {
      "id": "cap.life.life.edu.ask.post",
      "section": "life",
      "name": "乡村生活 · POST /life/edu/ask",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.edu.ask.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/edu/ask",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 46
          }
        }
      ]
    },
    {
      "id": "cap.life.life.elder.checkin.post",
      "section": "life",
      "name": "乡村生活 · POST /life/elder/checkin",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.elder.checkin.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/elder/checkin",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.life.life.elder.services.get",
      "section": "life",
      "name": "乡村生活 · GET /life/elder/services",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.elder.services.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/elder/services",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 18
          }
        }
      ]
    },
    {
      "id": "cap.life.life.env.id.status.put",
      "section": "life",
      "name": "乡村生活 · PUT /life/env/:id/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.env.id.status.put",
          "version": "v1",
          "method": "PUT",
          "path": "/life/env/:id/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 66
          }
        }
      ]
    },
    {
      "id": "cap.life.life.env.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/env/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.env.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/env/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 65
          }
        }
      ]
    },
    {
      "id": "cap.life.life.env.report.post",
      "section": "life",
      "name": "乡村生活 · POST /life/env/report",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.env.report.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/env/report",
          "auth": "required",
          "roles": null,
          "switchKey": "community_post",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 64
          }
        }
      ]
    },
    {
      "id": "cap.life.life.express.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/express/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.express.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/express/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 22
          }
        }
      ]
    },
    {
      "id": "cap.life.life.express.query.get",
      "section": "life",
      "name": "乡村生活 · GET /life/express/query",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.express.query.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/express/query",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 23
          }
        }
      ]
    },
    {
      "id": "cap.life.life.folk.id.get",
      "section": "life",
      "name": "乡村生活 · GET /life/folk/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.folk.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/folk/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 61
          }
        }
      ]
    },
    {
      "id": "cap.life.life.folk.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/folk/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.folk.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/folk/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 59
          }
        }
      ]
    },
    {
      "id": "cap.life.life.folk.post",
      "section": "life",
      "name": "乡村生活 · POST /life/folk",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.folk.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/folk",
          "auth": "required",
          "roles": null,
          "switchKey": "community_post",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 60
          }
        }
      ]
    },
    {
      "id": "cap.life.life.help.id.accept.post",
      "section": "life",
      "name": "乡村生活 · POST /life/help/:id/accept",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.help.id.accept.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/help/:id/accept",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 51
          }
        }
      ]
    },
    {
      "id": "cap.life.life.help.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/help/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.help.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/help/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 49
          }
        }
      ]
    },
    {
      "id": "cap.life.life.help.post",
      "section": "life",
      "name": "乡村生活 · POST /life/help",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.help.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/help",
          "auth": "required",
          "roles": null,
          "switchKey": "community_post",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 50
          }
        }
      ]
    },
    {
      "id": "cap.life.life.job.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/job/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.job.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/job/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 36
          }
        }
      ]
    },
    {
      "id": "cap.life.life.job.match.post",
      "section": "life",
      "name": "乡村生活 · POST /life/job/match",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.job.match.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/job/match",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 38
          }
        }
      ]
    },
    {
      "id": "cap.life.life.job.post",
      "section": "life",
      "name": "乡村生活 · POST /life/job",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.job.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/job",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 37
          }
        }
      ]
    },
    {
      "id": "cap.life.life.loan.applications.get",
      "section": "life",
      "name": "乡村生活 · GET /life/loan/applications",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.loan.applications.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/loan/applications",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 43
          }
        }
      ]
    },
    {
      "id": "cap.life.life.loan.assess.post",
      "section": "life",
      "name": "乡村生活 · POST /life/loan/assess",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.loan.assess.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/loan/assess",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 42
          }
        }
      ]
    },
    {
      "id": "cap.life.life.loan.products.get",
      "section": "life",
      "name": "乡村生活 · GET /life/loan/products",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.loan.products.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/loan/products",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 41
          }
        }
      ]
    },
    {
      "id": "cap.life.life.secondhand.id.put",
      "section": "life",
      "name": "乡村生活 · PUT /life/secondhand/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.secondhand.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/life/secondhand/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 56
          }
        }
      ]
    },
    {
      "id": "cap.life.life.secondhand.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/secondhand/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.secondhand.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/secondhand/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 54
          }
        }
      ]
    },
    {
      "id": "cap.life.life.secondhand.post",
      "section": "life",
      "name": "乡村生活 · POST /life/secondhand",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.secondhand.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/secondhand",
          "auth": "required",
          "roles": null,
          "switchKey": "community_post",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 55
          }
        }
      ]
    },
    {
      "id": "cap.life.life.tourism.id.get",
      "section": "life",
      "name": "乡村生活 · GET /life/tourism/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.tourism.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/tourism/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 33
          }
        }
      ]
    },
    {
      "id": "cap.life.life.tourism.list.get",
      "section": "life",
      "name": "乡村生活 · GET /life/tourism/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.tourism.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/tourism/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.life.life.tourism.post",
      "section": "life",
      "name": "乡村生活 · POST /life/tourism",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.tourism.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/tourism",
          "auth": "required",
          "roles": null,
          "switchKey": "community_post",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.life.life.tourism.promote.post",
      "section": "life",
      "name": "乡村生活 · POST /life/tourism/promote",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.tourism.promote.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/tourism/promote",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_copywriting",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 32
          }
        }
      ]
    },
    {
      "id": "cap.life.life.utility.bill.get",
      "section": "life",
      "name": "乡村生活 · GET /life/utility/bill",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.utility.bill.get",
          "version": "v1",
          "method": "GET",
          "path": "/life/utility/bill",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 26
          }
        }
      ]
    },
    {
      "id": "cap.life.life.utility.pay.post",
      "section": "life",
      "name": "乡村生活 · POST /life/utility/pay",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.life.life.utility.pay.post",
          "version": "v1",
          "method": "POST",
          "path": "/life/utility/pay",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/life/life.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.machinery.land.transfer.id.delete",
      "section": "machinery",
      "name": "农机共享 · DELETE /land/transfer/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.land.transfer.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/land/transfer/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 46
          }
        }
      ]
    },
    {
      "id": "cap.machinery.land.transfer.id.get",
      "section": "machinery",
      "name": "农机共享 · GET /land/transfer/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.land.transfer.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/land/transfer/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 43
          }
        }
      ]
    },
    {
      "id": "cap.machinery.land.transfer.id.put",
      "section": "machinery",
      "name": "农机共享 · PUT /land/transfer/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.land.transfer.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/land/transfer/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 45
          }
        }
      ]
    },
    {
      "id": "cap.machinery.land.transfer.list.get",
      "section": "machinery",
      "name": "农机共享 · GET /land/transfer/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.land.transfer.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/land/transfer/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 42
          }
        }
      ]
    },
    {
      "id": "cap.machinery.land.transfer.post",
      "section": "machinery",
      "name": "农机共享 · POST /land/transfer",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.land.transfer.post",
          "version": "v1",
          "method": "POST",
          "path": "/land/transfer",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 44
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.booking.id.status.put",
      "section": "machinery",
      "name": "农机共享 · PUT /machinery/booking/:id/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.booking.id.status.put",
          "version": "v1",
          "method": "PUT",
          "path": "/machinery/booking/:id/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 17
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.booking.list.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/booking/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.booking.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/booking/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 16
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.booking.post",
      "section": "machinery",
      "name": "农机共享 · POST /machinery/booking",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.booking.post",
          "version": "v1",
          "method": "POST",
          "path": "/machinery/booking",
          "auth": "required",
          "roles": null,
          "switchKey": "machinery_booking",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 15
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.cert.apply.post",
      "section": "machinery",
      "name": "农机共享 · POST /machinery/cert/apply",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.cert.apply.post",
          "version": "v1",
          "method": "POST",
          "path": "/machinery/cert/apply",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 33
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.cert.list.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/cert/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.cert.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/cert/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 34
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.cost.summary.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/cost/summary",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.cost.summary.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/cost/summary",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 28
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.fault.diagnose.post",
      "section": "machinery",
      "name": "农机共享 · POST /machinery/fault/diagnose",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.fault.diagnose.post",
          "version": "v1",
          "method": "POST",
          "path": "/machinery/fault/diagnose",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_fault_diagnose",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.id.delete",
      "section": "machinery",
      "name": "农机共享 · DELETE /machinery/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/machinery/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 39
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.id.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 37
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.id.put",
      "section": "machinery",
      "name": "农机共享 · PUT /machinery/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/machinery/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 38
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.insurance.list.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/insurance/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.insurance.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/insurance/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 32
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.insurance.post",
      "section": "machinery",
      "name": "农机共享 · POST /machinery/insurance",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.insurance.post",
          "version": "v1",
          "method": "POST",
          "path": "/machinery/insurance",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.list.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 12
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.maintain.remind.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/maintain/remind",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.maintain.remind.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/maintain/remind",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 24
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.mine.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/mine",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.mine.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/mine",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 13
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.post",
      "section": "machinery",
      "name": "农机共享 · POST /machinery",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.post",
          "version": "v1",
          "method": "POST",
          "path": "/machinery",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 14
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.track.list.get",
      "section": "machinery",
      "name": "农机共享 · GET /machinery/track/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.track.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/machinery/track/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 21
          }
        }
      ]
    },
    {
      "id": "cap.machinery.machinery.track.post",
      "section": "machinery",
      "name": "农机共享 · POST /machinery/track",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.machinery.machinery.track.post",
          "version": "v1",
          "method": "POST",
          "path": "/machinery/track",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/machinery/machinery.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.market.market.buyer.list.get",
      "section": "market",
      "name": "流通销售 · GET /market/buyer/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.buyer.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/buyer/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 46
          }
        }
      ]
    },
    {
      "id": "cap.market.market.buyer.map.get",
      "section": "market",
      "name": "流通销售 · GET /market/buyer/map",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.buyer.map.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/buyer/map",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 45
          }
        }
      ]
    },
    {
      "id": "cap.market.market.export.get",
      "section": "market",
      "name": "流通销售 · GET /market/export",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.export.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/export",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.market.market.futures.get",
      "section": "market",
      "name": "流通销售 · GET /market/futures",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.futures.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/futures",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.market.market.grade.detect.post",
      "section": "market",
      "name": "流通销售 · POST /market/grade/detect",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.grade.detect.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/grade/detect",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_grade_detect",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 52
          }
        }
      ]
    },
    {
      "id": "cap.market.market.groupbuy.id.join.post",
      "section": "market",
      "name": "流通销售 · POST /market/groupbuy/:id/join",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.groupbuy.id.join.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/groupbuy/:id/join",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 49
          }
        }
      ]
    },
    {
      "id": "cap.market.market.groupbuy.list.get",
      "section": "market",
      "name": "流通销售 · GET /market/groupbuy/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.groupbuy.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/groupbuy/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 47
          }
        }
      ]
    },
    {
      "id": "cap.market.market.groupbuy.post",
      "section": "market",
      "name": "流通销售 · POST /market/groupbuy",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.groupbuy.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/groupbuy",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 48
          }
        }
      ]
    },
    {
      "id": "cap.market.market.live.script.post",
      "section": "market",
      "name": "流通销售 · POST /market/live/script",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.live.script.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/live/script",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_copywriting",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 54
          }
        }
      ]
    },
    {
      "id": "cap.market.market.logistics.no.get",
      "section": "market",
      "name": "流通销售 · GET /market/logistics/:no",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.logistics.no.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/logistics/:no",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 38
          }
        }
      ]
    },
    {
      "id": "cap.market.market.order.id.get",
      "section": "market",
      "name": "流通销售 · GET /market/order/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.order.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/order/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 36
          }
        }
      ]
    },
    {
      "id": "cap.market.market.order.id.status.put",
      "section": "market",
      "name": "流通销售 · PUT /market/order/:id/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.order.id.status.put",
          "version": "v1",
          "method": "PUT",
          "path": "/market/order/:id/status",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 37
          }
        }
      ]
    },
    {
      "id": "cap.market.market.order.list.get",
      "section": "market",
      "name": "流通销售 · GET /market/order/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.order.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/order/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 35
          }
        }
      ]
    },
    {
      "id": "cap.market.market.order.post",
      "section": "market",
      "name": "流通销售 · POST /market/order",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.order.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/order",
          "auth": "required",
          "roles": null,
          "switchKey": "market_order",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 34
          }
        }
      ]
    },
    {
      "id": "cap.market.market.package.generate.post",
      "section": "market",
      "name": "流通销售 · POST /market/package/generate",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.package.generate.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/package/generate",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_copywriting",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 53
          }
        }
      ]
    },
    {
      "id": "cap.market.market.price.get",
      "section": "market",
      "name": "流通销售 · GET /market/price",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.price.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/price",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 16
          }
        }
      ]
    },
    {
      "id": "cap.market.market.price.predict.get",
      "section": "market",
      "name": "流通销售 · GET /market/price/predict",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.price.predict.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/price/predict",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 18
          }
        }
      ]
    },
    {
      "id": "cap.market.market.price.trend.get",
      "section": "market",
      "name": "流通销售 · GET /market/price/trend",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.price.trend.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/price/trend",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 17
          }
        }
      ]
    },
    {
      "id": "cap.market.market.product.id.delete",
      "section": "market",
      "name": "流通销售 · DELETE /market/product/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.product.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/market/product/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.market.market.product.id.get",
      "section": "market",
      "name": "流通销售 · GET /market/product/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.product.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/product/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 28
          }
        }
      ]
    },
    {
      "id": "cap.market.market.product.id.put",
      "section": "market",
      "name": "流通销售 · PUT /market/product/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.product.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/market/product/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.market.market.product.list.get",
      "section": "market",
      "name": "流通销售 · GET /market/product/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.product.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/product/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 26
          }
        }
      ]
    },
    {
      "id": "cap.market.market.product.mine.get",
      "section": "market",
      "name": "流通销售 · GET /market/product/mine",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.product.mine.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/product/mine",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.market.market.product.post",
      "section": "market",
      "name": "流通销售 · POST /market/product",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.product.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/product",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 29
          }
        }
      ]
    },
    {
      "id": "cap.market.market.trace.code.get",
      "section": "market",
      "name": "流通销售 · GET /market/trace/:code",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.trace.code.get",
          "version": "v1",
          "method": "GET",
          "path": "/market/trace/:code",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 23
          }
        }
      ]
    },
    {
      "id": "cap.market.market.trace.code.record.post",
      "section": "market",
      "name": "流通销售 · POST /market/trace/:code/record",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.trace.code.record.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/trace/:code/record",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 42
          }
        }
      ]
    },
    {
      "id": "cap.market.market.trace.generate.post",
      "section": "market",
      "name": "流通销售 · POST /market/trace/generate",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.market.market.trace.generate.post",
          "version": "v1",
          "method": "POST",
          "path": "/market/trace/generate",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/market/market.routes.js",
            "line": 41
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.ai-assistant.config.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/ai-assistant/config",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.ai-assistant.config.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/ai-assistant/config",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 65
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.ai-assistant.config.put",
      "section": "platform",
      "name": "平台服务 · PUT /admin/ai-assistant/config",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.ai-assistant.config.put",
          "version": "v1",
          "method": "PUT",
          "path": "/admin/ai-assistant/config",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 66
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.ai-assistant.test.post",
      "section": "platform",
      "name": "平台服务 · POST /admin/ai-assistant/test",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.ai-assistant.test.post",
          "version": "v1",
          "method": "POST",
          "path": "/admin/ai-assistant/test",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 67
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.api-switch.categories.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/api-switch/categories",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.api-switch.categories.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/api-switch/categories",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 60
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.api-switch.id.delete",
      "section": "platform",
      "name": "平台服务 · DELETE /admin/api-switch/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.api-switch.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/admin/api-switch/:id",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 64
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.api-switch.id.put",
      "section": "platform",
      "name": "平台服务 · PUT /admin/api-switch/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.api-switch.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/admin/api-switch/:id",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 62
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.api-switch.id.toggle.put",
      "section": "platform",
      "name": "平台服务 · PUT /admin/api-switch/:id/toggle",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.api-switch.id.toggle.put",
          "version": "v1",
          "method": "PUT",
          "path": "/admin/api-switch/:id/toggle",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 63
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.api-switch.list.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/api-switch/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.api-switch.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/api-switch/list",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 59
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.api-switch.post",
      "section": "platform",
      "name": "平台服务 · POST /admin/api-switch",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.api-switch.post",
          "version": "v1",
          "method": "POST",
          "path": "/admin/api-switch",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 61
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.operation-log.list.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/operation-log/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.operation-log.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/operation-log/list",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 68
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.rate-limit.status.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/rate-limit/status",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.rate-limit.status.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/rate-limit/status",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 69
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.index.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/resource/index",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.index.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/resource/index",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 75
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.resource.config.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/resource/:resource/config",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.resource.config.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/resource/:resource/config",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 76
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.resource.id.delete",
      "section": "platform",
      "name": "平台服务 · DELETE /admin/resource/:resource/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.resource.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/admin/resource/:resource/:id",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 81
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.resource.id.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/resource/:resource/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.resource.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/resource/:resource/:id",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 78
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.resource.id.put",
      "section": "platform",
      "name": "平台服务 · PUT /admin/resource/:resource/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.resource.id.put",
          "version": "v1",
          "method": "PUT",
          "path": "/admin/resource/:resource/:id",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 80
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.resource.list.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/resource/:resource/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.resource.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/resource/:resource/list",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 77
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.resource.resource.post",
      "section": "platform",
      "name": "平台服务 · POST /admin/resource/:resource",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.resource.resource.post",
          "version": "v1",
          "method": "POST",
          "path": "/admin/resource/:resource",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 79
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.security.password-reset-code.post",
      "section": "platform",
      "name": "平台服务 · POST /admin/security/password-reset-code",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.security.password-reset-code.post",
          "version": "v1",
          "method": "POST",
          "path": "/admin/security/password-reset-code",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 71
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.security.revoke-sessions.post",
      "section": "platform",
      "name": "平台服务 · POST /admin/security/revoke-sessions",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.security.revoke-sessions.post",
          "version": "v1",
          "method": "POST",
          "path": "/admin/security/revoke-sessions",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 72
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.seed.summary.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/seed/summary",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.seed.summary.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/seed/summary",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 70
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.site.startup-ad.get",
      "section": "platform",
      "name": "平台服务 · GET /admin/site/startup-ad",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.site.startup-ad.get",
          "version": "v1",
          "method": "GET",
          "path": "/admin/site/startup-ad",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 73
          }
        }
      ]
    },
    {
      "id": "cap.platform.admin.site.startup-ad.put",
      "section": "platform",
      "name": "平台服务 · PUT /admin/site/startup-ad",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.admin.site.startup-ad.put",
          "version": "v1",
          "method": "PUT",
          "path": "/admin/site/startup-ad",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 74
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.login.post",
      "section": "platform",
      "name": "平台服务 · POST /auth/login",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.login.post",
          "version": "v1",
          "method": "POST",
          "path": "/auth/login",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 26
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.logout.post",
      "section": "platform",
      "name": "平台服务 · POST /auth/logout",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.logout.post",
          "version": "v1",
          "method": "POST",
          "path": "/auth/logout",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.me.get",
      "section": "platform",
      "name": "平台服务 · GET /auth/me",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.me.get",
          "version": "v1",
          "method": "GET",
          "path": "/auth/me",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.refresh.post",
      "section": "platform",
      "name": "平台服务 · POST /auth/refresh",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.refresh.post",
          "version": "v1",
          "method": "POST",
          "path": "/auth/refresh",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 28
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.register.post",
      "section": "platform",
      "name": "平台服务 · POST /auth/register",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.register.post",
          "version": "v1",
          "method": "POST",
          "path": "/auth/register",
          "auth": "optional",
          "roles": null,
          "switchKey": "user_register",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.reset-password.post",
      "section": "platform",
      "name": "平台服务 · POST /auth/reset-password",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.reset-password.post",
          "version": "v1",
          "method": "POST",
          "path": "/auth/reset-password",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.sessions.delete",
      "section": "platform",
      "name": "平台服务 · DELETE /auth/sessions",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.sessions.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/auth/sessions",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 33
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.sessions.get",
      "section": "platform",
      "name": "平台服务 · GET /auth/sessions",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.sessions.get",
          "version": "v1",
          "method": "GET",
          "path": "/auth/sessions",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 32
          }
        }
      ]
    },
    {
      "id": "cap.platform.auth.sessions.id.delete",
      "section": "platform",
      "name": "平台服务 · DELETE /auth/sessions/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.auth.sessions.id.delete",
          "version": "v1",
          "method": "DELETE",
          "path": "/auth/sessions/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 34
          }
        }
      ]
    },
    {
      "id": "cap.platform.feedback.list.get",
      "section": "platform",
      "name": "平台服务 · GET /feedback/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.feedback.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/feedback/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 53
          }
        }
      ]
    },
    {
      "id": "cap.platform.feedback.post",
      "section": "platform",
      "name": "平台服务 · POST /feedback",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.feedback.post",
          "version": "v1",
          "method": "POST",
          "path": "/feedback",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 52
          }
        }
      ]
    },
    {
      "id": "cap.platform.notification.id.read.put",
      "section": "platform",
      "name": "平台服务 · PUT /notification/:id/read",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.notification.id.read.put",
          "version": "v1",
          "method": "PUT",
          "path": "/notification/:id/read",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 49
          }
        }
      ]
    },
    {
      "id": "cap.platform.notification.list.get",
      "section": "platform",
      "name": "平台服务 · GET /notification/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.notification.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/notification/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 46
          }
        }
      ]
    },
    {
      "id": "cap.platform.notification.read-all.put",
      "section": "platform",
      "name": "平台服务 · PUT /notification/read-all",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.notification.read-all.put",
          "version": "v1",
          "method": "PUT",
          "path": "/notification/read-all",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 48
          }
        }
      ]
    },
    {
      "id": "cap.platform.notification.unread.get",
      "section": "platform",
      "name": "平台服务 · GET /notification/unread",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.notification.unread.get",
          "version": "v1",
          "method": "GET",
          "path": "/notification/unread",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 47
          }
        }
      ]
    },
    {
      "id": "cap.platform.search.get",
      "section": "platform",
      "name": "平台服务 · GET /search",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.search.get",
          "version": "v1",
          "method": "GET",
          "path": "/search",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 56
          }
        }
      ]
    },
    {
      "id": "cap.platform.site.auth-background.get",
      "section": "platform",
      "name": "平台服务 · GET /site/auth-background",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.site.auth-background.get",
          "version": "v1",
          "method": "GET",
          "path": "/site/auth-background",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.platform.site.images.get",
      "section": "platform",
      "name": "平台服务 · GET /site/images",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.site.images.get",
          "version": "v1",
          "method": "GET",
          "path": "/site/images",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 18
          }
        }
      ]
    },
    {
      "id": "cap.platform.site.images.key.post",
      "section": "platform",
      "name": "平台服务 · POST /site/images/:key",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.site.images.key.post",
          "version": "v1",
          "method": "POST",
          "path": "/site/images/:key",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 21
          }
        }
      ]
    },
    {
      "id": "cap.platform.site.startup-ad.get",
      "section": "platform",
      "name": "平台服务 · GET /site/startup-ad",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.site.startup-ad.get",
          "version": "v1",
          "method": "GET",
          "path": "/site/startup-ad",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.platform.upload.image.post",
      "section": "platform",
      "name": "平台服务 · POST /upload/image",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.upload.image.post",
          "version": "v1",
          "method": "POST",
          "path": "/upload/image",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 43
          }
        }
      ]
    },
    {
      "id": "cap.platform.user.growth.get",
      "section": "platform",
      "name": "平台服务 · GET /user/growth",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.user.growth.get",
          "version": "v1",
          "method": "GET",
          "path": "/user/growth",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 42
          }
        }
      ]
    },
    {
      "id": "cap.platform.user.password.put",
      "section": "platform",
      "name": "平台服务 · PUT /user/password",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.user.password.put",
          "version": "v1",
          "method": "PUT",
          "path": "/user/password",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 39
          }
        }
      ]
    },
    {
      "id": "cap.platform.user.points.get",
      "section": "platform",
      "name": "平台服务 · GET /user/points",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.user.points.get",
          "version": "v1",
          "method": "GET",
          "path": "/user/points",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 40
          }
        }
      ]
    },
    {
      "id": "cap.platform.user.points.log.get",
      "section": "platform",
      "name": "平台服务 · GET /user/points/log",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.user.points.log.get",
          "version": "v1",
          "method": "GET",
          "path": "/user/points/log",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 41
          }
        }
      ]
    },
    {
      "id": "cap.platform.user.profile.get",
      "section": "platform",
      "name": "平台服务 · GET /user/profile",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.user.profile.get",
          "version": "v1",
          "method": "GET",
          "path": "/user/profile",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 37
          }
        }
      ]
    },
    {
      "id": "cap.platform.user.profile.put",
      "section": "platform",
      "name": "平台服务 · PUT /user/profile",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.platform.user.profile.put",
          "version": "v1",
          "method": "PUT",
          "path": "/user/profile",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/platform/platform.routes.js",
            "line": 38
          }
        }
      ]
    },
    {
      "id": "cap.policy.party.learn.log.get",
      "section": "policy",
      "name": "惠农政策 · GET /party/learn/log",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.party.learn.log.get",
          "version": "v1",
          "method": "GET",
          "path": "/party/learn/log",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 33
          }
        }
      ]
    },
    {
      "id": "cap.policy.party.lesson.id.finish.post",
      "section": "policy",
      "name": "惠农政策 · POST /party/lesson/:id/finish",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.party.lesson.id.finish.post",
          "version": "v1",
          "method": "POST",
          "path": "/party/lesson/:id/finish",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 32
          }
        }
      ]
    },
    {
      "id": "cap.policy.party.lesson.id.get",
      "section": "policy",
      "name": "惠农政策 · GET /party/lesson/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.party.lesson.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/party/lesson/:id",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 31
          }
        }
      ]
    },
    {
      "id": "cap.policy.party.lesson.list.get",
      "section": "policy",
      "name": "惠农政策 · GET /party/lesson/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.party.lesson.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/party/lesson/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 30
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.ai.ask.post",
      "section": "policy",
      "name": "惠农政策 · POST /policy/ai/ask",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.ai.ask.post",
          "version": "v1",
          "method": "POST",
          "path": "/policy/ai/ask",
          "auth": "required",
          "roles": null,
          "switchKey": "ai_policy_qa",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 19
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.id.get",
      "section": "policy",
      "name": "惠农政策 · GET /policy/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/policy/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 27
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.legal.ask.post",
      "section": "policy",
      "name": "惠农政策 · POST /policy/legal/ask",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.legal.ask.post",
          "version": "v1",
          "method": "POST",
          "path": "/policy/legal/ask",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 20
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.list.get",
      "section": "policy",
      "name": "惠农政策 · GET /policy/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/policy/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 12
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.points.exchange.post",
      "section": "policy",
      "name": "惠农政策 · POST /policy/points/exchange",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.points.exchange.post",
          "version": "v1",
          "method": "POST",
          "path": "/policy/points/exchange",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 25
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.points.items.get",
      "section": "policy",
      "name": "惠农政策 · GET /policy/points/items",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.points.items.get",
          "version": "v1",
          "method": "GET",
          "path": "/policy/points/items",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 24
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.points.rank.get",
      "section": "policy",
      "name": "惠农政策 · GET /policy/points/rank",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.points.rank.get",
          "version": "v1",
          "method": "GET",
          "path": "/policy/points/rank",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 23
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.subsidy.apply.post",
      "section": "policy",
      "name": "惠农政策 · POST /policy/subsidy/apply",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.subsidy.apply.post",
          "version": "v1",
          "method": "POST",
          "path": "/policy/subsidy/apply",
          "auth": "required",
          "roles": null,
          "switchKey": "subsidy_apply",
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 15
          }
        }
      ]
    },
    {
      "id": "cap.policy.policy.subsidy.list.get",
      "section": "policy",
      "name": "惠农政策 · GET /policy/subsidy/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.policy.subsidy.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/policy/subsidy/list",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 16
          }
        }
      ]
    },
    {
      "id": "cap.policy.talent.list.get",
      "section": "policy",
      "name": "惠农政策 · GET /talent/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.talent.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/talent/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 52
          }
        }
      ]
    },
    {
      "id": "cap.policy.talent.post",
      "section": "policy",
      "name": "惠农政策 · POST /talent",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.talent.post",
          "version": "v1",
          "method": "POST",
          "path": "/talent",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 53
          }
        }
      ]
    },
    {
      "id": "cap.policy.training.course.id.enroll.post",
      "section": "policy",
      "name": "惠农政策 · POST /training/course/:id/enroll",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.training.course.id.enroll.post",
          "version": "v1",
          "method": "POST",
          "path": "/training/course/:id/enroll",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 48
          }
        }
      ]
    },
    {
      "id": "cap.policy.training.course.id.get",
      "section": "policy",
      "name": "惠农政策 · GET /training/course/:id",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.training.course.id.get",
          "version": "v1",
          "method": "GET",
          "path": "/training/course/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 47
          }
        }
      ]
    },
    {
      "id": "cap.policy.training.course.id.progress.post",
      "section": "policy",
      "name": "惠农政策 · POST /training/course/:id/progress",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.training.course.id.progress.post",
          "version": "v1",
          "method": "POST",
          "path": "/training/course/:id/progress",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 49
          }
        }
      ]
    },
    {
      "id": "cap.policy.training.course.list.get",
      "section": "policy",
      "name": "惠农政策 · GET /training/course/list",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.training.course.list.get",
          "version": "v1",
          "method": "GET",
          "path": "/training/course/list",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 45
          }
        }
      ]
    },
    {
      "id": "cap.policy.training.my.get",
      "section": "policy",
      "name": "惠农政策 · GET /training/my",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.training.my.get",
          "version": "v1",
          "method": "GET",
          "path": "/training/my",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 46
          }
        }
      ]
    },
    {
      "id": "cap.policy.village.affairs.get",
      "section": "policy",
      "name": "惠农政策 · GET /village/affairs",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.village.affairs.get",
          "version": "v1",
          "method": "GET",
          "path": "/village/affairs",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 36
          }
        }
      ]
    },
    {
      "id": "cap.policy.village.affairs.post",
      "section": "policy",
      "name": "惠农政策 · POST /village/affairs",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.village.affairs.post",
          "version": "v1",
          "method": "POST",
          "path": "/village/affairs",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 37
          }
        }
      ]
    },
    {
      "id": "cap.policy.village.honor.get",
      "section": "policy",
      "name": "惠农政策 · GET /village/honor",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.village.honor.get",
          "version": "v1",
          "method": "GET",
          "path": "/village/honor",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 40
          }
        }
      ]
    },
    {
      "id": "cap.policy.village.honor.id.vote.post",
      "section": "policy",
      "name": "惠农政策 · POST /village/honor/:id/vote",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.village.honor.id.vote.post",
          "version": "v1",
          "method": "POST",
          "path": "/village/honor/:id/vote",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 42
          }
        }
      ]
    },
    {
      "id": "cap.policy.village.honor.post",
      "section": "policy",
      "name": "惠农政策 · POST /village/honor",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.policy.village.honor.post",
          "version": "v1",
          "method": "POST",
          "path": "/village/honor",
          "auth": "required",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/modules/policy/policy.routes.js",
            "line": 41
          }
        }
      ]
    },
    {
      "id": "cap.system.ping.get",
      "section": "system",
      "name": "系统 · GET /ping",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.system.ping.get",
          "version": "v1",
          "method": "GET",
          "path": "/ping",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": null,
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null,
          "v1": {
            "routesFile": "src/routes/index.js",
            "line": 22
          }
        }
      ]
    },
    {
      "id": "cap.v2.market.products",
      "section": "market",
      "name": "流通销售 · GET /market/products（v2 商品列表）",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.v2.market.products",
          "version": "v2",
          "method": "GET",
          "path": "/market/products",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": "global",
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null
        }
      ]
    },
    {
      "id": "cap.v2.market.products.detail",
      "section": "market",
      "name": "流通销售 · GET /market/products/:id（v2 商品详情）",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.v2.market.products.detail",
          "version": "v2",
          "method": "GET",
          "path": "/market/products/:id",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": "global",
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null
        }
      ]
    },
    {
      "id": "cap.v2.system.api-catalog",
      "section": "system",
      "name": "系统 · GET /api-catalog（API 目录）",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.v2.system.api-catalog",
          "version": "v2",
          "method": "GET",
          "path": "/api-catalog",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": "global",
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null
        }
      ]
    },
    {
      "id": "cap.v2.system.capabilities",
      "section": "system",
      "name": "系统 · GET /capabilities（能力注册表目录）",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.v2.system.capabilities",
          "version": "v2",
          "method": "GET",
          "path": "/capabilities",
          "auth": "required",
          "roles": [
            "ADMIN"
          ],
          "switchKey": null,
          "ratePlan": "global",
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null
        }
      ]
    },
    {
      "id": "cap.v2.system.ping",
      "section": "system",
      "name": "系统 · GET /ping（v2 健康探针）",
      "aliases": [],
      "enabled": true,
      "regionScoped": false,
      "deprecated": false,
      "apis": [
        {
          "apiId": "api.v2.system.ping",
          "version": "v2",
          "method": "GET",
          "path": "/ping",
          "auth": "optional",
          "roles": null,
          "switchKey": null,
          "ratePlan": "global",
          "deprecated": false,
          "deprecatedSince": null,
          "sunset": null
        }
      ]
    }
  ],
  "featureCatalog": {
    "sections": {
      "agri": "AI 农业生产",
      "market": "流通销售",
      "machinery": "农机共享",
      "disaster": "气象灾害",
      "policy": "惠农政策",
      "life": "乡村生活",
      "data": "数据管理",
      "ai": "AI 助手"
    },
    "routes": [
      {
        "key": "home",
        "label": "首页",
        "path": "/home"
      },
      {
        "key": "all",
        "label": "全部服务",
        "path": "/all"
      },
      {
        "key": "search",
        "label": "全局搜索",
        "path": "/search"
      },
      {
        "key": "ai",
        "label": "AI 农技",
        "path": "/ai"
      },
      {
        "key": "ai_chat",
        "label": "新建 AI 对话",
        "path": "/ai/chat/new"
      },
      {
        "key": "market",
        "label": "乡村集市",
        "path": "/market"
      },
      {
        "key": "orders",
        "label": "我的订单",
        "path": "/market/orders"
      },
      {
        "key": "market_service",
        "label": "集市服务工具",
        "path": "/market/service"
      },
      {
        "key": "machinery",
        "label": "农机共享",
        "path": "/machinery"
      },
      {
        "key": "machinery_service",
        "label": "农机服务工具",
        "path": "/machinery/service"
      },
      {
        "key": "policy",
        "label": "惠农政策",
        "path": "/policy"
      },
      {
        "key": "policy_service",
        "label": "政策服务工具",
        "path": "/policy/service"
      },
      {
        "key": "disaster",
        "label": "气象灾害",
        "path": "/disaster"
      },
      {
        "key": "agri",
        "label": "农业生产",
        "path": "/agri"
      },
      {
        "key": "agri_diagnose",
        "label": "拍照识病",
        "path": "/agri/diagnose"
      },
      {
        "key": "life",
        "label": "乡村生活",
        "path": "/life"
      },
      {
        "key": "data",
        "label": "数据看板",
        "path": "/data"
      },
      {
        "key": "data_service",
        "label": "数据服务工具",
        "path": "/data/service"
      },
      {
        "key": "iot",
        "label": "模拟 IoT 看板",
        "path": "/iot"
      },
      {
        "key": "publish",
        "label": "发布",
        "path": "/publish"
      },
      {
        "key": "messages",
        "label": "消息",
        "path": "/messages"
      },
      {
        "key": "profile",
        "label": "我的",
        "path": "/profile"
      },
      {
        "key": "settings",
        "label": "设置中心",
        "path": "/profile/settings"
      },
      {
        "key": "account",
        "label": "账号资料",
        "path": "/profile/settings/account"
      },
      {
        "key": "account_edit",
        "label": "编辑资料",
        "path": "/profile/settings/account/edit"
      },
      {
        "key": "password",
        "label": "修改密码",
        "path": "/profile/settings/password"
      },
      {
        "key": "push_settings",
        "label": "消息推送设置",
        "path": "/profile/settings/push"
      },
      {
        "key": "weather_alert",
        "label": "天气提醒设置",
        "path": "/profile/settings/weather"
      },
      {
        "key": "storage",
        "label": "存储管理",
        "path": "/profile/settings/storage"
      },
      {
        "key": "about",
        "label": "关于田园通",
        "path": "/profile/settings/about"
      },
      {
        "key": "privacy",
        "label": "隐私设置",
        "path": "/profile/settings/privacy"
      },
      {
        "key": "help",
        "label": "帮助与反馈",
        "path": "/profile/settings/help"
      },
      {
        "key": "elder_mode",
        "label": "适老模式",
        "path": "/profile/settings/elder"
      },
      {
        "key": "screen",
        "label": "村级数字驾驶舱",
        "path": "/screen"
      }
    ],
    "routeFeatures": {
      "agri_diagnose": [
        "病虫害识别",
        "拍照识病",
        "叶片识别",
        "植保诊断"
      ],
      "agri": [
        "作物长势监测",
        "杂草识别",
        "种子检测",
        "智能施肥",
        "施肥配方",
        "灌溉计划",
        "浇水",
        "产量预测",
        "农事日历",
        "节气农时",
        "农药安全查询",
        "用药间隔",
        "地块管理",
        "田块",
        "农事记录",
        "打药记录",
        "碳排放核算"
      ],
      "iot": [
        "智能物联",
        "物联网",
        "传感器",
        "设备监测",
        "田间监测",
        "设备联动",
        "自动灌溉",
        "联动规则"
      ],
      "market": [
        "乡村集市",
        "商城",
        "买卖下单",
        "实时行情",
        "农产品价格",
        "报价"
      ],
      "market_service": [
        "价格预测",
        "期货行情",
        "出口合规",
        "收购站地图",
        "农资团购",
        "AI质量分级",
        "品控",
        "直播话术",
        "带货",
        "包装文案",
        "溯源码",
        "追溯",
        "物流查询",
        "快递运输"
      ],
      "machinery": [
        "农机租赁",
        "拖拉机",
        "收割机",
        "找农机"
      ],
      "machinery_service": [
        "维保提醒",
        "保养",
        "故障诊断",
        "农机维修",
        "作业轨迹",
        "成本核算",
        "土地流转",
        "机手认证",
        "农机保险"
      ],
      "disaster": [
        "极端天气预警",
        "天气预报",
        "气象",
        "暴雨",
        "灾情上报",
        "受灾",
        "保险理赔",
        "应急预案",
        "冻害防护",
        "霜冻",
        "火险预警",
        "干旱指数",
        "旱情",
        "一键求助",
        "SOS",
        "紧急求助"
      ],
      "policy": [
        "政策推送",
        "惠农政策",
        "三农",
        "党建学习",
        "村务公开",
        "文明乡风榜"
      ],
      "policy_service": [
        "补贴申请",
        "补助",
        "政策AI问答",
        "法律咨询",
        "普法维权",
        "职业农民培训",
        "课程"
      ],
      "life": [
        "村医问诊",
        "看病健康",
        "快递代收",
        "取件",
        "就业平台",
        "招工找工作",
        "水电气缴费",
        "水费电费",
        "乡村旅游",
        "农家乐",
        "养老关爱",
        "农业贷款",
        "金融借款",
        "教育辅导",
        "邻里互助",
        "二手交易",
        "闲置转让",
        "民俗记录",
        "非遗文化",
        "环境举报",
        "污染举报"
      ],
      "data": [
        "农情数据看板",
        "驾驶舱",
        "遥感分析",
        "卫星NDVI"
      ],
      "data_service": [
        "农事年度报告",
        "统计上报",
        "数据同步"
      ],
      "ai_chat": [
        "AI智能问答",
        "AI助手",
        "聊天咨询"
      ],
      "ai": [
        "AI对话历史",
        "历史记录"
      ],
      "orders": [
        "我的订单",
        "订单查询",
        "查快递",
        "订单状态"
      ]
    },
    "features": [
      {
        "name": "病虫害识别",
        "keywords": [
          "病虫害",
          "识病",
          "拍照识别",
          "叶片",
          "植保"
        ],
        "routeKey": "agri_diagnose",
        "route": "/agri/diagnose",
        "icon": "biotech_outlined",
        "section": "agri"
      },
      {
        "name": "作物长势监测",
        "keywords": [
          "长势",
          "监测",
          "作物"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "eco_outlined",
        "section": "agri"
      },
      {
        "name": "杂草识别",
        "keywords": [
          "杂草",
          "除草"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "grass_outlined",
        "section": "agri"
      },
      {
        "name": "种子检测",
        "keywords": [
          "种子",
          "发芽率"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "spa_outlined",
        "section": "agri"
      },
      {
        "name": "智能施肥",
        "keywords": [
          "施肥",
          "肥料",
          "配方"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "science_outlined",
        "section": "agri"
      },
      {
        "name": "灌溉计划",
        "keywords": [
          "灌溉",
          "浇水",
          "排灌"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "water_drop_outlined",
        "section": "agri"
      },
      {
        "name": "产量预测",
        "keywords": [
          "产量",
          "预测",
          "收成"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "trending_up",
        "section": "agri"
      },
      {
        "name": "农事日历",
        "keywords": [
          "农事",
          "日历",
          "节气",
          "农时"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "calendar_month_outlined",
        "section": "agri"
      },
      {
        "name": "农药安全查询",
        "keywords": [
          "农药",
          "安全间隔",
          "用药"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "medication_outlined",
        "section": "agri"
      },
      {
        "name": "地块管理",
        "keywords": [
          "地块",
          "GIS",
          "田块"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "map_outlined",
        "section": "agri"
      },
      {
        "name": "农事记录",
        "keywords": [
          "农事记录",
          "打药",
          "记录"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "note_alt_outlined",
        "section": "agri"
      },
      {
        "name": "碳排放核算",
        "keywords": [
          "碳排放",
          "碳",
          "减排"
        ],
        "routeKey": "agri",
        "route": "/agri",
        "icon": "co2",
        "section": "agri"
      },
      {
        "name": "智能物联",
        "keywords": [
          "物联",
          "物联网",
          "IoT",
          "传感器",
          "设备监测",
          "智能监测",
          "田间监测"
        ],
        "routeKey": "iot",
        "route": "/iot",
        "icon": "sensors_rounded",
        "section": "agri"
      },
      {
        "name": "设备联动",
        "keywords": [
          "设备联动",
          "联动",
          "联动规则",
          "自动灌溉",
          "智能联动",
          "物联联动"
        ],
        "routeKey": "iot",
        "route": "/iot",
        "icon": "bolt_rounded",
        "section": "agri"
      },
      {
        "name": "实时行情",
        "keywords": [
          "行情",
          "价格",
          "报价"
        ],
        "routeKey": "market",
        "route": "/market",
        "icon": "show_chart",
        "section": "market"
      },
      {
        "name": "乡村集市",
        "keywords": [
          "集市",
          "商城",
          "买卖",
          "下单"
        ],
        "routeKey": "market",
        "route": "/market",
        "icon": "storefront_outlined",
        "section": "market"
      },
      {
        "name": "价格预测",
        "keywords": [
          "价格预测",
          "趋势"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "query_stats",
        "section": "market"
      },
      {
        "name": "期货行情",
        "keywords": [
          "期货"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "candlestick_chart",
        "section": "market"
      },
      {
        "name": "出口合规",
        "keywords": [
          "出口",
          "合规",
          "外贸"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "public",
        "section": "market"
      },
      {
        "name": "收购站地图",
        "keywords": [
          "收购",
          "收购站"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "store_outlined",
        "section": "market"
      },
      {
        "name": "农资团购",
        "keywords": [
          "团购",
          "农资"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "groups_outlined",
        "section": "market"
      },
      {
        "name": "AI 质量分级",
        "keywords": [
          "质量分级",
          "分级",
          "品控"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "grade_outlined",
        "section": "market"
      },
      {
        "name": "直播话术",
        "keywords": [
          "直播",
          "话术",
          "带货"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "mic_none_outlined",
        "section": "market"
      },
      {
        "name": "包装文案",
        "keywords": [
          "包装",
          "文案"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "inventory_2_outlined",
        "section": "market"
      },
      {
        "name": "溯源码",
        "keywords": [
          "溯源",
          "追溯"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "qr_code_2",
        "section": "market"
      },
      {
        "name": "物流查询",
        "keywords": [
          "物流",
          "快递",
          "运输"
        ],
        "routeKey": "market_service",
        "route": "/market/service",
        "icon": "local_shipping_outlined",
        "section": "market"
      },
      {
        "name": "农机租赁",
        "keywords": [
          "农机",
          "租赁",
          "拖拉机",
          "收割机"
        ],
        "routeKey": "machinery",
        "route": "/machinery",
        "icon": "agriculture_outlined",
        "section": "machinery"
      },
      {
        "name": "维保提醒",
        "keywords": [
          "维保",
          "保养"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "build_outlined",
        "section": "machinery"
      },
      {
        "name": "故障诊断",
        "keywords": [
          "故障",
          "诊断",
          "维修"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "handyman_outlined",
        "section": "machinery"
      },
      {
        "name": "作业轨迹",
        "keywords": [
          "轨迹",
          "作业"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "route_outlined",
        "section": "machinery"
      },
      {
        "name": "成本核算",
        "keywords": [
          "成本",
          "核算"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "calculate_outlined",
        "section": "machinery"
      },
      {
        "name": "土地流转",
        "keywords": [
          "土地流转",
          "流转"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "swap_horiz",
        "section": "machinery"
      },
      {
        "name": "机手认证",
        "keywords": [
          "机手",
          "认证"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "verified_user_outlined",
        "section": "machinery"
      },
      {
        "name": "农机保险",
        "keywords": [
          "农机保险",
          "保险"
        ],
        "routeKey": "machinery_service",
        "route": "/machinery/service",
        "icon": "shield_outlined",
        "section": "machinery"
      },
      {
        "name": "极端天气预警",
        "keywords": [
          "天气",
          "预警",
          "气象",
          "暴雨"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "thunderstorm_outlined",
        "section": "disaster"
      },
      {
        "name": "灾情上报",
        "keywords": [
          "灾情",
          "上报",
          "受灾"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "report_outlined",
        "section": "disaster"
      },
      {
        "name": "保险理赔",
        "keywords": [
          "理赔",
          "保险"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "assignment_turned_in_outlined",
        "section": "disaster"
      },
      {
        "name": "应急预案",
        "keywords": [
          "应急",
          "预案"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "emergency_outlined",
        "section": "disaster"
      },
      {
        "name": "冻害防护",
        "keywords": [
          "冻害",
          "霜冻",
          "防冻"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "ac_unit",
        "section": "disaster"
      },
      {
        "name": "火险预警",
        "keywords": [
          "火险",
          "火灾"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "local_fire_department_outlined",
        "section": "disaster"
      },
      {
        "name": "干旱指数",
        "keywords": [
          "干旱",
          "旱情"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "wb_sunny_outlined",
        "section": "disaster"
      },
      {
        "name": "一键求助",
        "keywords": [
          "求助",
          "SOS",
          "紧急"
        ],
        "routeKey": "disaster",
        "route": "/disaster",
        "icon": "sos_outlined",
        "section": "disaster"
      },
      {
        "name": "政策推送",
        "keywords": [
          "政策",
          "惠农",
          "三农"
        ],
        "routeKey": "policy",
        "route": "/policy",
        "icon": "account_balance_outlined",
        "section": "policy"
      },
      {
        "name": "补贴申请",
        "keywords": [
          "补贴",
          "申请",
          "补助"
        ],
        "routeKey": "policy_service",
        "route": "/policy/service",
        "icon": "fact_check_outlined",
        "section": "policy"
      },
      {
        "name": "政策 AI 问答",
        "keywords": [
          "政策问答",
          "咨询"
        ],
        "routeKey": "policy_service",
        "route": "/policy/service",
        "icon": "question_answer_outlined",
        "section": "policy"
      },
      {
        "name": "党建学习",
        "keywords": [
          "党建",
          "学习",
          "打卡"
        ],
        "routeKey": "policy",
        "route": "/policy",
        "icon": "flag_outlined",
        "section": "policy"
      },
      {
        "name": "村务公开",
        "keywords": [
          "村务",
          "公开"
        ],
        "routeKey": "policy",
        "route": "/policy",
        "icon": "campaign_outlined",
        "section": "policy"
      },
      {
        "name": "文明乡风榜",
        "keywords": [
          "文明",
          "乡风",
          "榜"
        ],
        "routeKey": "policy",
        "route": "/policy",
        "icon": "emoji_events_outlined",
        "section": "policy"
      },
      {
        "name": "法律咨询",
        "keywords": [
          "法律",
          "普法",
          "维权"
        ],
        "routeKey": "policy_service",
        "route": "/policy/service",
        "icon": "gavel_outlined",
        "section": "policy"
      },
      {
        "name": "职业农民培训",
        "keywords": [
          "培训",
          "职业农民",
          "课程"
        ],
        "routeKey": "policy_service",
        "route": "/policy/service",
        "icon": "school_outlined",
        "section": "policy"
      },
      {
        "name": "村医问诊",
        "keywords": [
          "村医",
          "问诊",
          "看病",
          "健康"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "medical_services_outlined",
        "section": "life"
      },
      {
        "name": "快递代收",
        "keywords": [
          "快递",
          "代收",
          "取件"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "local_post_office_outlined",
        "section": "life"
      },
      {
        "name": "就业平台",
        "keywords": [
          "就业",
          "招工",
          "找工作"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "work_outline",
        "section": "life"
      },
      {
        "name": "水电气缴费",
        "keywords": [
          "缴费",
          "水电",
          "水费",
          "电费"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "receipt_long_outlined",
        "section": "life"
      },
      {
        "name": "乡村旅游",
        "keywords": [
          "旅游",
          "农家乐"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "landscape_outlined",
        "section": "life"
      },
      {
        "name": "养老关爱",
        "keywords": [
          "养老",
          "关爱",
          "老人"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "elderly",
        "section": "life"
      },
      {
        "name": "农业贷款",
        "keywords": [
          "贷款",
          "金融",
          "借款"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "savings_outlined",
        "section": "life"
      },
      {
        "name": "教育辅导",
        "keywords": [
          "教育",
          "辅导",
          "上学"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "menu_book_outlined",
        "section": "life"
      },
      {
        "name": "邻里互助",
        "keywords": [
          "邻里",
          "互助",
          "帮忙"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "handshake_outlined",
        "section": "life"
      },
      {
        "name": "二手交易",
        "keywords": [
          "二手",
          "闲置",
          "转让"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "sell_outlined",
        "section": "life"
      },
      {
        "name": "民俗记录",
        "keywords": [
          "民俗",
          "文化",
          "非遗"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "festival_outlined",
        "section": "life"
      },
      {
        "name": "环境举报",
        "keywords": [
          "环境",
          "举报",
          "污染"
        ],
        "routeKey": "life",
        "route": "/life",
        "icon": "eco",
        "section": "life"
      },
      {
        "name": "农情数据看板",
        "keywords": [
          "看板",
          "数据",
          "农情",
          "驾驶舱"
        ],
        "routeKey": "data",
        "route": "/data",
        "icon": "insights_outlined",
        "section": "data"
      },
      {
        "name": "农事年度报告",
        "keywords": [
          "年度报告",
          "报告"
        ],
        "routeKey": "data_service",
        "route": "/data/service",
        "icon": "event_note_outlined",
        "section": "data"
      },
      {
        "name": "统计上报",
        "keywords": [
          "统计",
          "上报"
        ],
        "routeKey": "data_service",
        "route": "/data/service",
        "icon": "upload_file_outlined",
        "section": "data"
      },
      {
        "name": "数据同步",
        "keywords": [
          "同步",
          "队列"
        ],
        "routeKey": "data_service",
        "route": "/data/service",
        "icon": "sync_alt",
        "section": "data"
      },
      {
        "name": "遥感分析",
        "keywords": [
          "遥感",
          "卫星",
          "NDVI"
        ],
        "routeKey": "data",
        "route": "/data",
        "icon": "satellite_alt_outlined",
        "section": "data"
      },
      {
        "name": "AI 智能问答",
        "keywords": [
          "AI",
          "问答",
          "助手",
          "聊天"
        ],
        "routeKey": "ai_chat",
        "route": "/ai/chat/new",
        "icon": "smart_toy_outlined",
        "section": "ai"
      },
      {
        "name": "拍照识病",
        "keywords": [
          "拍照",
          "识病",
          "植保"
        ],
        "routeKey": "agri_diagnose",
        "route": "/agri/diagnose",
        "icon": "center_focus_strong_outlined",
        "section": "ai"
      },
      {
        "name": "AI 对话历史",
        "keywords": [
          "历史",
          "对话",
          "记录"
        ],
        "routeKey": "ai",
        "route": "/ai",
        "icon": "history",
        "section": "ai"
      }
    ]
  }
}
