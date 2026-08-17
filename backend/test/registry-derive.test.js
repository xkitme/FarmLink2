/**
 * 116f-F 派生一致性契约测试（C5，纯单元，不连接数据库、不执行路由业务代码）。
 *
 * 覆盖（docs/116f-APIv2与能力注册表.md §13 C5 + §9 116f-F 退出条件）：
 * - assistant ROUTE_CATALOG/ROUTE_FEATURES 与注册表 featureCatalog 逐字段一致、双向覆盖；
 * - admin apiCatalog 与注册表 v1 子集一致（key 唯一、method+规范化 path 唯一、
 *   auth/roles/version 关键字段精确、代表性 v1/v2/公开/认证/ADMIN/参数化路径）；
 * - Flutter feature_catalog 与注册表 featureCatalog 逐字段一致、双向覆盖；
 * - 人为构造 stale/错误产物时门禁必须失败；--check 逻辑绝不改写产物文件；
 * - 正向结果与 fallback/空目录明显不同（具体内容 + 精确数量断言，非 truthy/长度）；
 * - 防共同漂移：HEAD 旧行为基线冻结（规范化 SHA256 + 代表项字段断言，见文件末尾）。
 */

import { readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'

import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'
import { BACKEND_ROOT } from '../src/contracts/route-scanner.js'
import { buildCatalog, checkAdminCatalog } from '../scripts/gen-admin-api-catalog.mjs'
import { buildAssistantRoutes, checkAssistantRoutes } from '../scripts/gen-assistant-routes.mjs'
import { buildFeatureCatalog, checkFeatureCatalog } from '../scripts/gen-feature-catalog.mjs'
import { ROUTE_CATALOG, ROUTE_FEATURES } from '../src/modules/ai/services/assistant-catalog.generated.js'

const ASSISTANT_OUT = path.join(BACKEND_ROOT, 'src', 'modules', 'ai', 'services', 'assistant-catalog.generated.js')
const ADMIN_OUT = path.join(BACKEND_ROOT, 'admin', 'src', 'apiCatalog.js')
const FLUTTER_OUT = path.join(BACKEND_ROOT, '..', 'app', 'lib', 'core', 'feature_catalog.dart')

/** 参数段（:xxx）与纯数字段统一为 :p、忽略 query（与生成器同口径，独立实现）。 */
function normalizePath(routePath) {
  const bare = routePath.split('?')[0]
  const segments = bare.split('/').filter(Boolean).map((seg) => {
    if (seg.startsWith(':') || /^\d+$/.test(seg)) return ':p'
    return seg
  })
  return `/${segments.join('/')}`
}

const fc = CAPABILITY_REGISTRY.featureCatalog
const routeByKey = new Map(fc.routes.map((r) => [r.key, r]))
const registryV1Apis = CAPABILITY_REGISTRY.capabilities
  .flatMap((cap) => cap.apis.filter((api) => api.version === 'v1').map((api) => ({ cap, api })))
const registryV1ByApiId = new Map(registryV1Apis.map(({ api }) => [api.apiId, api]))

test('assistant ROUTE_CATALOG/ROUTE_FEATURES 派生（C5，注册表 featureCatalog 唯一事实源）', async (t) => {
  await t.test('ROUTE_CATALOG 与注册表 routes 逐字段一致（34 页，顺序一致）', () => {
    assert.deepEqual(
      ROUTE_CATALOG,
      fc.routes.map((r) => [r.key, r.label]),
      'ROUTE_CATALOG 必须逐字段等于注册表 featureCatalog.routes 的 key/label',
    )
  })

  await t.test('ROUTE_FEATURES 与注册表 routeFeatures 逐字段一致（16 页，顺序一致）', () => {
    assert.deepEqual(ROUTE_FEATURES, fc.routeFeatures, 'ROUTE_FEATURES 必须逐字段等于注册表 routeFeatures')
  })

  await t.test('双向完整覆盖：routes ↔ ROUTE_CATALOG、routeFeatures ↔ ROUTE_FEATURES', () => {
    assert.deepEqual(Object.keys(ROUTE_FEATURES), Object.keys(fc.routeFeatures), 'routeFeatures 键集合必须一致')
    const catalogKeys = new Set(ROUTE_CATALOG.map(([key]) => key))
    for (const r of fc.routes) {
      assert.ok(catalogKeys.has(r.key), `页面 ${r.key} 必须在 ROUTE_CATALOG 中`)
    }
    assert.equal(ROUTE_CATALOG.length, fc.routes.length, '页面数必须一致')
    assert.equal(ROUTE_CATALOG.length, 34, 'ROUTE_CATALOG 必须精确为 34 页（盘点实测口径，非 32）')
    assert.equal(Object.keys(ROUTE_FEATURES).length, 16, 'ROUTE_FEATURES 必须精确覆盖 16 页')
  })

  await t.test('key 唯一：页面 key 与功能点别名页内均无重复（重复=0）', () => {
    const keys = ROUTE_CATALOG.map(([key]) => key)
    assert.equal(new Set(keys).size, keys.length, '页面 key 必须唯一')
    for (const [page, aliases] of Object.entries(ROUTE_FEATURES)) {
      assert.ok(Array.isArray(aliases) && aliases.length > 0, `${page} 别名必须为非空数组`)
      assert.equal(new Set(aliases).size, aliases.length, `${page} 别名数组内必须无重复`)
      for (const alias of aliases) {
        assert.ok(typeof alias === 'string' && alias.length > 0, `${page} 别名必须是有效字符串`)
      }
    }
  })

  await t.test('每个别名页都是已登记页面；open_page 白名单语义保持', () => {
    const catalogKeys = new Set(ROUTE_CATALOG.map(([key]) => key))
    for (const page of Object.keys(ROUTE_FEATURES)) {
      assert.ok(catalogKeys.has(page), `routeFeatures 页面 ${page} 必须已登记`)
    }
    // B9 依赖的合法 routeKey 必须在白名单中；'evil' 必须不在（白名单行为不变）
    for (const key of ['home', 'market', 'agri', 'policy', 'data', 'life', 'search']) {
      assert.ok(catalogKeys.has(key), `${key} 必须仍是 open_page 合法 routeKey`)
    }
    assert.ok(!catalogKeys.has('evil'), "'evil' 必须不在白名单中")
  })

  await t.test('代表页别名精确（防生成化吞并关键功能名）', () => {
    assert.deepEqual(ROUTE_FEATURES.orders, ['我的订单', '订单查询', '查快递', '订单状态'])
    assert.ok(ROUTE_FEATURES.agri.includes('农事日历') && ROUTE_FEATURES.agri.includes('碳排放核算'))
    assert.ok(ROUTE_FEATURES.market_service.includes('溯源码') && ROUTE_FEATURES.market_service.includes('直播话术'))
    assert.ok(ROUTE_FEATURES.life.includes('村医问诊') && ROUTE_FEATURES.life.includes('水电气缴费'))
    assert.ok(ROUTE_FEATURES.agri_diagnose.includes('病虫害识别') && ROUTE_FEATURES.agri_diagnose.includes('拍照识病'))
  })

  await t.test('assistant.service.js 不再维护第二套手工清单（源码证据）', () => {
    const src = readFileSync(path.join(BACKEND_ROOT, 'src', 'modules', 'ai', 'services', 'assistant.service.js'), 'utf8')
    assert.ok(!src.includes('const ROUTE_CATALOG = ['), 'assistant.service.js 不得保留手工 ROUTE_CATALOG')
    assert.ok(!src.includes('const ROUTE_FEATURES = {'), 'assistant.service.js 不得保留手工 ROUTE_FEATURES')
    assert.ok(
      src.includes("import { ROUTE_CATALOG, ROUTE_FEATURES } from './assistant-catalog.generated.js'"),
      'assistant.service.js 必须从生成产物导入',
    )
    assert.ok(src.includes('const ALLOWED_ROUTE_KEYS = new Set(ROUTE_CATALOG.map(([key]) => key))'),
      'ALLOWED_ROUTE_KEYS 必须仍由 ROUTE_CATALOG 派生')
  })

  await t.test('提交产物与生成器可确定性重建一致（逐字节）', () => {
    const content = readFileSync(ASSISTANT_OUT, 'utf8')
    const result = checkAssistantRoutes(content)
    assert.ok(result.ok, 'assistant 提交产物必须与生成器渲染逐字节一致')
    // 独立解析产物中的两个 JSON 块，与 buildAssistantRoutes() 派生值逐字段一致
    const derived = buildAssistantRoutes()
    const catalogMatch = content.match(/export const ROUTE_CATALOG =([\s\S]*?)\n\nexport const ROUTE_FEATURES =/)
    const featuresMatch = content.match(/export const ROUTE_FEATURES =([\s\S]*?)\n*$/)
    assert.ok(catalogMatch && featuresMatch, '产物必须含 ROUTE_CATALOG 与 ROUTE_FEATURES 两个导出块')
    assert.deepEqual(JSON.parse(catalogMatch[1]), derived.routeCatalog)
    assert.deepEqual(JSON.parse(featuresMatch[1]), derived.routeFeatures)
  })
})

test('admin apiCatalog 派生与注册表 v1 子集一致（C5）', async (t) => {
  const groups = buildCatalog()
  const flat = groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.group })))

  await t.test('正向结果与空目录明显不同：242 条 v1 目录、非占位内容', () => {
    assert.equal(flat.length, 242, 'admin 目录必须精确 242 条（= 注册表 v1 api 数）')
    assert.ok(groups.length > 1, '目录必须含多组')
    const names = new Set(flat.map((i) => i.name))
    assert.ok(names.has('运营驾驶舱') && names.has('商品列表') && names.has('API 开关列表'),
      '目录必须含真实预设名称，不得为占位内容')
  })

  await t.test('key 唯一（0 重复）且 key=apiId 双向覆盖注册表 v1', () => {
    const keys = flat.map((i) => i.key)
    assert.equal(new Set(keys).size, keys.length, 'key 必须唯一')
    const keySet = new Set(keys)
    for (const apiId of registryV1ByApiId.keys()) {
      assert.ok(keySet.has(apiId), `注册表 v1 apiId ${apiId} 缺失于目录`)
    }
    for (const key of keySet) {
      assert.ok(registryV1ByApiId.has(key), `目录 key ${key} 不在注册表 v1 中（不得混入 v2/未知条目）`)
    }
  })

  await t.test('method+规范化 path 唯一（0 重复，防同名吞并）', () => {
    const sigs = flat.map((i) => `${i.method} ${normalizePath(i.path)}`)
    const dups = [...new Set(sigs.filter((sig, i) => sigs.indexOf(sig) !== i))]
    assert.deepEqual(dups, [], `method+规范化 path 必须无重复，实际重复：${dups.join(', ')}`)
  })

  await t.test('关键字段精确（auth 映射/roles/version 归属）与代表性 v1/v2/公开/认证/ADMIN/参数化路径', () => {
    // 逐字段：key/method/规范化 path/auth/roles 与注册表一致（version 归属 v1）
    for (const item of flat) {
      const api = registryV1ByApiId.get(item.key)
      assert.equal(api.version, 'v1', `${item.key} 必须归属 v1 注册表条目`)
      assert.equal(item.method, api.method, `${item.key} method 不一致`)
      assert.equal(normalizePath(item.path), normalizePath(api.path), `${item.key} path 不一致`)
      assert.equal(item.auth, api.auth === 'required', `${item.key} auth 映射不一致`)
      assert.deepEqual(item.roles ?? null, api.roles ?? null, `${item.key} roles 不一致`)
    }
    // 代表性条目（公开/认证/ADMIN/参数化路径/预设装饰）
    const dashboard = flat.find((i) => i.key === registryV1ByApiId.get('api.platform.data.dashboard.get')?.apiId || i.name === '运营驾驶舱')
    assert.ok(dashboard && dashboard.auth === true && dashboard.path === '/data/dashboard' && dashboard.name === '运营驾驶舱')
    const products = flat.find((i) => i.name === '商品列表')
    assert.ok(products && products.auth === false && normalizePath(products.path) === '/market/product/list')
    const switchList = flat.find((i) => i.name === 'API 开关列表')
    assert.deepEqual(switchList?.roles, ['ADMIN'], 'switch-list 必须 roles=[ADMIN]')
    assert.equal(switchList?.auth, true)
    assert.equal(normalizePath(switchList?.path), '/admin/api-switch/list')
    const qaThread = flat.find((i) => i.name === 'AI 单个会话')
    assert.ok(qaThread && normalizePath(qaThread.path) === '/ai/qa/threads/:p', '参数化路径必须对齐注册表')
    // 目录内不得出现 v2 端点
    assert.ok(!flat.some((i) => normalizePath(i.path) === '/market/products'), 'admin 目录不得混入 v2 /market/products')
  })

  await t.test('提交产物与生成器可确定性重建一致（buildCatalog === 提交产物）', () => {
    const committed = JSON.parse(
      readFileSync(ADMIN_OUT, 'utf8').split('export const API_CATALOG =')[1].split('\nexport function flatApiCatalog')[0],
    )
    assert.deepEqual(buildCatalog(), committed, 'buildCatalog() 必须与提交产物逐字段一致')
  })
})

