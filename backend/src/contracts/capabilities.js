// 本文件由 scripts/gen-capabilities.mjs 自动生成，请勿手工编辑。
// 重新生成：cd backend && node scripts/gen-capabilities.mjs --write
// 漂移检查：cd backend && node scripts/gen-capabilities.mjs --check
//
// 116f-B 单一能力注册表初版（schemaVersion=1）：
// - v1：全部现有路由的只读对账登记（盘点脚本生成，不改变 v1 任何行为）；
// - v2：仅 /ping、/capabilities、/api-catalog 三个骨架端点（D9）；
// - 外部响应由 routes/v2 显式投影，v1.routesFile/line 与 ratePlan/switchKey 不对外。
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
  ]
}
