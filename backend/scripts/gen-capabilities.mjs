/**
 * 116f-B 单一能力注册表生成器（静态、可重复执行、输出确定）。
 *
 * 输入：
 * - 源码静态盘点（src/contracts/route-scanner.js，不执行任何业务代码、不连数据库）
 * - apiControl.js 的 RULES（method+regex 开关清单，直接复用同一份数据，不复制逻辑）
 * - 本文件内的手工 overlay（section 名称、既有弃用 alias、D2 迁移方案、v2 骨架端点）
 *
 * 输出：backend/src/contracts/capabilities.js（提交进版本库的生成产物）。
 *
 * 用法（cwd = backend/）：
 *   node scripts/gen-capabilities.mjs --write   重新生成（结构错误时拒绝生成并失败）
 *   node scripts/gen-capabilities.mjs --check   校验生成产物与源码一致（漂移门禁）
 */

import fs from 'node:fs'
import path from 'node:path'
import { scanRouteFiles, BACKEND_ROOT } from '../src/contracts/route-scanner.js'
import { RULES } from '../src/middleware/apiControl.js'

const OUT_FILE = path.join(BACKEND_ROOT, 'src', 'contracts', 'capabilities.js')

const SECTIONS = Object.freeze({
  system: '系统',
  platform: '平台服务',
  agri: '农业生产',
  market: '流通销售',
  machinery: '农机共享',
  disaster: '气象灾害',
  policy: '惠农政策',
  life: '乡村生活',
  data: '数据管理',
  iot: '智慧物联',
  ai: 'AI 能力',
})

// 既有弃用 alias（116f §5.5：只登记这一条，v1 行为不变）
const DEPRECATED_V1 = Object.freeze({
  'DELETE /ai/qa/records/:id': { deprecatedSince: '2026-08-15', sunset: null },
})

// D2 迁移方案：仅记录设计，不实施（resourceGroups / B20 本轮保持既有 characterization）
const MIGRATION_NOTES = Object.freeze({
  aiDetectRecordResourceGroups: {
    decision: 'D2',
    primaryGroup: 'agri',
    secondaryTags: ['ai'],
    status: 'planned-not-implemented',
    note: 'aiDetectRecord 唯一 primaryGroup=agri，ai 作为 tag/secondaryGroup 表达；既有 resourceGroups 与 B20 characterization 本轮保持不变，去重与契约更新延至实施批次正式开始后。',
  },
})