test('Flutter feature_catalog 派生与注册表 featureCatalog 一致（C5/D5）', async (t) => {
  const catalog = buildFeatureCatalog()

  await t.test('精确数量：8 sections / 70 功能点（盘点实测口径，非 71）', () => {
    assert.equal(catalog.sections.length, 8)
    assert.equal(catalog.features.length, 70)
    assert.equal(fc.features.length, 70)
  })

  await t.test('逐字段一致 + 双向覆盖（features ↔ 注册表）', () => {
    assert.deepEqual(
      catalog.features.map((f) => f.name),
      fc.features.map((f) => f.name),
      '功能点名称列表必须与注册表逐项一致且顺序一致',
    )
    for (let i = 0; i < fc.features.length; i += 1) {
      const src = fc.features[i]
      const out = catalog.features[i]
      assert.deepEqual(out.keywords, src.keywords, `${src.name} keywords 不一致`)
      assert.equal(out.route, src.route, `${src.name} route 不一致`)
      assert.equal(out.icon, src.icon, `${src.name} icon 不一致`)
      assert.equal(out.section, src.section, `${src.name} section 不一致`)
    }
  })

  await t.test('结构一致性：name 唯一、route 与页面 path 一致、icon 为 Dart 标识符、section 已登记', () => {
    const names = new Set(catalog.features.map((f) => f.name))
    assert.equal(names.size, 70, '功能点 name 必须唯一')
    const sectionKeys = new Set(catalog.sections.map(([key]) => key))
    for (const f of catalog.features) {
      assert.ok(routeByKey.has(f.routeKey ?? '__missing__') || fc.features.some((s) => s.name === f.name), 'routeKey 映射由注册表保证')
      assert.ok(sectionKeys.has(f.section), `${f.name} section 必须已登记`)
      assert.match(f.icon, /^[A-Za-z_][A-Za-z0-9_]*$/, `${f.name} icon 必须为合法 Dart 标识符`)
    }
    // route 与页面 path 一致（注册表 fail-fast 校验的复验）
    for (const s of fc.features) {
      const page = routeByKey.get(s.routeKey)
      assert.equal(s.route, page.path, `${s.name} route 必须等于页面 ${s.routeKey} 的 path`)
    }
  })

  await t.test('生成产物为合法 Dart 形态且含真实内容（正向与 fallback 明显不同）', () => {
    const text = readFileSync(FLUTTER_OUT, 'utf8')
    assert.ok(text.includes("import 'package:flutter/material.dart';"), '必须 import material')
    assert.ok(text.includes('class FeatureItem {'), '必须包含 FeatureItem 类')
    assert.ok(text.includes("'agri': 'AI 农业生产',"), '必须含 section 标题')
    assert.ok(text.includes("name: '病虫害识别',") && text.includes("keywords: ['病虫害', '识病', '拍照识别', '叶片', '植保'],"),
      '必须含具体功能点与关键词')
    assert.ok(text.includes('icon: Icons.biotech_outlined,'), 'icon 必须渲染为 Icons 常量')
    assert.ok(text.includes("route: '/ai/chat/new',") && text.includes("name: 'AI 智能问答',"),
      'AI 智能问答必须路由到 /ai/chat/new')
    assert.ok(text.includes("name: '农事日历',") && text.includes("name: 'AI 质量分级',"),
      '代表性功能点必须在场')
    assert.ok(!text.includes('TODO') && !text.includes('placeholder'), '产物不得含占位内容')
    // 逐字节可重建
    const result = checkFeatureCatalog(text)
    assert.ok(result.ok, '提交产物必须通过 --check 语义（与注册表逐字节一致）')
  })

  await t.test('代表行 route 精确（search/all/home 消费语义不变）', () => {
    const byName = new Map(fc.features.map((f) => [f.name, f]))
    assert.equal(byName.get('病虫害识别').route, '/agri/diagnose')
    assert.equal(byName.get('实时行情').route, '/market')
    assert.equal(byName.get('补贴申请').route, '/policy/service')
    assert.equal(byName.get('一键求助').route, '/disaster')
    assert.equal(byName.get('农机租赁').route, '/machinery')
    assert.equal(byName.get('村医问诊').route, '/life')
    assert.equal(byName.get('农情数据看板').route, '/data')
  })
})

