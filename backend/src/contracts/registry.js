/**
 * 能力注册表启动期校验器（116f-B，D6 分层校验）。
 *
 * 分层规则（docs/116f-APIv2与能力注册表.md §6.1 / §11 D6）：
 *
 * ① 结构错误 —— 所有环境启动时 fail-fast（throw）：
 *    - schemaVersion 不合法；
 *    - capability id 重复 / apiId 重复；
 *    - 同版本内 method+path 重复；
 *    - auth/role 元数据非法（auth 枚举、roles 枚举、roles 仅限 required）；
 *    - ratePlan/switchKey 引用不存在；
 *    - 源码盘点发现重复 method+path 或非法路由定义；
 *    - v2 已挂载路由未在注册表登记。
 *
 * ② 覆盖缺口（已有路由尚未登记）—— D6 已完成（2026-08-17）：
 *    - 覆盖缺口在所有环境执行同一硬门禁（fail-fast，throw），不再分层；
 *    - HARD_COVERAGE_GATE_ALL_ENVIRONMENTS 已置 true，任何环境/开关组合都不得 fail-open。
 *
 * 校验器只读：不连接数据库、不执行任何路由业务代码。
 *
 * 数量口径（116f-C 基线，2026-08-15）：
 * - v1 实际路由 242、注册表 v1 登记 242/242；
 * - v2 实际路由 5、注册表 v2 登记 5/5（未登记即挂载 → 全环境 fail-fast）；
 * - 注册表 capability 总数 247 = 242(v1) + 5(v2)。
 */

import { CAPABILITY_REGISTRY } from './capabilities.js'
import { scanRouteFiles, AUTH_MODES } from './route-scanner.js'
import { resolveRuntimeEnvironment } from '../config/index.js'

/**
 * D6 硬门禁（2026-08-17 置 true）：116f 覆盖完整性已升级为所有环境硬门禁。
 * 覆盖缺口在任何环境（dev/test/demo/release，含 NODE_ENV=production 与未设置 NODE_ENV）
 * 都执行同一硬失败（throw），不存在按环境或开关组合 fail-open 的路径。
 */
export const HARD_COVERAGE_GATE_ALL_ENVIRONMENTS = true

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'HEAD', 'OPTIONS'])

/**
 * 覆盖缺口模式（D6 已完成，2026-08-17）：所有环境一律 'fail'，不再分层。
 * environment 参数保留签名兼容（校验错误信息仍标注实际环境）。
 */
export function resolveCoverageMode(environment) {
  void environment
  return 'fail'
}

function pushError(errors, message) {
  errors.push(message)
}

/**
 * @param {object} [options]
 * @param {object} [options.registry] 被测注册表（默认真实 CAPABILITY_REGISTRY）
 * @param {string} [options.environment] dev|test|demo|release（默认按 APP_ENV 解析）
 * @param {object[]} [options.v2Routes] 已挂载的 v2 路由定义 [{method,path}]（默认 []）
 * @param {object[]|null} [options.scannedRoutes] 注入盘点结果；null 时执行真实源码盘点
 * @param {boolean} [options.hardGate] 兼容保留参数（D6 后无论取值均为硬失败；默认 HARD_COVERAGE_GATE_ALL_ENVIRONMENTS）
 * @param {(msg:string)=>void} [options.onWarn] 告警回调
 * @returns {{totalRoutes:number, registeredCount:number, unregistered:object[], warnings:string[]}}
 */
