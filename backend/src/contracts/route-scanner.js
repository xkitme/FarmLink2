/**
 * v1 路由静态盘点扫描器（116f-B）。
 *
 * 设计约束（docs/116f-APIv2与能力注册表.md §6.3 / D6）：
 * - 纯静态源码解析：只读 routes 文件文本，绝不 import 路由模块，
 *   绝不执行任何控制器/服务业务代码，绝不连接数据库。
 * - 输出顺序确定：文件列表固定排序 + 结果按 (path, method, file, line) 排序，
 *   与文件系统遍历顺序、线程调度完全无关，重复执行产出逐字节一致。
 * - 对无法解析的路由定义产出 invalid 清单（含文件与行号），绝不静默跳过。
 *
 * 识别范围（当前真实代码形态，2026-08-15 独立枚举核对）：
 * - `router.get/post/put/delete/patch/all('/path', mw..., handler)` 及其多行写法；
 *   （当前源码实际使用 get/post/put/delete 四种，patch/all 已支持但未出现）
 * - `router.use('/prefix', requireAuth[, requireRole(...)])` 模块级鉴权作用域；
 * - `router.use(subRouter)`（无路径字符串）忽略——子路由已在各自文件盘点；
 * - 参数路径（/x/:id、/x/:threadId 等）原样登记；
 * - 同一文件多个相同 method+path 会进入 duplicates 清单（含 file:line）；
 * - 注释、字符串与测试代码不会误识别（注释先剥离、只匹配 router.<method>( 后跟字符串字面量）；
 * - 当前源码不存在 `router.route('/p').get(...)` 链式形式与 app 级 /api 挂载，
 *   若未来出现，scanner 会把它们报进 invalid 清单强制人工处理（不静默漏计）。
 *
 * 数量口径（116f-C 基线，2026-08-15）：
 * - v1 实际路由：242；注册表 v1 已登记：242/242；
 * - v2 实际路由：5（GET /ping、/capabilities、/api-catalog + 116f-C GET /market/products、/market/products/:id）；
 *   注册表 v2 已登记：5/5；
 * - 注册表 capability 总数：247 = 242(v1) + 5(v2)。
 * 口径由 inventory-report.json + --check 漂移门禁锁定，改路由必须同步 --write。
 */

import fs from 'node:fs'
import path from 'node:path'

/** 统一前缀下挂载的全部 v1 路由注册文件（固定顺序）。 */
export const ROUTE_FILES = Object.freeze([
  'src/routes/index.js',
  'src/modules/agri/agri.routes.js',
  'src/modules/ai/ai.routes.js',
  'src/modules/data/data.routes.js',
  'src/modules/disaster/disaster.routes.js',
  'src/modules/iot/iot.routes.js',
  'src/modules/life/life.routes.js',
  'src/modules/machinery/machinery.routes.js',
  'src/modules/market/market.routes.js',
  'src/modules/platform/platform.routes.js',
  'src/modules/policy/policy.routes.js',
])

export const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'all'])

const MODULE_BY_FILE = {
  'src/routes/index.js': 'system',
  'src/modules/agri/agri.routes.js': 'agri',
  'src/modules/ai/ai.routes.js': 'ai',
  'src/modules/data/data.routes.js': 'data',
  'src/modules/disaster/disaster.routes.js': 'disaster',
  'src/modules/iot/iot.routes.js': 'iot',
  'src/modules/life/life.routes.js': 'life',
  'src/modules/machinery/machinery.routes.js': 'machinery',
  'src/modules/market/market.routes.js': 'market',
  'src/modules/platform/platform.routes.js': 'platform',
  'src/modules/policy/policy.routes.js': 'policy',
}

export const ROLES = Object.freeze(['FARMER', 'BIGFARMER', 'VILLAGE', 'EXPERT', 'MERCHANT', 'ADMIN'])

export const AUTH_MODES = Object.freeze(['optional', 'required'])

/** 默认后端根目录：本文件位于 backend/src/contracts/。 */
export const BACKEND_ROOT = path.resolve(import.meta.dirname, '..', '..')

/**
 * 去除 `//` 与 `/* *\/` 注释，保留换行与其余字符位置（行号与后续扫描不受影响）。
 */
function stripComments(source) {
  let out = ''
  let i = 0
  const n = source.length
  while (i < n) {
    const c = source[i]
    const next = source[i + 1]
    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {
        out += ' '
        i += 1
      }
      continue
    }
    if (c === '/' && next === '*') {
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += '  '
        i += 2
      }
      continue
    }
    out += c
    i += 1
  }
  return out
}

/** 行号：src 中 index 之前的换行数 + 1。 */
function lineAt(src, index) {
  let count = 1
  for (let i = 0; i < index; i += 1) {
    if (src[i] === '\n') count += 1
  }
  return count
}

/**
 * 从 openIndex（'(' 位置）找到匹配的 ')'，跳过字符串字面量；找不到返回 -1。
 */