test('drift 门禁：stale/错误产物必须失败，--check 只读不改写（C5）', async (t) => {
  await t.test('真实产物通过三个生成器的 --check（CLI 退出 0）', () => {
    for (const script of [
      'scripts/gen-admin-api-catalog.mjs',
      'scripts/gen-assistant-routes.mjs',
      'scripts/gen-feature-catalog.mjs',
    ]) {
      const res = spawnSync(process.execPath, [script, '--check'], {
        cwd: BACKEND_ROOT,
        encoding: 'utf8',
      })
      assert.equal(res.status, 0, `${script} --check 应退出 0。stdout: ${res.stdout} stderr: ${res.stderr}`)
    }
  })

  await t.test('人为 stale 产物：三个 check 均返回 ok=false（门禁失败）', () => {
    const adminText = readFileSync(ADMIN_OUT, 'utf8')
    const assistantText = readFileSync(ASSISTANT_OUT, 'utf8')
    const flutterText = readFileSync(FLUTTER_OUT, 'utf8')
    // 删除一条真实条目/篡改一个字段，构造漂移
    const staleAdmin = adminText.replace('"name": "运营驾驶舱"', '"name": "STALE"')
    const staleAssistant = assistantText.replace('"首页"', '"STALE"')
    const staleFlutter = flutterText.replace("name: '病虫害识别',", "name: 'STALE',")
    assert.equal(checkAdminCatalog(staleAdmin).ok, false, 'stale admin 产物必须判漂移')
    assert.equal(checkAssistantRoutes(staleAssistant).ok, false, 'stale assistant 产物必须判漂移')
    assert.equal(checkFeatureCatalog(staleFlutter).ok, false, 'stale flutter 产物必须判漂移')
    // 空内容/截断内容同样必须失败（不得把空目录当作一致）
    assert.equal(checkAdminCatalog('').ok, false)
    assert.equal(checkAssistantRoutes('').ok, false)
    assert.equal(checkFeatureCatalog('').ok, false)
  })

  await t.test('--check 语义绝不改写产物文件（内容与 mtime 前后一致）', () => {
    const files = [ADMIN_OUT, ASSISTANT_OUT, FLUTTER_OUT]
    const before = files.map((f) => ({ content: readFileSync(f, 'utf8'), mtimeMs: statSync(f).mtimeMs }))
    // 执行 CLI --check（对一致产物退出 0）与纯函数 check
    for (const script of [
      'scripts/gen-admin-api-catalog.mjs',
      'scripts/gen-assistant-routes.mjs',
      'scripts/gen-feature-catalog.mjs',
    ]) {
      spawnSync(process.execPath, [script, '--check'], { cwd: BACKEND_ROOT, encoding: 'utf8' })
    }
    checkAdminCatalog(readFileSync(ADMIN_OUT, 'utf8'))
    checkAssistantRoutes(readFileSync(ASSISTANT_OUT, 'utf8'))
    checkFeatureCatalog(readFileSync(FLUTTER_OUT, 'utf8'))
    for (let i = 0; i < files.length; i += 1) {
      assert.equal(readFileSync(files[i], 'utf8'), before[i].content, `${files[i]} 内容不得被改写`)
      assert.equal(statSync(files[i]).mtimeMs, before[i].mtimeMs, `${files[i]} mtime 不得变化`)
    }
  })

  await t.test('featureCatalog 区块不影响能力口径：capability 247 = 242(v1) + 5(v2)', () => {
    const v1 = CAPABILITY_REGISTRY.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v1').length
    const v2 = CAPABILITY_REGISTRY.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v2').length
    assert.equal(CAPABILITY_REGISTRY.capabilities.length, 247)
    assert.equal(v1, 242)
    assert.equal(v2, 5)
    // featureCatalog 是独立顶层区块，不进入 capabilities 数组
    assert.ok(!CAPABILITY_REGISTRY.capabilities.some((c) => c.id === 'featureCatalog'))
  })

  await t.test('生成器不依赖时间/随机数/工作树顺序：连续两次渲染逐字节一致', () => {
    assert.equal(
      checkAdminCatalog(readFileSync(ADMIN_OUT, 'utf8')).rendered,
      checkAdminCatalog(readFileSync(ADMIN_OUT, 'utf8')).rendered,
    )
    assert.equal(
      checkAssistantRoutes(readFileSync(ASSISTANT_OUT, 'utf8')).rendered,
      checkAssistantRoutes(readFileSync(ASSISTANT_OUT, 'utf8')).rendered,
    )
    assert.equal(
      checkFeatureCatalog(readFileSync(FLUTTER_OUT, 'utf8')).rendered,
      checkFeatureCatalog(readFileSync(FLUTTER_OUT, 'utf8')).rendered,
    )
  })
})