// v2 骨架端点（D9：ping 公开最小健康信息；capabilities/api-catalog 第一阶段 requireAuth + ADMIN）
const V2_CAPABILITIES = Object.freeze([
  {
    id: 'cap.v2.system.ping',
    section: 'system',
    name: '系统 · GET /ping（v2 健康探针）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.system.ping',
      version: 'v2',
      method: 'GET',
      path: '/ping',
      auth: 'optional',
      roles: null,
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
  {
    id: 'cap.v2.system.capabilities',
    section: 'system',
    name: '系统 · GET /capabilities（能力注册表目录）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.system.capabilities',
      version: 'v2',
      method: 'GET',
      path: '/capabilities',
      auth: 'required',
      roles: ['ADMIN'],
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
  {
    id: 'cap.v2.system.api-catalog',
    section: 'system',
    name: '系统 · GET /api-catalog（API 目录）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.system.api-catalog',
      version: 'v2',
      method: 'GET',
      path: '/api-catalog',
      auth: 'required',
      roles: ['ADMIN'],
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
])

function slugForPath(routePath) {
  const parts = routePath.split('/').filter(Boolean).map((seg) => seg.replace(/^:/, ''))
  return parts.join('.') || 'root'
}

/** 复用 apiControl.RULES 的同一份数据与同一匹配顺序（v1 开关分类保持不动）。 */
function switchKeyFor(route) {
  for (const rule of RULES) {
    if ((!rule.method || rule.method === route.method) && rule.pattern.test(route.path)) {
      return rule.key
    }
  }
  return null
}

export function buildRegistry() {
  const scan = scanRouteFiles()
  if (scan.duplicates.length > 0) {
    throw new Error(`存在重复 method+path 路由定义，注册表拒绝生成：${JSON.stringify(scan.duplicates, null, 2)}`)
  }
  if (scan.invalid.length > 0) {
    throw new Error(`存在无法解析的路由定义，注册表拒绝生成：${JSON.stringify(scan.invalid, null, 2)}`)
  }

  const capabilities = []
  const capIds = new Set()
  const apiIds = new Set()

  for (const route of scan.routes) {
    const slug = slugForPath(route.path)
    const methodKey = route.method.toLowerCase()
    const capabilityId = `cap.${route.module}.${slug}.${methodKey}`
    const apiId = `api.${route.module}.${slug}.${methodKey}`
    const dep = DEPRECATED_V1[`${route.method} ${route.path}`] || null

    if (capIds.has(capabilityId)) throw new Error(`capability id 冲突：${capabilityId}`)
    if (apiIds.has(apiId)) throw new Error(`apiId 冲突：${apiId}`)

    capIds.add(capabilityId)
    apiIds.add(apiId)
    capabilities.push({
      id: capabilityId,
      section: route.module,
      name: `${SECTIONS[route.module] || route.module} · ${route.method} ${route.path}`,
      aliases: [],
      enabled: true,
      regionScoped: false,
      deprecated: Boolean(dep),
      apis: [{
        apiId,
        version: 'v1',
        method: route.method,
        path: route.path,
        auth: route.auth,
        roles: route.roles,
        switchKey: switchKeyFor(route),
        // v1 限流沿用 apiControl.ratePlan 现有分类逻辑（116f §5.4：v1 regex 逻辑保持不动，不做大规模迁移）
        ratePlan: null,
        deprecated: Boolean(dep),
        deprecatedSince: dep ? dep.deprecatedSince : null,
        sunset: dep ? dep.sunset : null,
        // 内部对账信息：仅用于盘点/审计，绝不进入外部响应（D9）
        v1: { routesFile: route.file, line: route.line },
      }],
    })
  }

  for (const v2 of V2_CAPABILITIES) {
    if (capIds.has(v2.id)) throw new Error(`capability id 冲突：${v2.id}`)
    capIds.add(v2.id)
    for (const api of v2.apis) {
      if (apiIds.has(api.apiId)) throw new Error(`apiId 冲突：${api.apiId}`)
      apiIds.add(api.apiId)
    }
    capabilities.push(v2)
  }

  capabilities.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  return {
    schemaVersion: 1,
    apiVersions: ['v1', 'v2'],
    roles: ['FARMER', 'BIGFARMER', 'VILLAGE', 'EXPERT', 'MERCHANT', 'ADMIN'],
    ratePlans: ['global', 'authLogin', 'sms', 'upload', 'adminRead', 'adminWrite', 'ai', 'tts'],
    switchKeys: [...new Set(RULES.map((rule) => rule.key))].sort(),
    sections: SECTIONS,
    migrationNotes: MIGRATION_NOTES,
    capabilities,
  }
}

function render(registry) {
  return [
    '// 本文件由 scripts/gen-capabilities.mjs 自动生成，请勿手工编辑。',
    '// 重新生成：cd backend && node scripts/gen-capabilities.mjs --write',
    '// 漂移检查：cd backend && node scripts/gen-capabilities.mjs --check',
    '//',
    '// 116f-B 单一能力注册表初版（schemaVersion=1）：',
    '// - v1：全部现有路由的只读对账登记（盘点脚本生成，不改变 v1 任何行为）；',
    '// - v2：仅 /ping、/capabilities、/api-catalog 三个骨架端点（D9）；',
    '// - 外部响应由 routes/v2 显式投影，v1.routesFile/line 与 ratePlan/switchKey 不对外。',
    'export const CAPABILITY_REGISTRY =',
    `${JSON.stringify(registry, null, 2)}\n`,
  ].join('\n')
}

function countApis(registry) {
  return registry.capabilities.reduce((sum, cap) => sum + cap.apis.length, 0)
}

const mode = process.argv[2]

if (mode === '--write') {
  const registry = buildRegistry()
  fs.writeFileSync(OUT_FILE, render(registry), 'utf8')
  console.log(`✓ 已生成 ${path.relative(BACKEND_ROOT, OUT_FILE)}：${registry.capabilities.length} 条能力 / ${countApis(registry)} 条 API（schemaVersion=${registry.schemaVersion}）`)
} else if (mode === '--check') {
  const registry = buildRegistry()
  const rendered = render(registry)
  const current = fs.readFileSync(OUT_FILE, 'utf8')
  if (current !== rendered) {
    console.error(`✗ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与盘点结果漂移。请运行：node scripts/gen-capabilities.mjs --write`)
    process.exit(1)
  }
  console.log(`✓ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与盘点结果一致（${registry.capabilities.length} 条能力 / ${countApis(registry)} 条 API）`)
} else {
  console.error('用法：node scripts/gen-capabilities.mjs --write | --check')
  process.exit(2)
}
