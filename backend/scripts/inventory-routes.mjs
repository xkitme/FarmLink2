/**
 * 116f-B v1 路由盘点脚本（可离线、可重复执行、输出确定）。
 *
 * 产出六项契约门禁数据（docs/116f-APIv2与能力注册表.md §6.3）：
 *   1. 实际路由总数          totalRoutes
 *   2. 已登记数量            registeredCount
 *   3. 未登记 method+path    unregistered（含 file/line 定位）
 *   4. 重复 method+path      duplicates（含全部发生位置）
 *   5. 无显式鉴权中间件路由   noExplicitAuthMiddleware（公开/可选认证端点，人工确认行为）
 *   6. 非法/无法解析定义      invalid（file/line 定位）
 * 另有注册表侧指标 registryMissingAuthMeta（注册表缺 auth 元数据，恒为 0）。
 * 盘点结果不依赖文件扫描顺序：文件列表与输出全部固定排序。
 *
 * 数量口径（116f-C 基线，2026-08-15）：v1 实际 242、v1 登记 242/242；
 * v2 实际 5、v2 登记 5/5；注册表 capability 总数 247。
 *
 * 用法（cwd = backend/）：
 *   node scripts/inventory-routes.mjs            输出 JSON 报告到 stdout
 *   node scripts/inventory-routes.mjs --write    写入 src/contracts/inventory-report.json
 *   node scripts/inventory-routes.mjs --check    与已提交报告比对（漂移门禁）
 */

import fs from 'node:fs'
import path from 'node:path'
import { scanRouteFiles, buildInventoryReport, BACKEND_ROOT } from '../src/contracts/route-scanner.js'
import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'

const REPORT_FILE = path.join(BACKEND_ROOT, 'src', 'contracts', 'inventory-report.json')

function buildReport() {
  const scan = scanRouteFiles()
  const registryV1Index = new Map()
  for (const cap of CAPABILITY_REGISTRY.capabilities) {
    for (const api of cap.apis) {
      if (api.version === 'v1') registryV1Index.set(`${api.method} ${api.path}`, api)
    }
  }
  return buildInventoryReport(scan, registryV1Index)
}

function summarize(report) {
  return [
    `实际路由总数=${report.totalRoutes}`,
    `已登记=${report.registeredCount}`,
    `未登记=${report.unregistered.length}`,
    `重复 method+path=${report.duplicates.length}`,
    `无显式鉴权中间件(公开端点)=${report.noExplicitAuthMiddleware.length}`,
    `注册表缺 auth 元数据=${report.registryMissingAuthMeta.length}`,
    `非法定义=${report.invalid.length}`,
  ].join('；')
}

function render(report) {
  return `${JSON.stringify(report, null, 2)}\n`
}

const mode = process.argv[2]

if (mode === '--write') {
  const report = buildReport()
  fs.writeFileSync(REPORT_FILE, render(report), 'utf8')
  console.log(`✓ 盘点完成（${summarize(report)}）→ ${path.relative(BACKEND_ROOT, REPORT_FILE)}`)
  if (report.unregistered.length > 0 || report.duplicates.length > 0 || report.invalid.length > 0) {
    console.error('✗ 盘点存在未登记/重复/非法定义，报告已写入但以失败退出。')
    process.exit(1)
  }
} else if (mode === '--check') {
  const report = buildReport()
  const current = fs.readFileSync(REPORT_FILE, 'utf8')
  if (current !== render(report)) {
    console.error(`✗ ${path.relative(BACKEND_ROOT, REPORT_FILE)} 与源码盘点结果漂移。请运行：node scripts/inventory-routes.mjs --write`)
    process.exit(1)
  }
  console.log(`✓ ${path.relative(BACKEND_ROOT, REPORT_FILE)} 与源码一致（${summarize(report)}）`)
} else {
  process.stdout.write(render(buildReport()))
}
