/**
 * 116f-B 契约测试（注册表/盘点/校验器，纯单元，不连接数据库、不执行路由业务代码）。
 *
 * 覆盖（docs/116f-APIv2与能力注册表.md §13 C1/C10 + §6.3 六项契约门禁 + D6）：
 * - 盘点结果精确且排序确定（与文件遍历顺序无关）；
 * - 六项盘点门禁（实际总数 / 已登记 / 未登记 / 重复 method+path / 缺鉴权元数据 / 非法定义）；
 * - 注册表合法样例通过校验；
 * - 重复 capability id / apiId / 同版本 method+path；
 * - 非法 auth/role 元数据；
 * - 不同环境下覆盖缺口行为（dev/test fail-fast；demo/release 告警；硬门禁开关可升级）；
 * - v2 路由未登记即挂载 → 所有环境 fail-fast。
 */

import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'

import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'
import {
  validateRegistry,
  resolveCoverageMode,
} from '../src/contracts/registry.js'
import {
  scanRouteFiles,
  buildInventoryReport,
  noExplicitAuthMiddleware,
  registryMissingAuthMeta,
  ROUTE_FILES,
  BACKEND_ROOT,
} from '../src/contracts/route-scanner.js'
import { V2_ROUTE_DEFS } from '../src/routes/v2/index.js'

const reportFile = path.resolve(import.meta.dirname, '../src/contracts/inventory-report.json')
const committedReport = JSON.parse(readFileSync(reportFile, 'utf8'))

function registryV1Index(registry = CAPABILITY_REGISTRY) {
  const index = new Map()
  for (const cap of registry.capabilities) {
    for (const api of cap.apis) {
      if (api.version === 'v1') index.set(`${api.method} ${api.path}`, api)
    }
  }
  return index
}

function freshReport() {
  return buildInventoryReport(scanRouteFiles(), registryV1Index())
}

/** 构造最小合法注册表片段（单元测试用）。 */
function makeRegistry(capabilities, overrides = {}) {
  return {
    schemaVersion: 1,
    apiVersions: ['v1', 'v2'],
    roles: ['FARMER', 'ADMIN'],
    ratePlans: ['global', 'ai'],
    switchKeys: ['ai_chat'],
    sections: { system: '系统' },
    capabilities,
    ...overrides,
  }
}

function makeApi(apiId, overrides = {}) {
  return {
    apiId,
    version: 'v1',
    method: 'GET',
    path: `/x/${apiId}`,
    auth: 'optional',
    roles: null,
    switchKey: null,
    ratePlan: null,
    deprecated: false,
    deprecatedSince: null,
    sunset: null,
    ...overrides,
  }
}

function makeCap(id, apis) {
  return {
    id,
    section: 'system',
    name: id,
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis,
  }
}

/** 从注册表 v1 条目构造盘点路由（隔离孤儿/未登记噪音，聚焦被测断言）。 */
function routesFromRegistry(registry) {
  return registry.capabilities
    .flatMap((cap) => cap.apis)
    .filter((api) => api.version === 'v1')
    .map((api) => ({
      module: 'system',
      file: 'fake.routes.js',
      line: 1,
      method: api.method,
      path: api.path,
      auth: api.auth,
      roles: api.roles,
      authExplicit: true,
    }))
}

function isSorted(rows, cmp) {
  for (let i = 1; i < rows.length; i += 1) {
    if (cmp(rows[i - 1], rows[i]) > 0) return false
  }
  return true
}