export function validateRegistry(options = {}) {
  const {
    registry = CAPABILITY_REGISTRY,
    environment = resolveRuntimeEnvironment(),
    v2Routes = [],
    scannedRoutes = null,
    hardGate = HARD_COVERAGE_GATE_ALL_ENVIRONMENTS,
    onWarn = () => {},
  } = options

  const errors = []
  const warnings = []

  // ── ① 结构校验（全环境 fail-fast） ──────────────────────────────
  if (!registry || typeof registry !== 'object') {
    throw new Error('能力注册表校验失败：注册表缺失或不是对象')
  }
  if (registry.schemaVersion !== 1) {
    pushError(errors, `schemaVersion 必须为 1，当前为 ${registry.schemaVersion}`)
  }
  if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) {
    pushError(errors, 'capabilities 必须为非空数组')
  }
  if (!Array.isArray(registry.roles) || registry.roles.length === 0) {
    pushError(errors, 'roles 必须为非空数组')
  }
  if (!Array.isArray(registry.ratePlans)) {
    pushError(errors, 'ratePlans 必须为数组')
  }
  if (!Array.isArray(registry.switchKeys)) {
    pushError(errors, 'switchKeys 必须为数组')
  }

  const roles = new Set(registry.roles)
  const ratePlans = new Set(registry.ratePlans)
  const switchKeys = new Set(registry.switchKeys)
  const apiVersions = new Set(registry.apiVersions || ['v1', 'v2'])

  const capIds = new Set()
  const apiIds = new Set()
  const versionMethodPath = new Set()

  if (Array.isArray(registry.capabilities)) {
    for (const cap of registry.capabilities) {
      if (!cap || typeof cap.id !== 'string' || !cap.id) {
        pushError(errors, '存在缺少合法 id 的 capability')
        continue
      }
      if (capIds.has(cap.id)) pushError(errors, `capability id 重复：${cap.id}`)
      capIds.add(cap.id)

      if (!Array.isArray(cap.apis) || cap.apis.length === 0) {
        pushError(errors, `capability ${cap.id} 的 apis 必须为非空数组`)
        continue
      }
      for (const api of cap.apis) {
        if (!api || typeof api.apiId !== 'string' || !api.apiId) {
          pushError(errors, `capability ${cap.id} 存在缺少 apiId 的 api`)
          continue
        }
        if (apiIds.has(api.apiId)) pushError(errors, `apiId 重复：${api.apiId}`)
        apiIds.add(api.apiId)

        if (!apiVersions.has(api.version)) {
          pushError(errors, `api ${api.apiId} 的 version 非法：${api.version}`)
        }
        if (typeof api.method !== 'string' || !HTTP_METHODS.has(api.method)) {
          pushError(errors, `api ${api.apiId} 的 method 非法：${api.method}`)
        }
        if (typeof api.path !== 'string' || !api.path.startsWith('/')) {
          pushError(errors, `api ${api.apiId} 的 path 必须以 / 开头：${api.path}`)
        }
        if (!AUTH_MODES.includes(api.auth)) {
          pushError(errors, `api ${api.apiId} 的 auth 非法（须为 optional|required）：${api.auth}`)
        }
        if (api.roles !== null && api.roles !== undefined) {
          if (!Array.isArray(api.roles) || api.roles.length === 0) {
            pushError(errors, `api ${api.apiId} 的 roles 必须为 null 或非空数组`)
          } else {
            for (const role of api.roles) {
              if (!roles.has(role)) pushError(errors, `api ${api.apiId} 的角色非法：${role}`)
            }
            if (api.auth !== 'required') {
              pushError(errors, `api ${api.apiId} 携带 roles 但 auth=${api.auth}（roles 仅在 required 时允许）`)
            }
          }
        }
        if (api.ratePlan != null && !ratePlans.has(api.ratePlan)) {
          pushError(errors, `api ${api.apiId} 的 ratePlan 引用不存在：${api.ratePlan}`)
        }
        if (api.switchKey != null && !switchKeys.has(api.switchKey)) {
          pushError(errors, `api ${api.apiId} 的 switchKey 引用不存在：${api.switchKey}`)
        }
        const vmp = `${api.version} ${api.method} ${api.path}`
        if (versionMethodPath.has(vmp)) {
          pushError(errors, `同版本 method+path 重复：${vmp}`)
        }
        versionMethodPath.add(vmp)
      }
    }
  }

  // ── v2 已挂载路由必须已登记（全环境 fail-fast） ────────────────
  const v2Index = new Set(
    registry.capabilities
      .flatMap((cap) => cap.apis)
      .filter((api) => api.version === 'v2')
      .map((api) => `${api.method} ${api.path}`),
  )
  for (const def of v2Routes) {
    const key = `${def.method} ${def.path}`
    if (!v2Index.has(key)) {
      pushError(errors, `v2 路由未登记即挂载：${key}（D6 全环境 fail-fast）`)
    }
  }

  // ── 源码盘点（真实扫描或注入） ────────────────────────────────
  const scan = scannedRoutes
    ? {
        routes: scannedRoutes,
        duplicates: [],
        invalid: [],
        totalRoutes: scannedRoutes.length,
      }
    : scanRouteFiles()

  if (scan.duplicates.length > 0) {
    pushError(errors, `源码盘点发现重复 method+path：${JSON.stringify(scan.duplicates)}`)
  }
  if (scan.invalid.length > 0) {
    pushError(errors, `源码盘点发现非法路由定义：${JSON.stringify(scan.invalid)}`)
  }

  const v1Index = new Set(
    registry.capabilities
      .flatMap((cap) => cap.apis)
      .filter((api) => api.version === 'v1')
      .map((api) => `${api.method} ${api.path}`),
  )

  const unregistered = []
  for (const route of scan.routes) {
    const key = `${route.method} ${route.path}`
    if (!v1Index.has(key)) {
      unregistered.push({
        method: route.method,
        path: route.path,
        module: route.module,
        file: route.file,
        line: route.line,
      })
    }
  }

  // 孤儿登记：注册表存在但源码已不存在（v1 对账信息必须与真实路由一致）
  const orphans = []
  for (const cap of registry.capabilities) {
    for (const api of cap.apis) {
      if (api.version !== 'v1') continue
      const key = `${api.method} ${api.path}`
      if (!scan.routes.some((route) => `${route.method} ${route.path}` === key)) {
        orphans.push(`${api.apiId} (${api.method} ${api.path})`)
      }
    }
  }
  if (orphans.length > 0) {
    pushError(errors, `注册表存在孤儿登记（源码已无对应路由）：${orphans.join('、')}`)
  }

  // ── ② 覆盖缺口：D6 全环境硬门禁（任何环境/开关组合一律 fail，无 fail-open 路径） ──
  const coverageMode = hardGate ? 'fail' : resolveCoverageMode(environment)
  if (unregistered.length > 0) {
    const message = `注册表覆盖缺口：${unregistered.length} 条 v1 路由尚未登记（${unregistered.map((u) => `${u.method} ${u.path}@${u.file}:${u.line}`).join('；')}）`
    if (coverageMode === 'fail') {
      pushError(errors, message)
    } else {
      // 防御性兜底分支：D6 后不应到达（resolveCoverageMode 恒 'fail'），保留仅为避免静默放行。
      warnings.push(`${message}（${environment} 兜底告警分支被触发——覆盖缺口必须硬失败，请勿恢复分层放行）`)
      onWarn(warnings[warnings.length - 1])
      pushError(errors, `注册表覆盖缺口未按全环境硬门禁处理（${environment}）`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`能力注册表校验失败（${environment}）：\n- ${errors.join('\n- ')}`)
  }

  return {
    totalRoutes: scan.totalRoutes,
    registeredCount: scan.totalRoutes - unregistered.length,
    unregistered,
    // 分版本口径（2026-08-15）：v1 242/242；v2 3/3
    v1TotalRoutes: scan.totalRoutes,
    v1RegisteredCount: scan.totalRoutes - unregistered.length,
    v2TotalRoutes: v2Routes.length,
    v2RegisteredCount: v2Routes.filter((def) => v2Index.has(`${def.method} ${def.path}`)).length,
    capabilityCount: registry.capabilities.length,
    warnings,
  }
}
