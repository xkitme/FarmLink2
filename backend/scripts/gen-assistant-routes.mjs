/**
 * 116f-F 助手路由目录生成器（静态、可重复执行、输出确定）。
 *
 * 数据源：backend/src/contracts/capabilities.js 的 featureCatalog 区块（gen-capabilities.mjs
 * 的生成产物）。人工可编辑事实源 = gen-capabilities.mjs 的 FEATURE_CATALOG overlay
 * （sections/routes/routeFeatures/features），改后必须 `--write` 重建 capabilities.js。
 * 本脚本不新增第二份页面/别名清单：
 * - ROUTE_CATALOG 由 featureCatalog.routes 生成（key+label，顺序与注册表一致）；
 * - ROUTE_FEATURES 由 featureCatalog.routeFeatures 生成（页面 → 功能点别名）。
 *
 * 输出：backend/src/modules/ai/services/assistant-catalog.generated.js（提交进版本库的生成产物）。
 * assistant.service.js 从该产物导入，open_page 白名单（ALLOWED_ROUTE_KEYS）与
 * sanitizeAssistantOutput 纯函数语义不变。
 *
 * 用法（cwd = backend/）：
 *   node scripts/gen-assistant-routes.mjs --write   重新生成
 *   node scripts/gen-assistant-routes.mjs --check   校验生成产物与注册表一致（漂移门禁）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_FILE = path.join(BACKEND_ROOT, 'src', 'modules', 'ai', 'services', 'assistant-catalog.generated.js')

/** 从注册表 featureCatalog 派生助手路由目录（纯函数、确定性）。 */
export function buildAssistantRoutes(registry = CAPABILITY_REGISTRY) {
  const fc = registry.featureCatalog
  if (!fc || !Array.isArray(fc.routes) || typeof fc.routeFeatures !== 'object') {
    throw new Error('注册表缺少 featureCatalog 区块（routes/routeFeatures），无法生成助手路由目录')
  }
  const routeCatalog = fc.routes.map((r) => [r.key, r.label])
  const routeFeatures = {}
  for (const [key, aliases] of Object.entries(fc.routeFeatures)) {
    routeFeatures[key] = [...aliases]
  }
  return { routeCatalog, routeFeatures }
}

function render(derived) {
  return [
    '// 本文件由 scripts/gen-assistant-routes.mjs 自动生成，请勿手工编辑。',
    '// 重新生成：cd backend && node scripts/gen-assistant-routes.mjs --write',
    '// 漂移检查：cd backend && node scripts/gen-assistant-routes.mjs --check',
    '//',
    '// 116f-F 助手路由目录（数据源 = backend/src/contracts/capabilities.js featureCatalog，gen-capabilities.mjs 生成产物；',
    '// - ROUTE_CATALOG：页面清单（routeKey → 助手页名），open_page 白名单（ALLOWED_ROUTE_KEYS）来源；',
    '// - ROUTE_FEATURES：页面承载的功能点别名（喂给语音模型做功能名 → 页面映射）。',
    'export const ROUTE_CATALOG =',
    `${JSON.stringify(derived.routeCatalog, null, 2)}`,
    '',
    'export const ROUTE_FEATURES =',
    `${JSON.stringify(derived.routeFeatures, null, 2)}`,
    '',
  ].join('\n')
}

/** 漂移检查（只读）：返回 { ok, current, rendered }，绝不改写文件。 */
export function checkAssistantRoutes(fileContent, registry = CAPABILITY_REGISTRY) {
  const rendered = render(buildAssistantRoutes(registry))
  return { ok: fileContent === rendered, rendered }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
const mode = process.argv[2]

if (isMain && mode === '--write') {
  const derived = buildAssistantRoutes()
  fs.writeFileSync(OUT_FILE, render(derived), 'utf8')
  console.log(
    `✓ 已生成 ${path.relative(BACKEND_ROOT, OUT_FILE)}：` +
    `${derived.routeCatalog.length} 页 / ${Object.keys(derived.routeFeatures).length} 页功能点别名`,
  )
} else if (isMain && mode === '--check') {
  const derived = buildAssistantRoutes()
  const rendered = render(derived)
  const current = fs.readFileSync(OUT_FILE, 'utf8')
  if (current !== rendered) {
    console.error(`✗ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与注册表漂移。请运行：node scripts/gen-assistant-routes.mjs --write`)
    process.exit(1)
  }
  console.log(
    `✓ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与注册表一致` +
    `（${derived.routeCatalog.length} 页 / ${Object.keys(derived.routeFeatures).length} 页功能点别名）`,
  )
} else if (isMain) {
  console.error('用法：node scripts/gen-assistant-routes.mjs --write | --check')
  process.exit(2)
}
