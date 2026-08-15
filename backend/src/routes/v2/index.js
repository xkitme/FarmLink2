/**
 * API v2 最小骨架（116f-B，D9）。
 *
 * 访问控制（D9，已确认）：
 * - GET /v2/ping           公开，只返回最小、稳定、精确的健康信息；不查库。
 * - GET /v2/capabilities   requireAuth + ADMIN，显式投影的安全字段。
 * - GET /v2/api-catalog    requireAuth + ADMIN，稳定、确定排序的安全目录视图。
 *
 * 外部响应绝不暴露：controller 路径、内部正则、密钥、限流实现细节
 * （ratePlan/switchKey）、安全配置与 v1 对账块（routesFile/line）。
 *
 * 本批只开放只读端点；写路径与领域命令属于后续批次（116f §5.3）。
 */

import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { ok } from '../../utils/response.js'
import { CAPABILITY_REGISTRY } from '../../contracts/capabilities.js'

/** 已挂载的 v2 路由定义：注册表校验器据此做「未登记即挂载」fail-fast 检查。 */
export const V2_ROUTE_DEFS = Object.freeze([
  { method: 'GET', path: '/ping' },
  { method: 'GET', path: '/capabilities' },
  { method: 'GET', path: '/api-catalog' },
])

/** 确定性比较（按码点，不依赖 locale）。 */
function asc(a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** 显式投影：仅允许对外暴露的 API 字段。 */
function projectApi(api) {
  return {
    apiId: api.apiId,
    version: api.version,
    method: api.method,
    path: api.path,
    auth: api.auth,
    roles: api.roles,
    deprecated: Boolean(api.deprecated),
    enabled: true,
  }
}

/** 显式投影：仅允许对外暴露的 capability 字段。 */
function projectCapability(cap) {
  return {
    id: cap.id,
    name: cap.name,
    section: cap.section,
    enabled: Boolean(cap.enabled),
    deprecated: Boolean(cap.deprecated),
    apis: cap.apis.map(projectApi),
  }
}

/**
 * 能力目录负载：按 capability id 确定性排序，结构稳定（契约测试锁定）。
 */
export function buildCapabilitiesPayload() {
  const capabilities = CAPABILITY_REGISTRY.capabilities
    .map(projectCapability)
    .sort((a, b) => asc(a.id, b.id))
  return {
    schemaVersion: CAPABILITY_REGISTRY.schemaVersion,
    apiVersions: [...CAPABILITY_REGISTRY.apiVersions].sort(asc),
    sections: { ...CAPABILITY_REGISTRY.sections },
    total: capabilities.length,
    capabilities,
  }
}

/**
 * API 目录负载：与能力注册表同源派生、可验证一致；
 * 按 (section, method, path) 确定性排序。
 */
export function buildApiCatalogPayload() {
  const rows = []
  for (const cap of CAPABILITY_REGISTRY.capabilities) {
    for (const api of cap.apis) {
      rows.push({
        ...projectApi(api),
        capabilityId: cap.id,
        section: cap.section,
        name: cap.name,
      })
    }
  }
  rows.sort((a, b) => (
    asc(a.section, b.section)
      || asc(a.method, b.method)
      || asc(a.path, b.path)
      || asc(a.apiId, b.apiId)
  ))
  return {
    schemaVersion: CAPABILITY_REGISTRY.schemaVersion,
    total: rows.length,
    items: rows,
  }
}

const router = Router()

// 公开健康探针：最小、稳定、精确；不查询数据库、不读取配置、不泄露内部信息。
router.get('/ping', (req, res) => {
  ok(res, { status: 'ok' })
})

const adminGuard = [requireAuth, requireRole('ADMIN')]

// 能力注册表目录（第一阶段 requireAuth + ADMIN，D9）
router.get('/capabilities', adminGuard, (req, res) => {
  ok(res, buildCapabilitiesPayload())
})

// API 目录（第一阶段 requireAuth + ADMIN，D9）
router.get('/api-catalog', adminGuard, (req, res) => {
  ok(res, buildApiCatalogPayload())
})

export default router