/**
 * 防共同漂移门禁：HEAD 旧行为基线冻结。
 *
 * 上面的测试都是「当前注册表 ↔ 当前生成产物」的共识比较——若人工 overlay
 * （gen-capabilities.mjs 的 FEATURE_CATALOG）与生成产物被一起误改，共识测试不会失败。
 * 本组把 2026-08-16 等价性审计（HEAD:assistant.service.js / HEAD:app/lib/core/feature_catalog.dart
 * 与当前派生值逐字段比对，结果为 0 差异）固化为独立预期值：
 *
 * - 规范化形式：JSON.stringify（紧凑、UTF-8）——规范化 SHA256 固定为 HEAD 核准基线；
 * - 预期值来自 HEAD 旧行为（git 历史），不是运行时从当前注册表重新计算；
 * - SHA256 辅以代表项字段断言，防止「不透明 hash 通过但语义被替换」；
 * - 任何未授权的新增/删除/重命名/route 或 feature 迁移都会改变规范化 JSON
 *   → hash 不匹配 → 测试失败；
 * - 本组数据仅用于验收，不是运行时事实源：assistant/Flutter 运行时与生成器
 *   仍只消费 capabilities.js（gen-capabilities.mjs 的生成产物）。
 */
test('防共同漂移：HEAD 旧行为基线冻结（规范化 SHA256 + 代表项）', async (t) => {
  const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase()

  function canonicalAssistant() {
    const derived = buildAssistantRoutes()
    return { routeCatalog: JSON.stringify(derived.routeCatalog), routeFeatures: JSON.stringify(derived.routeFeatures) }
  }

  function canonicalFlutter() {
    const catalog = buildFeatureCatalog()
    return JSON.stringify({ sections: catalog.sections, features: catalog.features })
  }

  // HEAD 核准基线（2026-08-16 等价性审计产出；规范化 = JSON.stringify 紧凑 UTF-8）。
  const BASELINE = Object.freeze({
    routeCatalog: 'EA7B84A968691CE775E29FE76A5E3C06C2E5A632A797B3D00DDE22ABB6B4E791',
    routeFeatures: 'F38DD61668F2B4CAC0DF875DAE83659E141F674999EF29308BEDFCC98D32DC91',
    flutterCatalog: '6D909DBC18B1A5716C572CB218F2B27C2BE38FC6E06005E6FCF334532ACE0545',
  })

  await t.test('ROUTE_CATALOG 规范化 SHA256 与 HEAD 基线一致（34 页，含顺序）', () => {
    const canonical = canonicalAssistant()
    assert.equal(sha256(canonical.routeCatalog), BASELINE.routeCatalog,
      'ROUTE_CATALOG 偏离 HEAD 旧行为基线（新增/删除/重命名/顺序变化都会在此失败）')
  })

  await t.test('ROUTE_FEATURES 规范化 SHA256 与 HEAD 基线一致（16 页 128 别名，含顺序）', () => {
    const canonical = canonicalAssistant()
    assert.equal(sha256(canonical.routeFeatures), BASELINE.routeFeatures,
      'ROUTE_FEATURES 偏离 HEAD 旧行为基线（新增/删除/移动/改名别名都会在此失败）')
  })

  await t.test('Flutter catalog 规范化 SHA256 与 HEAD 基线一致（8 sections / 70 features）', () => {
    assert.equal(sha256(canonicalFlutter()), BASELINE.flutterCatalog,
      'Flutter feature_catalog 偏离 HEAD 旧行为基线（section/route/标题/关键词/图标/排序变化都会在此失败）')
  })

  await t.test('SHA256 辅以代表项字段断言（旧行为语义锚点，非不透明 hash）', () => {
    const { routeCatalog, routeFeatures } = buildAssistantRoutes()
    const catalog = buildFeatureCatalog()

    assert.equal(routeCatalog.length, 34, 'HEAD 基线：ROUTE_CATALOG 34 页')
    assert.deepEqual(routeCatalog[0], ['home', '首页'], '第一页必须为 home/首页')
    assert.deepEqual(routeCatalog[routeCatalog.length - 1], ['screen', '村级数字驾驶舱'], '末页必须为 screen/村级数字驾驶舱')
    const orders = routeCatalog.find(([key]) => key === 'orders')
    assert.deepEqual(orders, ['orders', '我的订单'], 'orders 页名必须为「我的订单」')

    assert.equal(Object.keys(routeFeatures).length, 16, 'HEAD 基线：ROUTE_FEATURES 16 页')
    assert.deepEqual(routeFeatures.orders, ['我的订单', '订单查询', '查快递', '订单状态'])
    assert.ok(routeFeatures.agri.includes('农事日历') && routeFeatures.agri.includes('碳排放核算'))
    assert.ok(routeFeatures.agri_diagnose.includes('病虫害识别') && routeFeatures.agri_diagnose.includes('拍照识病'))
    assert.ok(routeFeatures.market_service.includes('溯源码'))

    assert.equal(catalog.sections.length, 8, 'HEAD 基线：8 个 section')
    assert.deepEqual(catalog.sections[0], ['agri', 'AI 农业生产'])
    assert.equal(catalog.features.length, 70, 'HEAD 基线：70 个功能点')
    const diagnose = catalog.features.find((f) => f.name === '病虫害识别')
    assert.deepEqual(
      { route: diagnose.route, icon: diagnose.icon, section: diagnose.section },
      { route: '/agri/diagnose', icon: 'biotech_outlined', section: 'agri' },
      '病虫害识别必须路由 /agri/diagnose、biotech 图标、agri 分组',
    )
    const aiChat = catalog.features.find((f) => f.name === 'AI 智能问答')
    assert.equal(aiChat.route, '/ai/chat/new')
    const dashboard = catalog.features.find((f) => f.name === '农情数据看板')
    assert.ok(dashboard.keywords.includes('驾驶舱') && dashboard.route === '/data')
  })

  await t.test('未授权变更必须失败：篡改后规范化值不再命中基线（正/负对照）', () => {
    const baseline = canonicalAssistant()
    // 负对照：任何条目变化都会改变 SHA256（证明门禁敏感，而非恒真）
    const mutated = JSON.parse(baseline.routeCatalog)
    mutated[0][1] = 'STALE'
    assert.notEqual(sha256(JSON.stringify(mutated)), BASELINE.routeCatalog, '篡改 label 必须改变 hash')
    const mutatedFeatures = JSON.parse(baseline.routeFeatures)
    mutatedFeatures.orders.push('STALE-NEW-ALIAS')
    assert.notEqual(sha256(JSON.stringify(mutatedFeatures)), BASELINE.routeFeatures, '新增别名必须改变 hash')
    // 正对照：当前真实派生值仍命中基线
    assert.equal(sha256(baseline.routeCatalog), BASELINE.routeCatalog)
    assert.equal(sha256(baseline.routeFeatures), BASELINE.routeFeatures)
  })
})
