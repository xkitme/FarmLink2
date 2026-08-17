// 本文件由 scripts/gen-admin-api-catalog.mjs 自动生成，请勿手工编辑。
// 重新生成：cd backend && node scripts/gen-admin-api-catalog.mjs --write
// 漂移检查：cd backend && node scripts/gen-admin-api-catalog.mjs --check
//
// 116f-E 管理台 API 目录（数据源 = backend/src/contracts/capabilities.js，gen-capabilities.mjs 的生成产物；
// - v1 条目全部由注册表生成：key=apiId，method/path/auth/roles 与注册表一致；
// - v1 调试预设（调试样例装饰：name/description/bodyNote/body/示例 path）叠加到对应条目上。
export const API_CATALOG =
[
  {
    "group": "系统",
    "items": [
      {
        "key": "api.system.ping.get",
        "name": "系统 · GET /ping",
        "method": "GET",
        "path": "/ping",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "平台服务",
    "items": [
      {
        "key": "api.platform.admin.ai-assistant.config.get",
        "name": "平台服务 · GET /admin/ai-assistant/config",
        "method": "GET",
        "path": "/admin/ai-assistant/config",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.ai-assistant.config.put",
        "name": "平台服务 · PUT /admin/ai-assistant/config",
        "method": "PUT",
        "path": "/admin/ai-assistant/config",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.ai-assistant.test.post",
        "name": "平台服务 · POST /admin/ai-assistant/test",
        "method": "POST",
        "path": "/admin/ai-assistant/test",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.api-switch.post",
        "name": "平台服务 · POST /admin/api-switch",
        "method": "POST",
        "path": "/admin/api-switch",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.api-switch.id.delete",
        "name": "平台服务 · DELETE /admin/api-switch/:id",
        "method": "DELETE",
        "path": "/admin/api-switch/:id",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.api-switch.id.put",
        "name": "平台服务 · PUT /admin/api-switch/:id",
        "method": "PUT",
        "path": "/admin/api-switch/:id",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.api-switch.id.toggle.put",
        "name": "平台服务 · PUT /admin/api-switch/:id/toggle",
        "method": "PUT",
        "path": "/admin/api-switch/:id/toggle",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.api-switch.categories.get",
        "name": "平台服务 · GET /admin/api-switch/categories",
        "method": "GET",
        "path": "/admin/api-switch/categories",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.api-switch.list.get",
        "name": "API 开关列表",
        "method": "GET",
        "path": "/admin/api-switch/list?pageNum=1&pageSize=10",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "查看可动态开启/关闭的后端能力。",
        "bodyNote": "通过 keyword、category、enabled query 参数过滤。"
      },
      {
        "key": "api.platform.admin.operation-log.list.get",
        "name": "操作日志列表",
        "method": "GET",
        "path": "/admin/operation-log/list?pageNum=1&pageSize=10",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "查看非 GET API 的审计日志。",
        "bodyNote": "通过 module、userId、keyword query 参数过滤。"
      },
      {
        "key": "api.platform.admin.rate-limit.status.get",
        "name": "限流快照",
        "method": "GET",
        "path": "/admin/rate-limit/status",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "查看内存限流策略与当前计数。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.platform.admin.resource.resource.post",
        "name": "平台服务 · POST /admin/resource/:resource",
        "method": "POST",
        "path": "/admin/resource/:resource",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.resource.resource.id.delete",
        "name": "平台服务 · DELETE /admin/resource/:resource/:id",
        "method": "DELETE",
        "path": "/admin/resource/:resource/:id",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.resource.resource.id.get",
        "name": "平台服务 · GET /admin/resource/:resource/:id",
        "method": "GET",
        "path": "/admin/resource/:resource/:id",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.resource.resource.id.put",
        "name": "平台服务 · PUT /admin/resource/:resource/:id",
        "method": "PUT",
        "path": "/admin/resource/:resource/:id",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.resource.resource.config.get",
        "name": "平台服务 · GET /admin/resource/:resource/config",
        "method": "GET",
        "path": "/admin/resource/:resource/config",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.resource.resource.list.get",
        "name": "平台服务 · GET /admin/resource/:resource/list",
        "method": "GET",
        "path": "/admin/resource/:resource/list",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.resource.index.get",
        "name": "平台服务 · GET /admin/resource/index",
        "method": "GET",
        "path": "/admin/resource/index",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.security.password-reset-code.post",
        "name": "平台服务 · POST /admin/security/password-reset-code",
        "method": "POST",
        "path": "/admin/security/password-reset-code",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.security.revoke-sessions.post",
        "name": "平台服务 · POST /admin/security/revoke-sessions",
        "method": "POST",
        "path": "/admin/security/revoke-sessions",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.seed.summary.get",
        "name": "初始化数据概览",
        "method": "GET",
        "path": "/admin/seed/summary",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "查看后台资源、初始化脚本和数据覆盖情况。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.platform.admin.site.startup-ad.get",
        "name": "平台服务 · GET /admin/site/startup-ad",
        "method": "GET",
        "path": "/admin/site/startup-ad",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.admin.site.startup-ad.put",
        "name": "平台服务 · PUT /admin/site/startup-ad",
        "method": "PUT",
        "path": "/admin/site/startup-ad",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.login.post",
        "name": "平台服务 · POST /auth/login",
        "method": "POST",
        "path": "/auth/login",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.logout.post",
        "name": "平台服务 · POST /auth/logout",
        "method": "POST",
        "path": "/auth/logout",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.me.get",
        "name": "平台服务 · GET /auth/me",
        "method": "GET",
        "path": "/auth/me",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.refresh.post",
        "name": "平台服务 · POST /auth/refresh",
        "method": "POST",
        "path": "/auth/refresh",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.register.post",
        "name": "平台服务 · POST /auth/register",
        "method": "POST",
        "path": "/auth/register",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.reset-password.post",
        "name": "平台服务 · POST /auth/reset-password",
        "method": "POST",
        "path": "/auth/reset-password",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.sessions.delete",
        "name": "平台服务 · DELETE /auth/sessions",
        "method": "DELETE",
        "path": "/auth/sessions",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.sessions.get",
        "name": "平台服务 · GET /auth/sessions",
        "method": "GET",
        "path": "/auth/sessions",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.auth.sessions.id.delete",
        "name": "平台服务 · DELETE /auth/sessions/:id",
        "method": "DELETE",
        "path": "/auth/sessions/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.feedback.post",
        "name": "平台服务 · POST /feedback",
        "method": "POST",
        "path": "/feedback",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.feedback.list.get",
        "name": "平台服务 · GET /feedback/list",
        "method": "GET",
        "path": "/feedback/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.notification.id.read.put",
        "name": "平台服务 · PUT /notification/:id/read",
        "method": "PUT",
        "path": "/notification/:id/read",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.notification.list.get",
        "name": "消息通知列表",
        "method": "GET",
        "path": "/notification/list?pageNum=1&pageSize=10&type=ALERT",
        "auth": true,
        "roles": null,
        "description": "读取用户消息通知，支持按类型与已读状态筛选。",
        "bodyNote": "可通过 type=ALERT/POLICY/FARM/SYSTEM 与 isRead=true/false 过滤。"
      },
      {
        "key": "api.platform.notification.read-all.put",
        "name": "平台服务 · PUT /notification/read-all",
        "method": "PUT",
        "path": "/notification/read-all",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.notification.unread.get",
        "name": "消息未读数",
        "method": "GET",
        "path": "/notification/unread",
        "auth": true,
        "roles": null,
        "description": "读取当前账号的未读消息数量。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.platform.search.get",
        "name": "全局搜索",
        "method": "GET",
        "path": "/search?keyword=玉米",
        "auth": false,
        "roles": null,
        "description": "跨政策、农技、商品和生活服务做统一检索。",
        "bodyNote": "通过 query 参数传 keyword。"
      },
      {
        "key": "api.platform.site.auth-background.get",
        "name": "平台服务 · GET /site/auth-background",
        "method": "GET",
        "path": "/site/auth-background",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.site.images.get",
        "name": "平台服务 · GET /site/images",
        "method": "GET",
        "path": "/site/images",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.site.images.key.post",
        "name": "平台服务 · POST /site/images/:key",
        "method": "POST",
        "path": "/site/images/:key",
        "auth": true,
        "roles": [
          "ADMIN"
        ],
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.site.startup-ad.get",
        "name": "平台服务 · GET /site/startup-ad",
        "method": "GET",
        "path": "/site/startup-ad",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.upload.image.post",
        "name": "平台服务 · POST /upload/image",
        "method": "POST",
        "path": "/upload/image",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.user.growth.get",
        "name": "平台服务 · GET /user/growth",
        "method": "GET",
        "path": "/user/growth",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.user.password.put",
        "name": "平台服务 · PUT /user/password",
        "method": "PUT",
        "path": "/user/password",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.user.points.get",
        "name": "平台服务 · GET /user/points",
        "method": "GET",
        "path": "/user/points",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.user.points.log.get",
        "name": "平台服务 · GET /user/points/log",
        "method": "GET",
        "path": "/user/points/log",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.user.profile.get",
        "name": "平台服务 · GET /user/profile",
        "method": "GET",
        "path": "/user/profile",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.platform.user.profile.put",
        "name": "平台服务 · PUT /user/profile",
        "method": "PUT",
        "path": "/user/profile",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "农业生产",
    "items": [
      {
        "key": "api.agri.agri.calendar.get",
        "name": "农业生产 · GET /agri/calendar",
        "method": "GET",
        "path": "/agri/calendar",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.carbon.calc.post",
        "name": "农业生产 · POST /agri/carbon/calc",
        "method": "POST",
        "path": "/agri/carbon/calc",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.carbon.list.get",
        "name": "农业生产 · GET /agri/carbon/list",
        "method": "GET",
        "path": "/agri/carbon/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.crop.monitor.post",
        "name": "农业生产 · POST /agri/crop/monitor",
        "method": "POST",
        "path": "/agri/crop/monitor",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.detect.records.get",
        "name": "农业生产 · GET /agri/detect/records",
        "method": "GET",
        "path": "/agri/detect/records",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.disease.label.get",
        "name": "农业生产 · GET /agri/disease/:label",
        "method": "GET",
        "path": "/agri/disease/:label",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.disease.detect.post",
        "name": "农业生产 · POST /agri/disease/detect",
        "method": "POST",
        "path": "/agri/disease/detect",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.disease.list.get",
        "name": "农业生产 · GET /agri/disease/list",
        "method": "GET",
        "path": "/agri/disease/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.fertilizer.advise.post",
        "name": "农业生产 · POST /agri/fertilizer/advise",
        "method": "POST",
        "path": "/agri/fertilizer/advise",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.irrigation.plan.post",
        "name": "农业生产 · POST /agri/irrigation/plan",
        "method": "POST",
        "path": "/agri/irrigation/plan",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.pesticide.get",
        "name": "农业生产 · GET /agri/pesticide",
        "method": "GET",
        "path": "/agri/pesticide",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.pesticide.list.get",
        "name": "农业生产 · GET /agri/pesticide/list",
        "method": "GET",
        "path": "/agri/pesticide/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.plot.post",
        "name": "农业生产 · POST /agri/plot",
        "method": "POST",
        "path": "/agri/plot",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.plot.id.delete",
        "name": "农业生产 · DELETE /agri/plot/:id",
        "method": "DELETE",
        "path": "/agri/plot/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.plot.id.get",
        "name": "农业生产 · GET /agri/plot/:id",
        "method": "GET",
        "path": "/agri/plot/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.plot.id.put",
        "name": "农业生产 · PUT /agri/plot/:id",
        "method": "PUT",
        "path": "/agri/plot/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.plot.list.get",
        "name": "地块列表",
        "method": "GET",
        "path": "/agri/plot/list?pageNum=1&pageSize=10",
        "auth": true,
        "roles": null,
        "description": "查询平台地块档案，供农事记录和 GIS 管理使用。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.agri.agri.record.post",
        "name": "新增农事记录",
        "method": "POST",
        "path": "/agri/record",
        "auth": true,
        "roles": null,
        "description": "创建播种、施肥、打药、灌溉、收获等农事记录。",
        "bodyNote": "recordType、cropType、content、recordDate 是创建农事记录的关键字段。",
        "body": {
          "userId": 1,
          "plotId": 1,
          "recordType": "施肥",
          "cropType": "玉米",
          "content": "追施复合肥 20 公斤，土壤墒情良好",
          "cost": 86,
          "recordDate": "2026-05-21",
          "localUuid": "farm-record-001"
        }
      },
      {
        "key": "api.agri.agri.record.id.delete",
        "name": "农业生产 · DELETE /agri/record/:id",
        "method": "DELETE",
        "path": "/agri/record/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.record.id.put",
        "name": "农业生产 · PUT /agri/record/:id",
        "method": "PUT",
        "path": "/agri/record/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.record.list.get",
        "name": "农业生产 · GET /agri/record/list",
        "method": "GET",
        "path": "/agri/record/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.report.annual.get",
        "name": "农业生产 · GET /agri/report/annual",
        "method": "GET",
        "path": "/agri/report/annual",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.seed.detect.post",
        "name": "农业生产 · POST /agri/seed/detect",
        "method": "POST",
        "path": "/agri/seed/detect",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.soil.advise.post",
        "name": "农业生产 · POST /agri/soil/advise",
        "method": "POST",
        "path": "/agri/soil/advise",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.weather.get",
        "name": "农业生产 · GET /agri/weather",
        "method": "GET",
        "path": "/agri/weather",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.weed.detect.post",
        "name": "农业生产 · POST /agri/weed/detect",
        "method": "POST",
        "path": "/agri/weed/detect",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.yield.list.get",
        "name": "农业生产 · GET /agri/yield/list",
        "method": "GET",
        "path": "/agri/yield/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.agri.agri.yield.predict.post",
        "name": "产量预测",
        "method": "POST",
        "path": "/agri/yield/predict",
        "auth": true,
        "roles": null,
        "description": "使用规则引擎与轻量模型根据地块和作物信息返回产量预测。",
        "bodyNote": "plotId 与 cropType 用于定位地块和作物，areaMu 可辅助估算。",
        "body": {
          "plotId": 1,
          "cropType": "玉米",
          "areaMu": 8.5
        }
      }
    ]
  },
  {
    "group": "流通销售",
    "items": [
      {
        "key": "api.market.market.buyer.list.get",
        "name": "流通销售 · GET /market/buyer/list",
        "method": "GET",
        "path": "/market/buyer/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.buyer.map.get",
        "name": "流通销售 · GET /market/buyer/map",
        "method": "GET",
        "path": "/market/buyer/map",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.export.get",
        "name": "流通销售 · GET /market/export",
        "method": "GET",
        "path": "/market/export",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.futures.get",
        "name": "流通销售 · GET /market/futures",
        "method": "GET",
        "path": "/market/futures",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.grade.detect.post",
        "name": "流通销售 · POST /market/grade/detect",
        "method": "POST",
        "path": "/market/grade/detect",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.groupbuy.post",
        "name": "流通销售 · POST /market/groupbuy",
        "method": "POST",
        "path": "/market/groupbuy",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.groupbuy.id.join.post",
        "name": "流通销售 · POST /market/groupbuy/:id/join",
        "method": "POST",
        "path": "/market/groupbuy/:id/join",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.groupbuy.list.get",
        "name": "流通销售 · GET /market/groupbuy/list",
        "method": "GET",
        "path": "/market/groupbuy/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.live.script.post",
        "name": "流通销售 · POST /market/live/script",
        "method": "POST",
        "path": "/market/live/script",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.logistics.no.get",
        "name": "流通销售 · GET /market/logistics/:no",
        "method": "GET",
        "path": "/market/logistics/:no",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.order.post",
        "name": "流通销售 · POST /market/order",
        "method": "POST",
        "path": "/market/order",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.order.id.get",
        "name": "流通销售 · GET /market/order/:id",
        "method": "GET",
        "path": "/market/order/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.order.id.status.put",
        "name": "流通销售 · PUT /market/order/:id/status",
        "method": "PUT",
        "path": "/market/order/:id/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.order.list.get",
        "name": "流通销售 · GET /market/order/list",
        "method": "GET",
        "path": "/market/order/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.package.generate.post",
        "name": "包装文案生成",
        "method": "POST",
        "path": "/market/package/generate",
        "auth": true,
        "roles": null,
        "description": "调用 AI 服务或规则模板生成农产品包装文案。",
        "bodyNote": "productName、feature、targetMarket 越完整，生成结果越稳定。",
        "body": {
          "productName": "高山玉米",
          "feature": "海拔高、昼夜温差大、口感清甜",
          "targetMarket": "社区团购"
        }
      },
      {
        "key": "api.market.market.price.get",
        "name": "行情查询",
        "method": "GET",
        "path": "/market/price?productName=玉米&pageNum=1&pageSize=10",
        "auth": false,
        "roles": null,
        "description": "查询行情缓存与历史价格数据。",
        "bodyNote": "通过 query 参数传 productName、category、regionCode。"
      },
      {
        "key": "api.market.market.price.predict.get",
        "name": "流通销售 · GET /market/price/predict",
        "method": "GET",
        "path": "/market/price/predict",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.price.trend.get",
        "name": "流通销售 · GET /market/price/trend",
        "method": "GET",
        "path": "/market/price/trend",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.product.post",
        "name": "流通销售 · POST /market/product",
        "method": "POST",
        "path": "/market/product",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.product.id.delete",
        "name": "流通销售 · DELETE /market/product/:id",
        "method": "DELETE",
        "path": "/market/product/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.product.id.get",
        "name": "流通销售 · GET /market/product/:id",
        "method": "GET",
        "path": "/market/product/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.product.id.put",
        "name": "流通销售 · PUT /market/product/:id",
        "method": "PUT",
        "path": "/market/product/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.product.list.get",
        "name": "商品列表",
        "method": "GET",
        "path": "/market/product/list?pageNum=1&pageSize=10",
        "auth": false,
        "roles": null,
        "description": "查询乡村集市商品。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.market.market.product.mine.get",
        "name": "流通销售 · GET /market/product/mine",
        "method": "GET",
        "path": "/market/product/mine",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.trace.code.get",
        "name": "流通销售 · GET /market/trace/:code",
        "method": "GET",
        "path": "/market/trace/:code",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.trace.code.record.post",
        "name": "流通销售 · POST /market/trace/:code/record",
        "method": "POST",
        "path": "/market/trace/:code/record",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.market.market.trace.generate.post",
        "name": "流通销售 · POST /market/trace/generate",
        "method": "POST",
        "path": "/market/trace/generate",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "农机共享",
    "items": [
      {
        "key": "api.machinery.land.transfer.post",
        "name": "农机共享 · POST /land/transfer",
        "method": "POST",
        "path": "/land/transfer",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.land.transfer.id.delete",
        "name": "农机共享 · DELETE /land/transfer/:id",
        "method": "DELETE",
        "path": "/land/transfer/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.land.transfer.id.get",
        "name": "农机共享 · GET /land/transfer/:id",
        "method": "GET",
        "path": "/land/transfer/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.land.transfer.id.put",
        "name": "农机共享 · PUT /land/transfer/:id",
        "method": "PUT",
        "path": "/land/transfer/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.land.transfer.list.get",
        "name": "农机共享 · GET /land/transfer/list",
        "method": "GET",
        "path": "/land/transfer/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.post",
        "name": "农机共享 · POST /machinery",
        "method": "POST",
        "path": "/machinery",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.id.delete",
        "name": "农机共享 · DELETE /machinery/:id",
        "method": "DELETE",
        "path": "/machinery/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.id.get",
        "name": "农机共享 · GET /machinery/:id",
        "method": "GET",
        "path": "/machinery/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.id.put",
        "name": "农机共享 · PUT /machinery/:id",
        "method": "PUT",
        "path": "/machinery/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.booking.post",
        "name": "农机共享 · POST /machinery/booking",
        "method": "POST",
        "path": "/machinery/booking",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.booking.id.status.put",
        "name": "农机共享 · PUT /machinery/booking/:id/status",
        "method": "PUT",
        "path": "/machinery/booking/:id/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.booking.list.get",
        "name": "农机共享 · GET /machinery/booking/list",
        "method": "GET",
        "path": "/machinery/booking/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.cert.apply.post",
        "name": "农机共享 · POST /machinery/cert/apply",
        "method": "POST",
        "path": "/machinery/cert/apply",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.cert.list.get",
        "name": "农机共享 · GET /machinery/cert/list",
        "method": "GET",
        "path": "/machinery/cert/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.cost.summary.get",
        "name": "农机共享 · GET /machinery/cost/summary",
        "method": "GET",
        "path": "/machinery/cost/summary",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.fault.diagnose.post",
        "name": "农机共享 · POST /machinery/fault/diagnose",
        "method": "POST",
        "path": "/machinery/fault/diagnose",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.insurance.post",
        "name": "农机共享 · POST /machinery/insurance",
        "method": "POST",
        "path": "/machinery/insurance",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.insurance.list.get",
        "name": "农机共享 · GET /machinery/insurance/list",
        "method": "GET",
        "path": "/machinery/insurance/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.list.get",
        "name": "农机共享 · GET /machinery/list",
        "method": "GET",
        "path": "/machinery/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.maintain.remind.get",
        "name": "农机共享 · GET /machinery/maintain/remind",
        "method": "GET",
        "path": "/machinery/maintain/remind",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.mine.get",
        "name": "农机共享 · GET /machinery/mine",
        "method": "GET",
        "path": "/machinery/mine",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.track.post",
        "name": "农机共享 · POST /machinery/track",
        "method": "POST",
        "path": "/machinery/track",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.machinery.machinery.track.list.get",
        "name": "农机共享 · GET /machinery/track/list",
        "method": "GET",
        "path": "/machinery/track/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "气象灾害",
    "items": [
      {
        "key": "api.disaster.disaster.alert.list.get",
        "name": "天气预警列表",
        "method": "GET",
        "path": "/disaster/alert/list?pageNum=1&pageSize=10",
        "auth": false,
        "roles": null,
        "description": "查询村镇级天气预警和灾害提醒。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.disaster.disaster.claim.id.get",
        "name": "气象灾害 · GET /disaster/claim/:id",
        "method": "GET",
        "path": "/disaster/claim/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.claim.assess.post",
        "name": "气象灾害 · POST /disaster/claim/assess",
        "method": "POST",
        "path": "/disaster/claim/assess",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.claim.list.get",
        "name": "气象灾害 · GET /disaster/claim/list",
        "method": "GET",
        "path": "/disaster/claim/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.drought.index.get",
        "name": "气象灾害 · GET /disaster/drought/index",
        "method": "GET",
        "path": "/disaster/drought/index",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.emergency.id.get",
        "name": "气象灾害 · GET /disaster/emergency/:id",
        "method": "GET",
        "path": "/disaster/emergency/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.emergency.guide.get",
        "name": "气象灾害 · GET /disaster/emergency/guide",
        "method": "GET",
        "path": "/disaster/emergency/guide",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.fire.risk.get",
        "name": "气象灾害 · GET /disaster/fire/risk",
        "method": "GET",
        "path": "/disaster/fire/risk",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.frost.advice.get",
        "name": "气象灾害 · GET /disaster/frost/advice",
        "method": "GET",
        "path": "/disaster/frost/advice",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.report.post",
        "name": "气象灾害 · POST /disaster/report",
        "method": "POST",
        "path": "/disaster/report",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.report.id.get",
        "name": "气象灾害 · GET /disaster/report/:id",
        "method": "GET",
        "path": "/disaster/report/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.report.id.status.put",
        "name": "气象灾害 · PUT /disaster/report/:id/status",
        "method": "PUT",
        "path": "/disaster/report/:id/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.report.list.get",
        "name": "气象灾害 · GET /disaster/report/list",
        "method": "GET",
        "path": "/disaster/report/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.sos.post",
        "name": "气象灾害 · POST /disaster/sos",
        "method": "POST",
        "path": "/disaster/sos",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.sos.id.status.put",
        "name": "气象灾害 · PUT /disaster/sos/:id/status",
        "method": "PUT",
        "path": "/disaster/sos/:id/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.disaster.disaster.sos.list.get",
        "name": "气象灾害 · GET /disaster/sos/list",
        "method": "GET",
        "path": "/disaster/sos/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "惠农政策",
    "items": [
      {
        "key": "api.policy.party.learn.log.get",
        "name": "惠农政策 · GET /party/learn/log",
        "method": "GET",
        "path": "/party/learn/log",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.party.lesson.id.get",
        "name": "惠农政策 · GET /party/lesson/:id",
        "method": "GET",
        "path": "/party/lesson/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.party.lesson.id.finish.post",
        "name": "惠农政策 · POST /party/lesson/:id/finish",
        "method": "POST",
        "path": "/party/lesson/:id/finish",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.party.lesson.list.get",
        "name": "惠农政策 · GET /party/lesson/list",
        "method": "GET",
        "path": "/party/lesson/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.id.get",
        "name": "惠农政策 · GET /policy/:id",
        "method": "GET",
        "path": "/policy/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.ai.ask.post",
        "name": "政策 AI 问答",
        "method": "POST",
        "path": "/policy/ai/ask",
        "auth": true,
        "roles": null,
        "description": "基于平台知识库回答政策问题。",
        "bodyNote": "question 必填，regionCode 可用于区域政策过滤。",
        "body": {
          "question": "种植玉米有没有补贴，怎么申请？",
          "regionCode": "440100"
        }
      },
      {
        "key": "api.policy.policy.legal.ask.post",
        "name": "惠农政策 · POST /policy/legal/ask",
        "method": "POST",
        "path": "/policy/legal/ask",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.list.get",
        "name": "政策列表",
        "method": "GET",
        "path": "/policy/list?pageNum=1&pageSize=10",
        "auth": false,
        "roles": null,
        "description": "读取国家、省、县三级惠农政策。",
        "bodyNote": "可通过 category、level、keyword 查询。"
      },
      {
        "key": "api.policy.policy.points.exchange.post",
        "name": "惠农政策 · POST /policy/points/exchange",
        "method": "POST",
        "path": "/policy/points/exchange",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.points.items.get",
        "name": "惠农政策 · GET /policy/points/items",
        "method": "GET",
        "path": "/policy/points/items",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.points.rank.get",
        "name": "惠农政策 · GET /policy/points/rank",
        "method": "GET",
        "path": "/policy/points/rank",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.subsidy.apply.post",
        "name": "惠农政策 · POST /policy/subsidy/apply",
        "method": "POST",
        "path": "/policy/subsidy/apply",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.policy.subsidy.list.get",
        "name": "惠农政策 · GET /policy/subsidy/list",
        "method": "GET",
        "path": "/policy/subsidy/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.talent.post",
        "name": "惠农政策 · POST /talent",
        "method": "POST",
        "path": "/talent",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.talent.list.get",
        "name": "惠农政策 · GET /talent/list",
        "method": "GET",
        "path": "/talent/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.training.course.id.get",
        "name": "惠农政策 · GET /training/course/:id",
        "method": "GET",
        "path": "/training/course/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.training.course.id.enroll.post",
        "name": "惠农政策 · POST /training/course/:id/enroll",
        "method": "POST",
        "path": "/training/course/:id/enroll",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.training.course.id.progress.post",
        "name": "惠农政策 · POST /training/course/:id/progress",
        "method": "POST",
        "path": "/training/course/:id/progress",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.training.course.list.get",
        "name": "惠农政策 · GET /training/course/list",
        "method": "GET",
        "path": "/training/course/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.training.my.get",
        "name": "惠农政策 · GET /training/my",
        "method": "GET",
        "path": "/training/my",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.village.affairs.get",
        "name": "惠农政策 · GET /village/affairs",
        "method": "GET",
        "path": "/village/affairs",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.village.affairs.post",
        "name": "惠农政策 · POST /village/affairs",
        "method": "POST",
        "path": "/village/affairs",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.village.honor.get",
        "name": "惠农政策 · GET /village/honor",
        "method": "GET",
        "path": "/village/honor",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.village.honor.post",
        "name": "惠农政策 · POST /village/honor",
        "method": "POST",
        "path": "/village/honor",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.policy.village.honor.id.vote.post",
        "name": "惠农政策 · POST /village/honor/:id/vote",
        "method": "POST",
        "path": "/village/honor/:id/vote",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "乡村生活",
    "items": [
      {
        "key": "api.life.life.clinic.consult.post",
        "name": "乡村生活 · POST /life/clinic/consult",
        "method": "POST",
        "path": "/life/clinic/consult",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.clinic.list.get",
        "name": "乡村生活 · GET /life/clinic/list",
        "method": "GET",
        "path": "/life/clinic/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.consult.id.reply.put",
        "name": "乡村生活 · PUT /life/consult/:id/reply",
        "method": "PUT",
        "path": "/life/consult/:id/reply",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.consult.list.get",
        "name": "乡村生活 · GET /life/consult/list",
        "method": "GET",
        "path": "/life/consult/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.edu.ask.post",
        "name": "乡村生活 · POST /life/edu/ask",
        "method": "POST",
        "path": "/life/edu/ask",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.elder.checkin.post",
        "name": "乡村生活 · POST /life/elder/checkin",
        "method": "POST",
        "path": "/life/elder/checkin",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.elder.services.get",
        "name": "乡村生活 · GET /life/elder/services",
        "method": "GET",
        "path": "/life/elder/services",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.env.id.status.put",
        "name": "乡村生活 · PUT /life/env/:id/status",
        "method": "PUT",
        "path": "/life/env/:id/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.env.list.get",
        "name": "乡村生活 · GET /life/env/list",
        "method": "GET",
        "path": "/life/env/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.env.report.post",
        "name": "乡村生活 · POST /life/env/report",
        "method": "POST",
        "path": "/life/env/report",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.express.list.get",
        "name": "乡村生活 · GET /life/express/list",
        "method": "GET",
        "path": "/life/express/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.express.query.get",
        "name": "乡村生活 · GET /life/express/query",
        "method": "GET",
        "path": "/life/express/query",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.folk.post",
        "name": "乡村生活 · POST /life/folk",
        "method": "POST",
        "path": "/life/folk",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.folk.id.get",
        "name": "乡村生活 · GET /life/folk/:id",
        "method": "GET",
        "path": "/life/folk/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.folk.list.get",
        "name": "乡村生活 · GET /life/folk/list",
        "method": "GET",
        "path": "/life/folk/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.help.post",
        "name": "乡村生活 · POST /life/help",
        "method": "POST",
        "path": "/life/help",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.help.id.accept.post",
        "name": "乡村生活 · POST /life/help/:id/accept",
        "method": "POST",
        "path": "/life/help/:id/accept",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.help.list.get",
        "name": "乡村生活 · GET /life/help/list",
        "method": "GET",
        "path": "/life/help/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.job.post",
        "name": "乡村生活 · POST /life/job",
        "method": "POST",
        "path": "/life/job",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.job.list.get",
        "name": "乡村生活 · GET /life/job/list",
        "method": "GET",
        "path": "/life/job/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.job.match.post",
        "name": "乡村生活 · POST /life/job/match",
        "method": "POST",
        "path": "/life/job/match",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.loan.applications.get",
        "name": "乡村生活 · GET /life/loan/applications",
        "method": "GET",
        "path": "/life/loan/applications",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.loan.assess.post",
        "name": "乡村生活 · POST /life/loan/assess",
        "method": "POST",
        "path": "/life/loan/assess",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.loan.products.get",
        "name": "乡村生活 · GET /life/loan/products",
        "method": "GET",
        "path": "/life/loan/products",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.secondhand.post",
        "name": "乡村生活 · POST /life/secondhand",
        "method": "POST",
        "path": "/life/secondhand",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.secondhand.id.put",
        "name": "乡村生活 · PUT /life/secondhand/:id",
        "method": "PUT",
        "path": "/life/secondhand/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.secondhand.list.get",
        "name": "乡村生活 · GET /life/secondhand/list",
        "method": "GET",
        "path": "/life/secondhand/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.tourism.post",
        "name": "乡村生活 · POST /life/tourism",
        "method": "POST",
        "path": "/life/tourism",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.tourism.id.get",
        "name": "乡村生活 · GET /life/tourism/:id",
        "method": "GET",
        "path": "/life/tourism/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.tourism.list.get",
        "name": "乡村生活 · GET /life/tourism/list",
        "method": "GET",
        "path": "/life/tourism/list",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.tourism.promote.post",
        "name": "乡村生活 · POST /life/tourism/promote",
        "method": "POST",
        "path": "/life/tourism/promote",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.utility.bill.get",
        "name": "乡村生活 · GET /life/utility/bill",
        "method": "GET",
        "path": "/life/utility/bill",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.life.life.utility.pay.post",
        "name": "乡村生活 · POST /life/utility/pay",
        "method": "POST",
        "path": "/life/utility/pay",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "数据管理",
    "items": [
      {
        "key": "api.data.data.annual-report.generate.post",
        "name": "数据管理 · POST /data/annual-report/generate",
        "method": "POST",
        "path": "/data/annual-report/generate",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.annual-report.list.get",
        "name": "数据管理 · GET /data/annual-report/list",
        "method": "GET",
        "path": "/data/annual-report/list",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.dashboard.get",
        "name": "运营驾驶舱",
        "method": "GET",
        "path": "/data/dashboard",
        "auth": true,
        "roles": null,
        "description": "读取首页统计卡片、作物面积分布和服务状态。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.data.data.remote-sensing.get",
        "name": "数据管理 · GET /data/remote-sensing",
        "method": "GET",
        "path": "/data/remote-sensing",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.statistics.get",
        "name": "数据管理 · GET /data/statistics",
        "method": "GET",
        "path": "/data/statistics",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.statistics.id.status.put",
        "name": "数据管理 · PUT /data/statistics/:id/status",
        "method": "PUT",
        "path": "/data/statistics/:id/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.statistics.report.post",
        "name": "数据管理 · POST /data/statistics/report",
        "method": "POST",
        "path": "/data/statistics/report",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.statistics.summary.get",
        "name": "数据管理 · GET /data/statistics/summary",
        "method": "GET",
        "path": "/data/statistics/summary",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.sync.post",
        "name": "数据同步",
        "method": "POST",
        "path": "/data/sync",
        "auth": true,
        "roles": null,
        "description": "接收客户端待发送队列，把业务操作同步到后端。",
        "bodyNote": "items 为待同步操作数组，localUuid 用于去重。",
        "body": {
          "deviceId": "device-admin-001",
          "items": [
            {
              "tableName": "farm_record",
              "operation": "INSERT",
              "localUuid": "sync-record-001",
              "payload": {
                "recordType": "灌溉",
                "content": "补录灌溉一次"
              }
            }
          ]
        }
      },
      {
        "key": "api.data.data.sync.logs.get",
        "name": "数据管理 · GET /data/sync/logs",
        "method": "GET",
        "path": "/data/sync/logs",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.data.data.sync.status.get",
        "name": "同步状态",
        "method": "GET",
        "path": "/data/sync/status",
        "auth": true,
        "roles": null,
        "description": "读取同步队列、冲突与最近同步状态。",
        "bodyNote": "无需请求体。"
      }
    ]
  },
  {
    "group": "智慧物联",
    "items": [
      {
        "key": "api.iot.iot.devices.get",
        "name": "智慧物联 · GET /iot/devices",
        "method": "GET",
        "path": "/iot/devices",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.iot.iot.devices.id.get",
        "name": "智慧物联 · GET /iot/devices/:id",
        "method": "GET",
        "path": "/iot/devices/:id",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.iot.iot.linkage.logs.get",
        "name": "智慧物联 · GET /iot/linkage/logs",
        "method": "GET",
        "path": "/iot/linkage/logs",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.iot.iot.linkage.rules.get",
        "name": "智慧物联 · GET /iot/linkage/rules",
        "method": "GET",
        "path": "/iot/linkage/rules",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.iot.iot.linkage.rules.id.toggle.post",
        "name": "智慧物联 · POST /iot/linkage/rules/:id/toggle",
        "method": "POST",
        "path": "/iot/linkage/rules/:id/toggle",
        "auth": false,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  },
  {
    "group": "AI 能力",
    "items": [
      {
        "key": "api.ai.ai.agri.ask.post",
        "name": "AI 能力 · POST /ai/agri/ask",
        "method": "POST",
        "path": "/ai/agri/ask",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.assistant.command-result.post",
        "name": "AI 能力 · POST /ai/assistant/command-result",
        "method": "POST",
        "path": "/ai/assistant/command-result",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.assistant.config.get",
        "name": "AI 能力 · GET /ai/assistant/config",
        "method": "GET",
        "path": "/ai/assistant/config",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.assistant.turn.post",
        "name": "AI 能力 · POST /ai/assistant/turn",
        "method": "POST",
        "path": "/ai/assistant/turn",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.chat.post",
        "name": "通用 AI 对话",
        "method": "POST",
        "path": "/ai/chat",
        "auth": true,
        "roles": null,
        "description": "调用平台 AI 服务回答通用问题。",
        "bodyNote": "scene 可传 agri、policy、legal、general。",
        "body": {
          "scene": "agri",
          "question": "玉米叶片发黄可能是什么原因？"
        }
      },
      {
        "key": "api.ai.ai.detect-feedback.post",
        "name": "AI 能力 · POST /ai/detect-feedback",
        "method": "POST",
        "path": "/ai/detect-feedback",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.image.analyze.post",
        "name": "AI 能力 · POST /ai/image/analyze",
        "method": "POST",
        "path": "/ai/image/analyze",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.image.detect.post",
        "name": "AI 能力 · POST /ai/image/detect",
        "method": "POST",
        "path": "/ai/image/detect",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.kb.search.get",
        "name": "AI 能力 · GET /ai/kb/search",
        "method": "GET",
        "path": "/ai/kb/search",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.legal.ask.post",
        "name": "AI 能力 · POST /ai/legal/ask",
        "method": "POST",
        "path": "/ai/legal/ask",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.model.version.get",
        "name": "AI 模型配置",
        "method": "GET",
        "path": "/ai/model/version",
        "auth": true,
        "roles": null,
        "description": "查看当前问答、视觉和检索模型配置。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.ai.ai.policy.ask.post",
        "name": "AI 能力 · POST /ai/policy/ask",
        "method": "POST",
        "path": "/ai/policy/ask",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.qa.record-items.id.delete",
        "name": "删除单条 AI 记录",
        "method": "DELETE",
        "path": "/ai/qa/record-items/1",
        "auth": true,
        "roles": null,
        "description": "仅删除指定 id 的单条问答记录，不影响同一会话其它消息。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.ai.ai.qa.records.delete",
        "name": "AI 能力 · DELETE /ai/qa/records",
        "method": "DELETE",
        "path": "/ai/qa/records",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.qa.records.get",
        "name": "AI 对话列表",
        "method": "GET",
        "path": "/ai/qa/records?pageNum=1&pageSize=20",
        "auth": true,
        "roles": null,
        "description": "按会话分页读取 AI 历史摘要，返回 threadId 与消息数。",
        "bodyNote": "可通过 pageNum、pageSize、scene 查询。"
      },
      {
        "key": "api.ai.ai.qa.records.id.delete",
        "name": "AI 能力 · DELETE /ai/qa/records/:id",
        "method": "DELETE",
        "path": "/ai/qa/records/:id",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.qa.records.detect.post",
        "name": "AI 能力 · POST /ai/qa/records/detect",
        "method": "POST",
        "path": "/ai/qa/records/detect",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.qa.threads.threadId.delete",
        "name": "删除 AI 会话",
        "method": "DELETE",
        "path": "/ai/qa/threads/1",
        "auth": true,
        "roles": null,
        "description": "删除指定 threadId 的整段 AI 对话。",
        "bodyNote": "旧路径 DELETE /ai/qa/records/:id 仍作为兼容 alias，会输出弃用日志。"
      },
      {
        "key": "api.ai.ai.qa.threads.threadId.get",
        "name": "AI 单个会话",
        "method": "GET",
        "path": "/ai/qa/threads/1",
        "auth": true,
        "roles": null,
        "description": "读取某个 AI 会话下的全部问答记录。",
        "bodyNote": "路径参数 threadId 为会话 ID。"
      },
      {
        "key": "api.ai.ai.status.get",
        "name": "AI 状态",
        "method": "GET",
        "path": "/ai/status",
        "auth": true,
        "roles": null,
        "description": "检查模型服务、规则引擎和平台知识库状态。",
        "bodyNote": "无需请求体。"
      },
      {
        "key": "api.ai.ai.tts.post",
        "name": "AI 能力 · POST /ai/tts",
        "method": "POST",
        "path": "/ai/tts",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.tts.status.get",
        "name": "AI 能力 · GET /ai/tts/status",
        "method": "GET",
        "path": "/ai/tts/status",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      },
      {
        "key": "api.ai.ai.voice.recognize.post",
        "name": "AI 能力 · POST /ai/voice/recognize",
        "method": "POST",
        "path": "/ai/voice/recognize",
        "auth": true,
        "roles": null,
        "description": "",
        "bodyNote": ""
      }
    ]
  }
]

export function flatApiCatalog() {
  return API_CATALOG.flatMap((group) => group.items.map((item) => ({ ...item, group: group.group })))
}