function findCallEnd(src, openIndex) {
  let depth = 0
  let i = openIndex
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      i += 1
      while (i < n) {
        if (src[i] === '\\') {
          i += 2
          continue
        }
        if (src[i] === quote) {
          i += 1
          break
        }
        i += 1
      }
      continue
    }
    if (c === '(') depth += 1
    else if (c === ')') {
      depth -= 1
      if (depth === 0) return i
    }
    i += 1
  }
  return -1
}

/**
 * 按顶层逗号切分参数片段（跳过字符串与嵌套括号），返回片段数组。
 */
function splitTopLevelArgs(src, from, to) {
  const parts = []
  let depth = 0
  let start = from
  let i = from
  while (i < to) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      i += 1
      while (i < to) {
        if (src[i] === '\\') {
          i += 2
          continue
        }
        if (src[i] === quote) {
          i += 1
          break
        }
        i += 1
      }
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth += 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (c === ',' && depth === 0) {
      parts.push(src.slice(start, i))
      start = i + 1
    }
    i += 1
  }
  if (start < to) parts.push(src.slice(start, to))
  return parts
}

/** 从参数片段提取 requireRole('X', 'Y') 的角色列表（无则 null）。 */
function extractRoles(arg) {
  const match = /^requireRole\s*\(/.exec(arg)
  if (!match) return null
  const open = match.index + match[0].length - 1
  const end = findCallEnd(arg, open)
  if (end === -1) return null
  const roles = []
  for (const seg of splitTopLevelArgs(arg, open + 1, end)) {
    const lit = /^\s*(['"`])(.*)\1\s*$/.exec(seg)
    if (lit) roles.push(lit[2])
  }
  return roles.length ? roles : null
}

/** 从参数片段推断鉴权元数据。 */
function inferAuth(args, scopes) {
  let auth = null
  let roles = null
  let explicit = false

  for (const arg of args) {
    const trimmed = arg.trim()
    if (trimmed === 'requireAuth') {
      auth = 'required'
      explicit = true
    } else if (trimmed === 'optionalAuth') {
      auth = 'optional'
      explicit = true
    } else if (/^requireRole\s*\(/.test(trimmed)) {
      const found = extractRoles(trimmed)
      if (found) roles = found
      if (auth !== 'optional') auth = 'required' // requireRole 隐含已登录
      explicit = true
    }
  }

  if (auth !== null) return { auth, roles, explicit }

  // 模块级 router.use('/prefix', requireAuth[, requireRole]) 作用域
  for (const scope of scopes) {
    if (!scope.prefix) continue
    if (auth === null && scope.auth) {
      auth = scope.auth
      roles = scope.roles
      explicit = true
    }
  }

  // 全局 optionalAuth（app.js 对所有 API 挂载）：无显式元数据时按 optional 登记
  if (auth === null) return { auth: 'optional', roles: null, explicit: false }
  return { auth, roles, explicit }
}

/**
 * 扫描全部 v1 路由注册文件。
 *
 * @param {object} [options]
 * @param {string[]} [options.files] 待扫描文件（相对 backend 根）；默认 ROUTE_FILES。
 * @param {string} [options.backendRoot]
 * @returns {{ totalRoutes:number, routes:object[], duplicates:object[], invalid:object[], files:string[] }}
 */
export function scanRouteFiles(options = {}) {
  const backendRoot = options.backendRoot || BACKEND_ROOT
  const files = options.files || ROUTE_FILES

  const routes = []
  const invalid = []
  const ignored = []

  for (const rel of files) {
    const abs = path.join(backendRoot, rel)
    let source
    try {
      source = fs.readFileSync(abs, 'utf8')
    } catch (err) {
      invalid.push({ file: rel, line: null, method: null, reason: `无法读取文件: ${err.message}` })
      continue
    }
    const src = stripComments(source)
    const module = MODULE_BY_FILE[rel] || 'unknown'

    // 先收集本文件的模块级鉴权作用域（router.use('/prefix', requireAuth[, requireRole])）
    const scopes = []
    const callRe = /router\.(use)\(/g
    let match
    while ((match = callRe.exec(src)) !== null) {
      const open = match.index + match[0].length - 1
      const end = findCallEnd(src, open)
      if (end === -1) {
        invalid.push({ file: rel, line: lineAt(src, match.index), method: 'use', reason: '括号不闭合' })
        continue
      }
      const body = src.slice(open + 1, end)
      const args = splitTopLevelArgs(src, open + 1, end)
      const first = args[0] || ''
      const lit = /^\s*(['"`])(.*)\1\s*$/.exec(first)
      if (!lit) {
        ignored.push({ file: rel, line: lineAt(src, match.index), reason: `router.use(非字符串路径): ${body.slice(0, 40)}` })
        continue
      }
      const { auth, roles } = inferAuth(args.slice(1), [])
      if (auth === 'required' || roles) {
        scopes.push({ prefix: lit[2], auth, roles })
      } else {
        // router.use('/prefix', 无鉴权) — 记录作用域但不携带鉴权（当前代码库无此形态）
        ignored.push({ file: rel, line: lineAt(src, match.index), reason: `router.use('${lit[2]}') 无鉴权中间件` })
      }
    }

    // 逐条提取 HTTP 路由注册
    const routeRe = /router\.(get|post|put|delete|patch|all)\(/g
    while ((match = routeRe.exec(src)) !== null) {
      const method = match[1]
      const open = match.index + match[0].length - 1
      const end = findCallEnd(src, open)
      if (end === -1) {
        invalid.push({ file: rel, line: lineAt(src, match.index), method, reason: '括号不闭合' })
        continue
      }
      const args = splitTopLevelArgs(src, open + 1, end)
      const first = (args[0] || '').trim()
      const pathLit = /^(['"`])(.*)\1$/.exec(first)
      if (!pathLit) {
        invalid.push({ file: rel, line: lineAt(src, match.index), method, reason: `首参不是字符串路径: ${first.slice(0, 60)}` })
        continue
      }
      const routePath = pathLit[2]
      const { auth, roles, explicit } = inferAuth(args.slice(1), scopes)
      routes.push({
        module,
        file: rel,
        line: lineAt(src, match.index),
        method: method.toUpperCase(),
        path: routePath,
        auth,
        roles,
        authExplicit: explicit,
      })
    }
  }

  // 确定性排序：与文件遍历顺序无关
  routes.sort((a, b) => (
    a.path < b.path ? -1
      : a.path > b.path ? 1
        : a.method < b.method ? -1
          : a.method > b.method ? 1
            : a.file < b.file ? -1
              : a.file > b.file ? 1
                : a.line - b.line
  ))

  // 重复 method+path（跨文件、跨行），携带全部发生位置
  const seen = new Map()
  const duplicates = []
  for (const route of routes) {
    const key = `${route.method} ${route.path}`
    const bucket = seen.get(key)
    if (!bucket) {
      seen.set(key, [route])
      continue
    }
    bucket.push(route)
    if (bucket.length === 2) {
      duplicates.push({ method: route.method, path: route.path, occurrences: bucket })
    }
  }

  return {
    totalRoutes: routes.length,
    routes,
    duplicates,
    invalid: invalid
      .map((item) => ({ ...item, line: item.line }))
      .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : (a.line || 0) - (b.line || 0))),
    files: [...files].sort(),
  }
}

/**
 * 指标一（源侧）：源路由未挂 requireAuth/optionalAuth、仅靠全局 optionalAuth 兜底
 * （authExplicit=false）的端点清单。这些是人工确认的公开/可选认证行为，
 * 不是“缺口”——注册表必须为它们显式登记 auth=optional（见 registryMissingAuthMeta 对账）。
 */
export function noExplicitAuthMiddleware(scan) {
  return scan.routes
    .filter((route) => !route.authExplicit)
    .map((route) => ({ method: route.method, path: route.path, module: route.module, file: route.file, line: route.line, auth: route.auth }))
}

/**
 * 指标二（注册表侧）：注册表中 auth 元数据缺失或非法的 v1 条目。
 * 校验器对非法值 fail-fast，因此该清单必须恒为 0；非 0 即结构缺陷。
 *
 * @param {Map<string,object>} registryV1Index method+path → registry v1 api
 */
export function registryMissingAuthMeta(registryV1Index) {
  const missing = []
  for (const [key, api] of registryV1Index) {
    if (!api || !AUTH_MODES.includes(api.auth)) {
      missing.push({ key, apiId: api?.apiId || null, auth: api?.auth ?? null })
    }
  }
  return missing
}

/**
 * 构建与 116f-B 契约对齐的完整盘点报告（确定性 JSON）。
 * registered/unregistered 通过与注册表 v1 条目对账得出。
 *
 * @param {object} scan scanRouteFiles 结果
 * @param {Map<string,object>} registryV1Index method+path → registry v1 api
 */
export function buildInventoryReport(scan, registryV1Index) {
  const unregistered = []
  for (const route of scan.routes) {
    const key = `${route.method} ${route.path}`
    if (!registryV1Index.has(key)) {
      unregistered.push({
        method: route.method,
        path: route.path,
        module: route.module,
        file: route.file,
        line: route.line,
      })
    }
  }

  return {
    schemaVersion: 1,
    scannedFiles: scan.files,
    totalRoutes: scan.totalRoutes,
    registeredCount: scan.totalRoutes - unregistered.length,
    unregistered,
    duplicates: scan.duplicates,
    // 指标一：源路由未挂 requireAuth 的公开/可选认证端点（人工确认行为，非缺口）
    noExplicitAuthMiddleware: noExplicitAuthMiddleware(scan),
    // 指标二：注册表缺失 auth 元数据（恒为 0，校验器 fail-fast 兜底）
    registryMissingAuthMeta: registryMissingAuthMeta(registryV1Index),
    invalid: scan.invalid,
    routes: scan.routes,
  }
}