test('116f-B 注册表与盘点契约（纯单元）', async (t) => {
  // ── 六项盘点门禁 + 确定性 ────────────────────────────────
  await t.test('盘点结果精确：v1 实际路由 242，且与已提交报告逐字节一致', () => {
    const scan = scanRouteFiles()
    assert.equal(scan.totalRoutes, 242, 'v1 实际路由总数必须为精确值 242（不再是估算 235+）')
    assert.deepEqual(freshReport(), committedReport, '新鲜盘点必须与已提交报告完全一致（drift 门禁）')
  })

  await t.test('输出不依赖文件扫描顺序：打乱文件列表后输出逐字节一致', () => {
    const shuffled = [...ROUTE_FILES].reverse()
    const a = scanRouteFiles()
    const b = scanRouteFiles({ files: shuffled })
    // 逐字节比较（序列化后字符串完全相等），而非仅结构相等
    assert.equal(JSON.stringify(b), JSON.stringify(a), '打乱文件顺序后输出必须逐字节一致')
  })

  await t.test('同一命令连续执行两次产物逐字节一致（确定性）', () => {
    const first = JSON.stringify(freshReport())
    const second = JSON.stringify(freshReport())
    assert.equal(second, first)
  })

  await t.test('门禁①/②/③：v1 total=242、registered=242、unregistered=0', () => {
    const report = freshReport()
    assert.equal(report.totalRoutes, 242)
    assert.equal(report.registeredCount, 242)
    assert.deepEqual(report.unregistered, [])
  })

  await t.test('门禁④：重复 method+path 为 0（含源码定位）', () => {
    const report = freshReport()
    assert.deepEqual(report.duplicates, [])
  })

  await t.test('门禁⑥：非法/无法解析定义 0 条', () => {
    const report = freshReport()
    assert.deepEqual(report.invalid, [])
  })

  await t.test('指标一：源路由未挂 requireAuth 的公开/可选认证端点恰为 6 条（人工确认行为，逐项列出）', () => {
    const report = freshReport()
    const expected = [
      'GET /ping',                    // 健康探针（routes/index.js），公开
      'POST /auth/login',             // 登录，116e 公开契约
      'POST /auth/register',          // 公开注册（固定 FARMER），116e 公开契约
      'POST /auth/refresh',           // refresh 换发，116e 公开契约
      'POST /auth/reset-password',    // 重置码换密，116e 公开契约
      'POST /auth/logout',            // 幂等撤销（access/refresh 由控制器校验），116e 契约
    ]
    assert.deepEqual(
      report.noExplicitAuthMiddleware.map((r) => `${r.method} ${r.path}`).sort(),
      [...expected].sort(),
    )
    // 每条都必须在注册表中显式登记 auth=optional（人工确认的现有行为，非扫描器猜测）
    const index = registryV1Index()
    for (const route of noExplicitAuthMiddleware(scanRouteFiles())) {
      const api = index.get(`${route.method} ${route.path}`)
      assert.ok(api, `${route.method} ${route.path} 必须在注册表中登记`)
      assert.equal(api.auth, 'optional', `${route.method} ${route.path} 必须显式登记 auth=optional`)
      assert.equal(api.roles, null)
    }
  })

  await t.test('指标二：注册表缺失 auth 元数据 = 0（与指标一互不混淆）', () => {
    const report = freshReport()
    assert.deepEqual(report.registryMissingAuthMeta, [])
    assert.deepEqual(registryMissingAuthMeta(registryV1Index()), [])
  })

  await t.test('数量口径：v1 242/242、v2 5/5、capabilities 总数 247', () => {
    const registry = CAPABILITY_REGISTRY
    const v1Apis = registry.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v1')
    const v2Apis = registry.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v2')
    assert.equal(v1Apis.length, 242, '注册表 v1 api 数必须为 242')
    assert.equal(v2Apis.length, 5, '注册表 v2 api 数必须为 5（116f-B 3 + 116f-C 2）')
    assert.equal(registry.capabilities.length, 247, 'capability 总数必须为 247 = 242(v1) + 5(v2)')

    // 校验器返回分版本口径
    const audit = validateRegistry({ environment: 'dev', v2Routes: V2_ROUTE_DEFS })
    assert.equal(audit.v1TotalRoutes, 242)
    assert.equal(audit.v1RegisteredCount, 242)
    assert.equal(audit.v2TotalRoutes, 5)
    assert.equal(audit.v2RegisteredCount, 5)
    assert.equal(audit.capabilityCount, 247)

    // 生产 v2 路由表：只有 5 个 GET，不存在 POST /api/v2/ping
    assert.deepEqual(V2_ROUTE_DEFS, [
      { method: 'GET', path: '/ping' },
      { method: 'GET', path: '/capabilities' },
      { method: 'GET', path: '/api-catalog' },
      { method: 'GET', path: '/market/products' },
      { method: 'GET', path: '/market/products/:id' },
    ])
    assert.deepEqual(
      v2Apis.map((a) => `${a.method} ${a.path}`).sort(),
      ['GET /api-catalog', 'GET /capabilities', 'GET /market/products', 'GET /market/products/:id', 'GET /ping'],
      '生产注册表中 v2 只能有 5 个 GET 端点',
    )
    assert.ok(!v2Apis.some((a) => a.method !== 'GET'), '生产注册表不得存在任何非 GET 的 v2 端点')
  })

  await t.test('POST /api/v2/ping 未登记 → 挂载即全环境 fail-fast（生产路由表证据）', () => {
    for (const environment of ['dev', 'demo', 'release']) {
      assert.throws(
        () => validateRegistry({ environment, v2Routes: [...V2_ROUTE_DEFS, { method: 'POST', path: '/ping' }] }),
        /v2 路由未登记即挂载/,
        `${environment} 环境必须拒绝 POST /v2/ping 挂载`,
      )
    }
  })

  await t.test('全部路由 auth/roles 元数据合法（非仅长度断言）', () => {
    for (const route of freshReport().routes) {
      assert.ok(['optional', 'required'].includes(route.auth), `${route.method} ${route.path} auth 非法`)
      if (route.roles) {
        assert.ok(Array.isArray(route.roles) && route.roles.length > 0)
        for (const role of route.roles) {
          assert.ok(CAPABILITY_REGISTRY.roles.includes(role), `${route.method} ${route.path} 角色非法: ${role}`)
        }
      }
    }
  })

  await t.test('盘点路由列表排序确定', () => {
    const routes = freshReport().routes
    assert.ok(isSorted(routes, (a, b) => (
      a.path < b.path ? -1 : a.path > b.path ? 1
        : a.method < b.method ? -1 : a.method > b.method ? 1
          : a.file < b.file ? -1 : a.file > b.file ? 1
            : a.line - b.line
    )))
  })

  await t.test('代表行精确元数据（模块作用域/角色/开关/弃用）', () => {
    const index = registryV1Index()
    const cases = [
      { key: 'GET /agri/plot/list', auth: 'required', roles: null, module: 'agri', switchKey: null },
      { key: 'POST /auth/login', auth: 'optional', roles: null, module: 'platform', switchKey: null },
      { key: 'GET /ping', auth: 'optional', roles: null, module: 'system', switchKey: null },
      { key: 'GET /admin/api-switch/list', auth: 'required', roles: ['ADMIN'], switchKey: null, module: 'platform' },
      { key: 'POST /market/order', auth: 'required', roles: null, switchKey: 'market_order', module: 'market' },
      { key: 'POST /agri/disease/detect', auth: 'required', roles: null, switchKey: 'ai_disease_detect', module: 'agri' },
      { key: 'POST /data/sync', auth: 'required', roles: null, switchKey: 'offline_sync', module: 'data' },
      { key: 'POST /life/help', auth: 'required', roles: null, switchKey: 'community_post', module: 'life' },
      { key: 'POST /ai/tts', auth: 'required', roles: null, switchKey: null, module: 'ai' },
    ]
    for (const c of cases) {
      const api = index.get(c.key)
      assert.ok(api, `注册表缺少 ${c.key}`)
      assert.equal(api.auth, c.auth, `${c.key} auth`)
      assert.deepEqual(api.roles, c.roles, `${c.key} roles`)
      assert.equal(api.switchKey, c.switchKey, `${c.key} switchKey`)
      const scanRoute = freshReport().routes.find((r) => `${r.method} ${r.path}` === c.key)
      assert.equal(scanRoute.module, c.module, `${c.key} module`)
    }
  })

  await t.test('既有弃用 alias 只登记 DELETE /ai/qa/records/:id（deprecatedSince=2026-08-15）', () => {
    const deprecated = CAPABILITY_REGISTRY.capabilities
      .flatMap((cap) => cap.apis)
      .filter((api) => api.version === 'v1' && api.deprecated)
    assert.equal(deprecated.length, 1)
    assert.equal(deprecated[0].method, 'DELETE')
    assert.equal(deprecated[0].path, '/ai/qa/records/:id')
    assert.equal(deprecated[0].deprecatedSince, '2026-08-15')
  })

  await t.test('D2 迁移方案仅记录（primaryGroup=agri，未实施）', () => {
    const note = CAPABILITY_REGISTRY.migrationNotes.aiDetectRecordResourceGroups
    assert.equal(note.primaryGroup, 'agri')
    assert.deepEqual(note.secondaryTags, ['ai'])
    assert.equal(note.status, 'planned-not-implemented')
  })

  // ── 校验器：真实注册表必须通过 ────────────────────────────
  await t.test('真实注册表通过校验：v1 242/242 已登记，无未登记、无告警', () => {
    const result = validateRegistry({ environment: 'dev' })
    assert.equal(result.totalRoutes, 242)
    assert.equal(result.registeredCount, 242)
    assert.deepEqual(result.unregistered, [])
    assert.deepEqual(result.warnings, [])
  })

  await t.test('CLI 漂移门禁：产物一致时 inventory/gen 的 --check 均退出 0', () => {
    for (const script of ['scripts/inventory-routes.mjs', 'scripts/gen-capabilities.mjs']) {
      const res = spawnSync(process.execPath, [script, '--check'], {
        cwd: BACKEND_ROOT,
        encoding: 'utf8',
      })
      assert.equal(res.status, 0, `${script} --check 应退出 0（产物与源码一致）。stdout: ${res.stdout} stderr: ${res.stderr}`)
    }
  })

  await t.test('fixture：重复 method+path 与非法定义精确失败并含 file:line（temp 目录，finally 清理）', () => {
    const dir = mkdtempSync(path.join(BACKEND_ROOT, 'prisma', '.test-116f-fixture-'))
    const fixtureFile = 'src/modules/fixture/fixture.routes.js'
    try {
      const abs = path.join(dir, fixtureFile)
      mkdirSync(path.dirname(abs), { recursive: true })
      writeFileSync(abs, [
        "import { Router } from 'express'",
        'const router = Router()',
        "router.get('/dup', (req, res) => {})",
        "router.get('/dup', (req, res) => {})",
        'router.post(dynamicPath, handler)',
        "router.get('/ok', requireAuth, handler)",
      ].join('\n'))

      const scan = scanRouteFiles({ backendRoot: dir, files: [fixtureFile] })
      assert.equal(scan.totalRoutes, 3)

      assert.equal(scan.duplicates.length, 1)
      assert.equal(scan.duplicates[0].method, 'GET')
      assert.equal(scan.duplicates[0].path, '/dup')
      assert.equal(scan.duplicates[0].occurrences.length, 2)
      for (const occ of scan.duplicates[0].occurrences) {
        assert.ok(occ.file.endsWith('fixture.routes.js'))
        assert.equal(typeof occ.line, 'number')
        assert.ok(occ.line >= 3 && occ.line <= 4, `重复项行号应为 3/4，实际 ${occ.line}`)
      }

      assert.equal(scan.invalid.length, 1)
      assert.equal(scan.invalid[0].method, 'post')
      assert.match(scan.invalid[0].reason, /首参不是字符串路径/)
      assert.equal(scan.invalid[0].line, 5)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  await t.test('resolveCoverageMode：dev/test fail；demo/release warn；硬门禁后全 fail', () => {
    assert.equal(resolveCoverageMode('dev'), 'fail')
    assert.equal(resolveCoverageMode('test'), 'fail')
    assert.equal(resolveCoverageMode('demo'), 'warn')
    assert.equal(resolveCoverageMode('release'), 'warn')
    // 硬门禁开关升级后的行为（116f 完成前必须升级为全环境硬门禁）
    const demoWithHardGate = () => validateRegistry({
      environment: 'demo',
      hardGate: true,
      scannedRoutes: [
        ...scanRouteFiles().routes,
        { module: 'x', file: 'fake.js', line: 1, method: 'GET', path: '/unregistered', auth: 'optional', roles: null },
      ],
    })
    assert.throws(demoWithHardGate, /覆盖缺口/)
  })

  // ── 结构错误：所有环境 fail-fast ──────────────────────────
  await t.test('schemaVersion 非法 → throw', () => {
    const registry = makeRegistry([], { schemaVersion: 2 })
    assert.throws(
      () => validateRegistry({ registry, scannedRoutes: [], environment: 'demo' }),
      /schemaVersion/,
    )
  })

  await t.test('capability id 重复 → throw（demo 环境同样 fail-fast）', () => {
    const registry = makeRegistry([
      makeCap('cap.dup', [makeApi('api.one')]),
      makeCap('cap.dup', [makeApi('api.two')]),
    ])
    assert.throws(
      () => validateRegistry({ registry, scannedRoutes: routesFromRegistry(registry), environment: 'demo' }),
      /capability id 重复/,
    )
  })

  await t.test('apiId 重复 → throw', () => {
    const registry = makeRegistry([
      makeCap('cap.one', [makeApi('api.dup', { path: '/a' })]),
      makeCap('cap.two', [makeApi('api.dup', { path: '/b' })]),
    ])
    assert.throws(
      () => validateRegistry({ registry, scannedRoutes: routesFromRegistry(registry), environment: 'dev' }),
      /apiId 重复/,
    )
  })

  await t.test('同版本 method+path 重复 → throw；跨版本同名 path 合法', () => {
    const dup = makeRegistry([
      makeCap('cap.one', [makeApi('api.one', { path: '/same' })]),
      makeCap('cap.two', [makeApi('api.two', { path: '/same' })]),
    ])
    assert.throws(
      () => validateRegistry({ registry: dup, scannedRoutes: routesFromRegistry(dup), environment: 'dev' }),
      /method\+path 重复/,
    )

    const crossVersion = makeRegistry([
      makeCap('cap.one', [makeApi('api.one', { path: '/ping' })]),
      makeCap('cap.two', [makeApi('api.two', { version: 'v2', path: '/ping', auth: 'optional' })]),
    ])
    assert.doesNotThrow(() => validateRegistry({
      registry: crossVersion,
      scannedRoutes: routesFromRegistry(crossVersion),
      environment: 'dev',
    }))
  })

  await t.test('非法 auth 枚举 → throw', () => {
    const registry = makeRegistry([makeCap('cap.one', [makeApi('api.one', { auth: 'public' })])])
    assert.throws(
      () => validateRegistry({ registry, scannedRoutes: routesFromRegistry(registry), environment: 'dev' }),
      /auth 非法/,
    )
  })

  await t.test('非法角色 → throw', () => {
    const registry = makeRegistry([makeCap('cap.one', [makeApi('api.one', { auth: 'required', roles: ['SUPERADMIN'] })])])
    assert.throws(
      () => validateRegistry({ registry, scannedRoutes: routesFromRegistry(registry), environment: 'dev' }),
      /角色非法/,
    )
  })

  await t.test('optional 携带 roles → throw（roles 仅限 required）', () => {
    const registry = makeRegistry([makeCap('cap.one', [makeApi('api.one', { auth: 'optional', roles: ['ADMIN'] })])])
    assert.throws(
      () => validateRegistry({ registry, scannedRoutes: routesFromRegistry(registry), environment: 'dev' }),
      /roles 仅在 required/,
    )
  })

  await t.test('ratePlan/switchKey 引用完整性 → throw', () => {
    const badRate = makeRegistry([makeCap('cap.one', [makeApi('api.one', { ratePlan: 'nonexistent' })])])
    assert.throws(
      () => validateRegistry({ registry: badRate, scannedRoutes: routesFromRegistry(badRate), environment: 'dev' }),
      /ratePlan 引用不存在/,
    )
    const badSwitch = makeRegistry([makeCap('cap.one', [makeApi('api.one', { switchKey: 'ghost_key' })])])
    assert.throws(
      () => validateRegistry({ registry: badSwitch, scannedRoutes: routesFromRegistry(badSwitch), environment: 'dev' }),
      /switchKey 引用不存在/,
    )
  })

  // ── 覆盖缺口：迁移期分层行为（直接证明，非 truthy） ──────────
  const realRoutes = scanRouteFiles().routes
  const registryMinusOne = {
    ...CAPABILITY_REGISTRY,
    capabilities: CAPABILITY_REGISTRY.capabilities.filter(
      (cap) => !cap.apis.some((api) => api.version === 'v1' && api.method === 'GET' && api.path === '/ping'),
    ),
  }

  await t.test('覆盖缺口 dev：fail-fast（throw 且信息含定位）', () => {
    assert.throws(
      () => validateRegistry({ registry: registryMinusOne, scannedRoutes: realRoutes, environment: 'dev' }),
      /覆盖缺口.*GET \/ping/s,
    )
  })

  await t.test('覆盖缺口 test：fail-fast', () => {
    assert.throws(
      () => validateRegistry({ registry: registryMinusOne, scannedRoutes: realRoutes, environment: 'test' }),
      /覆盖缺口/,
    )
  })

  await t.test('覆盖缺口 demo/release：不阻断、告警回调收到明细', () => {
    for (const environment of ['demo', 'release']) {
      const warnings = []
      const result = validateRegistry({
        registry: registryMinusOne,
        scannedRoutes: realRoutes,
        environment,
        onWarn: (msg) => warnings.push(msg),
      })
      assert.equal(result.unregistered.length, 1)
      assert.equal(result.unregistered[0].path, '/ping')
      assert.equal(result.registeredCount, 241)
      assert.equal(warnings.length, 1)
      assert.match(warnings[0], /覆盖缺口.*GET \/ping/s)
    }
  })

  // ── v2 未登记即挂载：所有环境 fail-fast ────────────────────
  await t.test('v2 五端点已登记 → 校验通过', () => {
    assert.doesNotThrow(() => validateRegistry({
      environment: 'dev',
      v2Routes: V2_ROUTE_DEFS,
    }))
  })

  await t.test('v2 未登记即挂载 → 所有环境 fail-fast（dev 与 demo 都 throw）', () => {
    for (const environment of ['dev', 'demo', 'release']) {
      assert.throws(
        () => validateRegistry({
          environment,
          v2Routes: [{ method: 'GET', path: '/unregistered-v2' }],
        }),
        /v2 路由未登记即挂载/,
      )
    }
  })
})
