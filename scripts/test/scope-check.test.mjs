/**
 * scope-check.test.mjs — scope checker 强测试（node:test，零依赖）
 *
 * 覆盖矩阵（每个用例都断言输出文本/文件状态，绝不只断言 exit code）：
 *  A. 四条 lane legacy 模式：合法通过 / 越界精确列出 / 生成产物拒绝 /
 *     中文+空格路径 / 删除与重命名（R 新旧路径双查）/ 正负对照 / 唯一工作单例外 /
 *     未知 lane / 缺 base / 分叉 / 脏工作树 / 前后内容与 mtime 不变 / 空 diff / --json
 *  B. branchMap（真实分支映射）：collab/116g-backend-data→backend/116g-A、
 *     collab/116h-flutter-shell→flutter/116h-A、collab/116g-admin-safety→admin/116g-B、
 *     collab/integration-gates→integration/116g-X、collab/116m-release-docs→integration/116m-release；
 *     未知分支 / 模糊分支 → 退出码 2；
 *     --branch 与 --lane/--workorder 冲突 → 退出码 2
 *  C. workorder 精确白名单：116g-X（本批）、116g-B（真实 18 文件全覆盖）、116h-A、
 *     116g-A（阶段 0 已回填：8 个精确 controller/policy 放行、其余 backend/src 拒绝、pending=0）；
 *     116h-A 白名单补齐 elder_mode/splash 真实路径（collab/116h-flutter-* 修改放行，
 *     backend/admin/scripts/.github/feature_catalog 等仍拒绝）；
 *     M5/M6、Prisma、数据库、生成产物不得被任何当前 workorder 放行
 *  D. workorder 模式下的 A/M/D/R 与中文/空格路径
 *
 * 运行：node --test scripts/test/scope-check.test.mjs
 */

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(__dirname, '..', 'collaboration', 'scope-check.mjs')
const REAL_LANES = path.resolve(__dirname, '..', 'collaboration', 'lanes.json')

const tempRoots = []

function git(repo, args, opts = {}) {
  const res = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', ...opts })
  return res
}

function mustGit(repo, args) {
  const res = git(repo, args)
  assert.equal(res.status, 0, `git ${args.join(' ')} 失败: ${res.stderr}`)
  return res.stdout.trim()
}

function writeFile(repo, relPath, content) {
  const abs = path.join(repo, ...relPath.split('/'))
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf8')
}

function commitAll(repo, msg) {
  mustGit(repo, ['add', '-A'])
  mustGit(repo, ['commit', '-m', msg])
}

/** 建立带代表性文件的干净仓库，返回 { repo, base } */
function initRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-check-'))
  tempRoots.push(repo)
  mustGit(repo, ['init', '-b', 'main'])
  mustGit(repo, ['config', 'user.email', 'scope-test@farmlink.local'])
  mustGit(repo, ['config', 'user.name', 'Scope Test'])
  writeFile(repo, 'backend/src/app.js', 'module.exports = 1\n')
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// generated\n')
  writeFile(repo, 'backend/test/auth.test.js', 'test()\n')
  writeFile(repo, 'backend/prisma/schema.prisma', 'datasource db {}\n')
  writeFile(repo, 'app/lib/main.dart', 'void main() {}\n')
  writeFile(repo, 'app/lib/core/elder_mode.dart', '// elder base\n')
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// generated\n')
  writeFile(repo, 'app/lib/pages/splash/splash_page.dart', '// splash base\n')
  writeFile(repo, 'app/test/home_test.dart', 'test()\n')
  writeFile(repo, 'backend/admin/src/App.jsx', 'export default 1\n')
  writeFile(repo, 'backend/admin/src/api/auth.js', 'export const auth = 1\n')
  writeFile(repo, 'backend/admin/src/api/apiCatalog.js', '// generated\n')
  writeFile(repo, 'backend/admin/src/apiCatalog.js', '// generated\n')
  writeFile(repo, 'backend/admin/test/auth-contract.test.js', 'test()\n')
  writeFile(repo, 'docs/协作约定.md', '# 协作约定\n')
  writeFile(repo, '中文 路径/文件 名.md', 'base 中文文件\n')
  commitAll(repo, 'base')
  const base = mustGit(repo, ['rev-parse', 'HEAD'])
  return { repo, base }
}

function runChecker(repo, args) {
  return spawnSync(process.execPath, [CHECKER, '--repo', repo, ...args], { encoding: 'utf8' })
}

function snapshotTree(repo) {
  const snap = {}
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.git') continue
        walk(abs)
      } else {
        const st = fs.statSync(abs)
        snap[path.relative(repo, abs).replace(/\\/g, '/')] = {
          content: fs.readFileSync(abs, 'utf8'),
          mtimeMs: st.mtimeMs,
        }
      }
    }
  }
  walk(repo)
  return snap
}

function readRealLanes() {
  return JSON.parse(fs.readFileSync(REAL_LANES, 'utf8'))
}

/** 116g-A 阶段 0 已回填的 8 个精确 backend/src 路径（与 lanes.json workorders["116g-A"].allow 一致） */
const BACKEND_116G_A_PATHS = [
  'backend/src/modules/market/order.policy.js',
  'backend/src/modules/market/order.controller.js',
  'backend/src/modules/data/sync.policy.js',
  'backend/src/modules/data/sync.controller.js',
  'backend/src/modules/machinery/booking.policy.js',
  'backend/src/modules/machinery/booking.controller.js',
  'backend/src/modules/platform/resource.policy.js',
  'backend/src/modules/platform/resource.controller.js',
]

/** 复制正式配置并返回临时文件路径（可继续修改后写盘） */
function copyConfig(mutator) {
  const cfg = readRealLanes()
  if (mutator) mutator(cfg)
  const cfgPath = path.join(os.tmpdir(), `lanes-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8')
  tempRoots.push(cfgPath)
  return cfgPath
}

after(() => {
  for (const root of tempRoots) {
    try { fs.rmSync(root, { recursive: true, force: true }) } catch { /* ignore */ }
  }
})

/* ═══════════════════════════════════════════════════════════
 * A. legacy 模式（--lane）基础覆盖
 * ═══════════════════════════════════════════════════════════ */

test('A1 backend lane: backend/test 新增文件通过（内容断言 OK 输出）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/test/新测试.test.js', 'test()\n')
  commitAll(repo, 'add backend test')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK: 全部变更均属于允许范围/)
  assert.match(res.stdout, /files=1/)
  assert.doesNotMatch(res.stdout, /VIOLATION/)
  // checker 不改工作树
  assert.equal(mustGit(repo, ['status', '--porcelain']), '')
})

test('A2 flutter lane: app/test 新增文件通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'app/test/widget_新增_test.dart', 'test()\n')
  commitAll(repo, 'add flutter test')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

test('A3 admin lane: backend/admin/src 修改通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/admin/src/App.jsx', 'export default 2\n')
  commitAll(repo, 'modify admin App')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'admin', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

test('A4 integration lane: docs/scripts/.github 新增通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/116g-新增.md', 'x\n')
  writeFile(repo, 'scripts/collaboration/新增脚本.mjs', 'x\n')
  writeFile(repo, '.github/pull_request_template.md', 'x\n')
  commitAll(repo, 'integration files')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /files=3/)
})

test('A5 backend lane 越界改 docs：非零退出且精确列出文件', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/协作约定.md', '# 被越界修改\n')
  commitAll(repo, 'backend 越界改 docs')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /VIOLATION/)
  assert.match(res.stdout, /docs\/协作约定\.md/)
  assert.match(res.stdout, /不属于 lane 'backend' 的允许路径/)
})

test('A6 flutter lane 越界改 backend/src：非零退出且列出精确文件', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 999\n')
  commitAll(repo, 'flutter 越界改 backend')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /VIOLATION/)
  assert.match(res.stdout, /backend\/src\/app\.js/)
})

test('A7 flutter lane 手改 feature_catalog.dart：生成产物失败', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// hand edit\n')
  commitAll(repo, '手改生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /app\/lib\/core\/feature_catalog\.dart/)
  assert.match(res.stdout, /生成产物/)
})

test('A8 backend lane 手改 capabilities.js：生成产物失败', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// hand edit\n')
  commitAll(repo, '手改注册表生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/src\/contracts\/capabilities\.js/)
  assert.match(res.stdout, /生成产物/)
})

test('A9 integration lane 可改生成产物（--write 重建路径放行）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// regenerated by integration\n')
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// regenerated\n')
  commitAll(repo, 'integration 重建生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

test('A10 中文+空格路径新增（integration 合法）通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/中文 文档/新 文件.md', 'new\n')
  commitAll(repo, '新增中文空格路径')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /files=1/)
})

test('A11 中文+空格路径越界（backend lane 改 中文 路径/文件 名.md）非零且路径无损列出', () => {
  const { repo, base } = initRepo()
  writeFile(repo, '中文 路径/文件 名.md', '被越界修改\n')
  commitAll(repo, '越界修改中文文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /中文 路径\/文件 名\.md/)
  assert.doesNotMatch(res.stdout, /\\u/)
})

test('A12 删除：flutter lane 删除 app/lib/main.dart 通过', () => {
  const { repo, base } = initRepo()
  fs.unlinkSync(path.join(repo, 'app', 'lib', 'main.dart'))
  commitAll(repo, 'flutter 删除自己的文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

test('A13 删除：flutter lane 删除 backend/src/app.js 越界且精确列出', () => {
  const { repo, base } = initRepo()
  fs.unlinkSync(path.join(repo, 'backend', 'src', 'app.js'))
  commitAll(repo, 'flutter 越界删除 backend 文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /\[D\] backend\/src\/app\.js/)
})

test('A14 重命名：backend lane 在 src 内重命名通过（R 新旧路径均合法）', () => {
  const { repo, base } = initRepo()
  fs.renameSync(path.join(repo, 'backend', 'src', 'app.js'), path.join(repo, 'backend', 'src', 'app2.js'))
  commitAll(repo, 'backend 内部重命名')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /"R"/)
})

test('A15 重命名：flutter lane 把 app 文件重命名进 backend 越界，新路径列出', () => {
  const { repo, base } = initRepo()
  fs.renameSync(
    path.join(repo, 'app', 'lib', 'main.dart'),
    path.join(repo, 'backend', 'src', 'main.dart')
  )
  commitAll(repo, 'flutter 越界重命名到 backend')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  // 旧路径 app/lib/main.dart 属于 flutter allow → 放行；新路径越界必须列出
  assert.match(res.stdout, /\[R\] backend\/src\/main\.dart/)
  assert.doesNotMatch(res.stdout, /\[R\] app\/lib\/main\.dart/)
  assert.match(res.stdout, /不属于 lane 'flutter' 的允许路径/)
})

test('A16 正负对照：同一仓库合法提交通过、越界提交失败，输出文本不同', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/test/positive.test.js', 'test()\n')
  commitAll(repo, 'positive')
  const headPos = mustGit(repo, ['rev-parse', 'HEAD'])
  const resPos = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', headPos])
  assert.equal(resPos.status, 0)
  assert.match(resPos.stdout, /OK/)
  writeFile(repo, 'docs/协作约定.md', '# 越界\n')
  commitAll(repo, 'negative')
  const headNeg = mustGit(repo, ['rev-parse', 'HEAD'])
  const resNeg = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', headNeg])
  assert.equal(resNeg.status, 1)
  assert.match(resNeg.stdout, /VIOLATION/)
  assert.notEqual(resPos.stdout, resNeg.stdout)
})

test('A17 未知 lane：退出码 2 且列出合法 lane', () => {
  const { repo, base } = initRepo()
  const res = runChecker(repo, ['--lane', 'unknown-lane', '--base', base])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /未知 lane 'unknown-lane'/)
  assert.match(res.stderr, /backend, flutter, admin, integration/)
})

test('A18 缺 --base：退出码 2 且明确报错', () => {
  const { repo } = initRepo()
  const res = runChecker(repo, ['--lane', 'integration'])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /缺少 --base/)
})

test('A19 分叉（base 不是 head 祖先）：非零退出且明确报分叉', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/主线.md', 'main\n')
  commitAll(repo, 'main D')
  const mainHead = mustGit(repo, ['rev-parse', 'HEAD'])
  mustGit(repo, ['checkout', '-b', 'side', base])
  writeFile(repo, 'docs/侧线.md', 'side\n')
  commitAll(repo, 'side C')
  const sideHead = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'integration', '--base', mainHead, '--head', sideHead])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /不是 head/)
  assert.match(res.stdout, /分叉/)
})

test('A20 脏工作树：未提交修改 → 非零退出并列出脏条目', () => {
  const { repo, base } = initRepo()
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  writeFile(repo, 'docs/未提交.md', 'dirty\n')
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /工作树不干净/)
  assert.match(res.stdout, /docs\/未提交\.md/)
})

test('A21 checker 运行前后：仓库文件内容与 mtime 完全不变，无新增文件', () => {
  const { repo, base } = initRepo()
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const before = snapshotTree(repo)
  const beforeList = Object.keys(before).sort()

  const resOk = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(resOk.status, 0)
  writeFile(repo, 'docs/越界样例.md', 'x\n')
  commitAll(repo, '越界样例')
  const head2 = mustGit(repo, ['rev-parse', 'HEAD'])
  const resBad = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head2])
  assert.equal(resBad.status, 1)

  const after = snapshotTree(repo)
  const afterList = Object.keys(after).sort()
  assert.deepEqual(
    afterList.filter((f) => !f.includes('.git')),
    [...beforeList, 'docs/越界样例.md'].sort()
  )
  for (const [rel, snap] of Object.entries(before)) {
    assert.ok(after[rel], `checker 运行后文件消失: ${rel}`)
    assert.equal(after[rel].content, snap.content, `内容变化: ${rel}`)
    assert.equal(after[rel].mtimeMs, snap.mtimeMs, `mtime 变化: ${rel}`)
  }
})

test('A22 base == head（空 diff）：通过且 files=0', () => {
  const { repo, base } = initRepo()
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', base])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /files=0/)
  assert.match(res.stdout, /OK/)
})

test('A23 --json 输出可解析且字段完整（ok/violations/counts）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 42\n')
  commitAll(repo, 'json 样例')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head, '--json'])
  assert.equal(res.status, 1)
  const payload = JSON.parse(res.stdout)
  assert.equal(payload.ok, false)
  assert.equal(payload.lane, 'flutter')
  assert.equal(payload.mode, 'legacy')
  assert.equal(payload.files, 1)
  assert.equal(payload.violations.length, 1)
  assert.equal(payload.violations[0].path, 'backend/src/app.js')
  assert.equal(payload.counts.M, 1)
})

test('A24 唯一工作单例外路径（legacy）：prisma 例外当前未授权，拒绝', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/prisma/migrations/20260801_init/migration.sql', 'CREATE TABLE t(id INTEGER);\n')
  commitAll(repo, '加 migration')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/prisma\/migrations\//)
  assert.match(res.stdout, /当前未授权任何工作单/)
})

test('A25 workorder 模式：临时 workorder 白名单可授权 prisma（正确编号通过，缺省拒绝）', () => {
  const { repo, base } = initRepo()
  const cfgPath = copyConfig((cfg) => {
    cfg.workorders['WO-001'] = { lane: 'backend', allow: ['backend/prisma/schema.prisma'], pending: [] }
  })
  writeFile(repo, 'backend/prisma/schema.prisma', 'datasource db {}\n-- changed\n')
  commitAll(repo, '改 prisma schema')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])

  const resLegacy = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head, '--config', cfgPath])
  assert.equal(resLegacy.status, 1)
  assert.match(resLegacy.stdout, /backend\/prisma\/schema\.prisma/)
  assert.match(resLegacy.stdout, /唯一工作单例外路径/)

  const resUnknown = runChecker(repo, ['--lane', 'backend', '--workorder', 'WO-999', '--base', base, '--head', head, '--config', cfgPath])
  assert.equal(resUnknown.status, 2)
  assert.match(resUnknown.stderr, /未知 workorder 'WO-999'/)

  const resRight = runChecker(repo, ['--lane', 'backend', '--workorder', 'WO-001', '--base', base, '--head', head, '--config', cfgPath])
  assert.equal(resRight.status, 0)
  assert.match(resRight.stdout, /OK/)
  assert.match(resRight.stdout, /workorder=WO-001/)
})

/* ═══════════════════════════════════════════════════════════
 * B. branchMap 真实分支映射
 * ═══════════════════════════════════════════════════════════ */

test('B1 真实分支映射：六个分支解析为正确 lane+workorder（空 diff 通过）', () => {
  const cases = [
    ['collab/116g-backend-data', 'backend', '116g-A'],
    ['collab/116h-flutter-shell', 'flutter', '116h-A'],
    ['collab/116g-admin-safety', 'admin', '116g-B'],
    ['collab/integration-gates', 'integration', '116g-X'],
    ['collab/116x-60pct-integration', 'integration', '116x-60pct'],
    ['collab/116m-release-docs', 'integration', '116m-release'],
  ]
  const { repo, base } = initRepo()
  for (const [branch, lane, workorder] of cases) {
    const res = runChecker(repo, ['--branch', branch, '--base', base, '--head', base])
    assert.equal(res.status, 0, `${branch} 应通过: ${res.stdout}`)
    assert.match(res.stdout, new RegExp(`lane=${lane}`))
    assert.match(res.stdout, new RegExp(`workorder=${workorder}`))
  }
})

test('B2 未知分支：退出码 2 且列出已登记映射', () => {
  const { repo, base } = initRepo()
  const res = runChecker(repo, ['--branch', 'collab/unknown-xyz', '--base', base])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /未知分支 'collab\/unknown-xyz'/)
  assert.match(res.stderr, /collab\/116g-backend-\*/)
})

test('B3 模糊分支：两条映射同时命中 → 退出码 2', () => {
  const { repo, base } = initRepo()
  const cfgPath = copyConfig((cfg) => {
    cfg.branchMap.push({ branch: 'collab/116g-*', lane: 'backend', workorder: '116g-A' })
  })
  // collab/116g-admin-safety 同时命中 collab/116g-admin-* 与 collab/116g-*
  const res = runChecker(repo, ['--branch', 'collab/116g-admin-safety', '--base', base, '--config', cfgPath])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /模糊/)
  assert.match(res.stderr, /2 条映射/)
})

test('B4 --branch 与 --lane / --workorder 冲突 → 退出码 2', () => {
  const { repo, base } = initRepo()
  const resLane = runChecker(repo, ['--branch', 'collab/integration-gates', '--lane', 'backend', '--base', base])
  assert.equal(resLane.status, 2)
  assert.match(resLane.stderr, /冲突/)
  const resWo = runChecker(repo, ['--branch', 'collab/integration-gates', '--workorder', '116g-A', '--base', base])
  assert.equal(resWo.status, 2)
  assert.match(resWo.stderr, /冲突/)
})

test('B5 未知 workorder（--workorder 显式）：退出码 2 且列出已登记工单', () => {
  const { repo, base } = initRepo()
  const res = runChecker(repo, ['--lane', 'backend', '--workorder', 'NOPE', '--base', base])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /未知 workorder 'NOPE'/)
  assert.match(res.stderr, /116g-A, 116h-A, 116g-B, 116g-X/)
})

/* ═══════════════════════════════════════════════════════════
 * C. workorder 精确白名单
 * ═══════════════════════════════════════════════════════════ */
test('C1 116g-X 白名单：.github / scripts/collaboration / scripts/test / 协作约定 / 116g-X 文档通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, '.github/workflows/ci.yml', 'name: x\n')
  writeFile(repo, 'scripts/collaboration/新增脚本.mjs', 'x\n')
  writeFile(repo, 'scripts/test/新增测试.test.mjs', 'x\n')
  writeFile(repo, 'docs/协作约定.md', '# 修改协作约定\n')
  writeFile(repo, 'docs/116g-X-四轨协作与集成门禁.md', '# 116g-X\n')
  commitAll(repo, '116g-X 白名单内文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /files=5/)
})

test('C2 116g-X 白名单：docs 其他文件拒绝（不再宽泛放行 docs/**）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/进度总览.md', '# 进度\n')
  commitAll(repo, '越界改进度总览')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /\[A\] docs\/进度总览\.md/)
  assert.match(res.stdout, /不在工单 '116g-X' 白名单/)
})

test('C3 116g-X 白名单：业务代码全部拒绝（backend/flutter/admin）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 2\n')
  writeFile(repo, 'app/lib/main.dart', 'void main() { print("x"); }\n')
  writeFile(repo, 'backend/admin/src/App.jsx', 'export default 2\n')
  commitAll(repo, '116g-X 越界业务代码')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.equal((res.stdout.match(/不在工单 '116g-X' 白名单/g) || []).length, 3)
})

test('C4 116g-X 白名单：M5/M6、Prisma、数据库、生成产物不被放行', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/modules/market/order.controller.js', 'x\n')
  writeFile(repo, 'app/lib/features/agri/photo_flow_page.dart', 'x\n')
  writeFile(repo, 'backend/prisma/schema.prisma', 'datasource db {}\n-- x\n')
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// hand edit\n')
  writeFile(repo, 'backend/data/village.db', 'sqlite-bytes')
  commitAll(repo, '116g-X 全禁区')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/src\/modules\/market\/order\.controller\.js/)
  assert.match(res.stdout, /app\/lib\/features\/agri\/photo_flow_page\.dart/)
  assert.match(res.stdout, /backend\/prisma\/schema\.prisma/)
  assert.match(res.stdout, /backend\/src\/contracts\/capabilities\.js/)
  assert.match(res.stdout, /backend\/data\/village\.db/)
})

test('C5 116g-B 白名单：真实 admin 文件类别通过（api/pages/components/policies/styles/test/package/文档）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/admin/src/api/request.js', 'export const req = 1\n')
  writeFile(repo, 'backend/admin/src/pages/ResourcePage.jsx', 'export default 1\n')
  writeFile(repo, 'backend/admin/src/components/TableStateView.jsx', 'export default 1\n')
  writeFile(repo, 'backend/admin/src/policies/fieldEditPolicy.js', 'export const p = 1\n')
  writeFile(repo, 'backend/admin/src/policies/operationState.js', 'export const p = 1\n')
  writeFile(repo, 'backend/admin/src/policies/requestErrorPolicy.js', 'export const p = 1\n')
  writeFile(repo, 'backend/admin/src/policies/resourceTablePolicy.js', 'export const p = 1\n')
  writeFile(repo, 'backend/admin/src/styles.css', 'body {}\n')
  writeFile(repo, 'backend/admin/package.json', '{}\n')
  writeFile(repo, 'backend/admin/test/fieldEditPolicy.test.js', 'test()\n')
  writeFile(repo, 'docs/116g-B-管理台安全交互与领域写操作防误触.md', '# 116g-B\n')
  commitAll(repo, '116g-B 白名单内文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116g-admin-safety', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /files=11/)
})

test('C6 116g-B 白名单覆盖真实分支 c580d57 全部 18 个文件（配置级强断言）', () => {
  const realFiles = [
    'backend/admin/package.json',
    'backend/admin/src/App.jsx',
    'backend/admin/src/api/auth.js',
    'backend/admin/src/api/request.js',
    'backend/admin/src/components/TableStateView.jsx',
    'backend/admin/src/pages/ResourcePage.jsx',
    'backend/admin/src/policies/fieldEditPolicy.js',
    'backend/admin/src/policies/operationState.js',
    'backend/admin/src/policies/requestErrorPolicy.js',
    'backend/admin/src/policies/resourceTablePolicy.js',
    'backend/admin/src/styles.css',
    'backend/admin/test/auth-contract.test.js',
    'backend/admin/test/fieldEditPolicy.test.js',
    'backend/admin/test/operationState.test.js',
    'backend/admin/test/request-errors.test.js',
    'backend/admin/test/requestErrorPolicy.test.js',
    'backend/admin/test/resourceTablePolicy.test.js',
    'docs/116g-B-管理台安全交互与领域写操作防误触.md',
  ]
  const cfg = readRealLanes()
  const allow = cfg.workorders['116g-B'].allow
  const matchAny = (filePath) => {
    const norm = filePath.replace(/\\/g, '/')
    return allow.some((pat) => {
      let out = ''
      let i = 0
      while (i < pat.length) {
        const ch = pat[i]
        if (ch === '*') {
          if (pat[i + 1] === '*') { out += '.*'; i += 2; continue }
          out += '[^/]*'; i += 1; continue
        }
        if (ch === '?') { out += '[^/]'; i += 1; continue }
        if ('\\^$+.()[]{}|'.includes(ch)) out += '\\'
        out += ch
        i += 1
      }
      return new RegExp(`^${out}$`).test(norm)
    })
  }
  for (const f of realFiles) {
    assert.ok(matchAny(f), `116g-B 白名单未覆盖真实分支文件: ${f}`)
  }
})

test('C7 116g-B 白名单：生成产物与跨区拒绝', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/admin/src/apiCatalog.js', '// hand edit\n')
  writeFile(repo, 'app/lib/main.dart', 'void main() { print("x"); }\n')
  commitAll(repo, '116g-B 越界')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116g-admin-safety', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/admin\/src\/apiCatalog\.js/)
  assert.match(res.stdout, /生成产物/)
  assert.match(res.stdout, /app\/lib\/main\.dart/)
  assert.match(res.stdout, /不在工单 '116g-B' 白名单/)
})

test('C8 116g-A 回填后：8 个精确 backend/src 路径全部放行，pending=0', () => {
  const cfg = readRealLanes()
  assert.equal(cfg.workorders['116g-A'].pending.length, 0, '116g-A pending 应已回填为 0')
  const { repo, base } = initRepo()
  for (const p of BACKEND_116G_A_PATHS) writeFile(repo, p, 'export const x = 1;\n')
  commitAll(repo, '116g-A 8 个授权路径')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116g-backend-data', '--base', base, '--head', head, '--json'])
  assert.equal(res.status, 0)
  const payload = JSON.parse(res.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.workorder, '116g-A')
  assert.equal(payload.pending, 0)
  assert.equal(payload.files, 8)
  assert.equal(payload.violations.length, 0)
})

test('C9 116g-A：backend/src 其余路径仍拒绝（app.js / order.service.js / 其他模块），不宽泛放行', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 2\n')
  writeFile(repo, 'backend/src/modules/market/order.service.js', 'export const s = 1\n')
  writeFile(repo, 'backend/src/modules/agri/detect.controller.js', 'export const d = 1\n')
  commitAll(repo, '116g-A 越界其他 backend/src')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116g-backend-data', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.equal((res.stdout.match(/不在工单 '116g-A' 白名单/g) || []).length, 3)
  assert.match(res.stdout, /backend\/src\/app\.js/)
  assert.match(res.stdout, /backend\/src\/modules\/market\/order\.service\.js/)
  assert.match(res.stdout, /backend\/src\/modules\/agri\/detect\.controller\.js/)
})

test('C10 116h-A 白名单：基座/设计系统/Home/Shell/Test/pubspec/文档通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'app/lib/core/theme.dart', 'final t = 1;\n')
  writeFile(repo, 'app/lib/core/router.dart', 'final r = 1;\n')
  writeFile(repo, 'app/lib/design_system/tokens.dart', 'final tk = 1;\n')
  writeFile(repo, 'app/lib/pages/home/shell_page.dart', 'class Shell {}\n')
  writeFile(repo, 'app/lib/pages/home/home_page.dart', 'class Home {}\n')
  writeFile(repo, 'app/lib/widgets/common.dart', 'class C {}\n')
  writeFile(repo, 'app/test/shell_test.dart', 'test()\n')
  writeFile(repo, 'app/pubspec.yaml', 'name: app\n')
  writeFile(repo, 'app/pubspec.lock', 'lock\n')
  writeFile(repo, 'docs/116h-A-基座与设计系统.md', '# 116h-A\n')
  writeFile(repo, 'app/lib/main.dart', 'void main() { print("x"); }\n')
  commitAll(repo, '116h-A 白名单内文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116h-flutter-shell', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /files=11/)
})

test('C11 116h-A 白名单：M5 交易、M6 植保、生成产物拒绝', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'app/lib/features/market/product_page.dart', 'class P {}\n')
  writeFile(repo, 'app/lib/pages/agri/photo_flow_page.dart', 'class A {}\n')
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// hand edit\n')
  commitAll(repo, '116h-A 越界')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116h-flutter-shell', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /app\/lib\/features\/market\/product_page\.dart/)
  assert.match(res.stdout, /app\/lib\/pages\/agri\/photo_flow_page\.dart/)
  assert.match(res.stdout, /app\/lib\/core\/feature_catalog\.dart/)
  assert.match(res.stdout, /生成产物/)
})

test('C12 116h-A 白名单补齐：collab/116h-flutter-* 修改 elder_mode.dart 与 splash/splash_page.dart 通过（配置级 + 功能级双锁定）', () => {
  // 配置级：两条真实路径必须被 116h-A allow 精确匹配（与 C6 同样的 glob 语义）
  const cfg = readRealLanes()
  const allow = cfg.workorders['116h-A'].allow
  const matchAny = (filePath) => {
    const norm = filePath.replace(/\\/g, '/')
    return allow.some((pat) => {
      let out = ''
      let i = 0
      while (i < pat.length) {
        const ch = pat[i]
        if (ch === '*') {
          if (pat[i + 1] === '*') { out += '.*'; i += 2; continue }
          out += '[^/]*'; i += 1; continue
        }
        if (ch === '?') { out += '[^/]'; i += 1; continue }
        if ('\\^$+.()[]{}|'.includes(ch)) out += '\\'
        out += ch
        i += 1
      }
      return new RegExp(`^${out}$`).test(norm)
    })
  }
  assert.ok(matchAny('app/lib/core/elder_mode.dart'), '116h-A 白名单未覆盖 app/lib/core/elder_mode.dart')
  assert.ok(matchAny('app/lib/pages/splash/splash_page.dart'), '116h-A 白名单未覆盖 app/lib/pages/splash/splash_page.dart')

  // 功能级：修改既有文件（M 状态）必须放行
  const { repo, base } = initRepo()
  writeFile(repo, 'app/lib/core/elder_mode.dart', '// elder modified\n')
  writeFile(repo, 'app/lib/pages/splash/splash_page.dart', '// splash modified\n')
  commitAll(repo, '116h-A 补齐路径修改')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116h-flutter-shell-polish', '--base', base, '--head', head, '--json'])
  assert.equal(res.status, 0, `应通过: ${res.stdout}`)
  const payload = JSON.parse(res.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.workorder, '116h-A')
  assert.equal(payload.files, 2)
  assert.equal(payload.counts.M, 2)
  assert.equal(payload.violations.length, 0)
})

test('C13 116h-A 白名单：backend / admin / scripts / .github / feature_catalog 在 collab/116h-flutter-* 上仍拒绝', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 2\n')
  writeFile(repo, 'backend/admin/src/App.jsx', 'export default 2\n')
  writeFile(repo, 'scripts/test/越界.test.mjs', 'test()\n')
  writeFile(repo, '.github/workflows/ci.yml', 'name: x\n')
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// hand edit\n')
  commitAll(repo, '116h-A 跨区越界')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116h-flutter-shell', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.equal((res.stdout.match(/不在工单 '116h-A' 白名单/g) || []).length, 4)
  assert.match(res.stdout, /backend\/src\/app\.js/)
  assert.match(res.stdout, /backend\/admin\/src\/App\.jsx/)
  assert.match(res.stdout, /scripts\/test\/越界\.test\.mjs/)
  assert.match(res.stdout, /\.github\/workflows\/ci\.yml/)
  assert.match(res.stdout, /app\/lib\/core\/feature_catalog\.dart/)
  assert.match(res.stdout, /生成产物/)
})

test('C14 116x 聚合工单：四 lane 精确文件与 final40 生成链路通过、禁区仍拒绝', () => {
  const { repo, base } = initRepo()
  // 本次聚合工单精确授权的代表性文件（四 lane 各取一条 + 测试/docs）
  const allowedFiles = [
    // Backend 116g-A
    'backend/src/modules/market/order.policy.js',
    'backend/src/modules/data/sync.policy.js',
    'backend/src/modules/machinery/booking.policy.js',
    'backend/src/modules/platform/resource.policy.js',
    'backend/src/modules/platform/site.controller.js',
    'backend/test/order-consistency.test.js',
    // Flutter 116h-A 语音唤醒 401 治理
    'app/lib/core/voice_wake.dart',
    'app/lib/core/auth_state.dart',
    'app/test/voice_wake_401_test.dart',
    'app/lib/core/api_client.dart',
    'app/lib/core/api_http_client.dart',
    'app/lib/core/api_http_client_web.dart',
    'app/lib/core/notification_state.dart',
    'app/test/auth_security_test.dart',
    'app/lib/pages/market/product_detail_page.dart',
    // Admin 116g-B ops 基座
    'backend/admin/src/policies/dangerousOperationPolicy.js',
    'backend/admin/src/policies/requestErrorPolicy.js',
    'backend/admin/test/dangerousOperationPolicy.test.js',
    // Integration 116g-X 门禁
    'scripts/collaboration/lanes.json',
    'scripts/test/scope-check.test.mjs',
    'backend/scripts/gen-capabilities.mjs',
    'backend/scripts/gen-feature-catalog.mjs',
    'backend/src/contracts/capabilities.js',
    'app/lib/core/feature_catalog.dart',
    'app/lib/pages/all/all_features_page.dart',
    'app/lib/pages/home/home_page.dart',
    'app/test/feature_catalog_tiers_test.dart',
    'docs/协作约定.md',
    'docs/116g-X-四轨协作与集成门禁.md',
    'docs/116x-剩余40整合收口.md',
  ]
  for (const p of allowedFiles) writeFile(repo, p, 'x\n')
  commitAll(repo, '116x-60pct 精确授权文件')
  const headOk = mustGit(repo, ['rev-parse', 'HEAD'])
  const resOk = runChecker(repo, ['--branch', 'collab/116x-60pct-integration', '--base', base, '--head', headOk, '--json'])
  assert.equal(resOk.status, 0, `聚合工单授权文件应通过: ${resOk.stdout}`)
  const payloadOk = JSON.parse(resOk.stdout)
  assert.equal(payloadOk.ok, true)
  assert.equal(payloadOk.workorder, '116x-60pct')
  assert.equal(payloadOk.files, allowedFiles.length)
  assert.equal(payloadOk.violations.length, 0)

  // 禁区：未授权生成产物 / DB / Prisma / 其余 backend/src 与 app/lib 业务代码 / 宽泛 docs
  const forbiddenFiles = [
    'backend/src/app.js',                                    // 其余 backend/src（非 8 个精确 controller/policy）
    'backend/src/modules/market/order.service.js',           // 未授权业务文件
    'app/lib/main.dart',                                     // 116h-A 已授权，但不在 116x-60pct 精确集（本批不动）
    'app/lib/features/agri/photo_flow_page.dart',            // 其余 app/lib
    'backend/admin/src/resourceGroups.js',                   // 116g-B 文档明确禁止
    'backend/admin/src/apiCatalog.js',                       // 未授权生成产物
    'backend/src/contracts/inventory-report.json',           // 未授权生成产物
    'backend/src/modules/ai/services/assistant-catalog.generated.js', // 未授权生成产物
    'backend/prisma/schema.prisma',                          // Prisma
    'backend/data/village.db',                               // 正式 DB
    'docs/进度总览.md',                                      // docs 不再宽泛放行
  ]
  for (const p of forbiddenFiles) writeFile(repo, p, 'x\n')
  commitAll(repo, '116x-60pct 越界禁区')
  const headBad = mustGit(repo, ['rev-parse', 'HEAD'])
  const resBad = runChecker(repo, ['--branch', 'collab/116x-60pct-integration', '--base', headOk, '--head', headBad, '--json'])
  assert.equal(resBad.status, 1, '越界文件必须失败')
  const payloadBad = JSON.parse(resBad.stdout)
  assert.equal(payloadBad.ok, false)
  assert.equal(payloadBad.files, forbiddenFiles.length)
  const badPaths = new Set(payloadBad.violations.map((v) => v.path))
  for (const p of forbiddenFiles) assert.ok(badPaths.has(p), `越界文件必须被列出: ${p}`)
  // 正负对照：通过集与失败集路径集合不相交
  for (const p of allowedFiles) assert.ok(!badPaths.has(p), `授权文件不得出现在越界列表: ${p}`)
})

test('C15 116x 仅允许 final40 指定生成产物，其余生成产物仍拒绝', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// regenerated by final40\n')
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// regenerated by final40\n')
  commitAll(repo, '116x final40 允许生成产物')
  const headOk = mustGit(repo, ['rev-parse', 'HEAD'])
  const resOk = runChecker(repo, ['--branch', 'collab/116x-final40-integration', '--base', base, '--head', headOk, '--json'])
  assert.equal(resOk.status, 0, `final40 指定生成产物应通过: ${resOk.stdout}`)

  writeFile(repo, 'backend/src/contracts/inventory-report.json', '// hand edit\n')
  writeFile(repo, 'backend/src/modules/ai/services/assistant-catalog.generated.js', '// hand edit\n')
  writeFile(repo, 'backend/admin/src/apiCatalog.js', '// hand edit\n')
  commitAll(repo, '116x 未授权生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/116x-final40-integration', '--base', headOk, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/src\/contracts\/inventory-report\.json/)
  assert.match(res.stdout, /assistant-catalog\.generated\.js/)
  assert.match(res.stdout, /backend\/admin\/src\/apiCatalog\.js/)
  assert.match(res.stdout, /不在工单 '116x-60pct' 白名单/)
})

test('C16 116m-release 文档收口：116m 文档与进度总览通过，业务/DB/Prisma/生成产物拒绝', () => {
  const { repo, base } = initRepo()
  const allowedFiles = [
    'docs/进度总览.md',
    'docs/116m-比赛发布与本地验收收口.md',
    'docs/116m-项目总收尾工单.md',
    'docs/协作约定.md',
    'docs/116g-X-四轨协作与集成门禁.md',
    'scripts/collaboration/lanes.json',
    'scripts/test/scope-check.test.mjs',
  ]
  for (const p of allowedFiles) writeFile(repo, p, 'x\n')
  commitAll(repo, '116m 文档收口授权文件')
  const headOk = mustGit(repo, ['rev-parse', 'HEAD'])
  const resOk = runChecker(repo, ['--branch', 'collab/116m-release-docs', '--base', base, '--head', headOk, '--json'])
  assert.equal(resOk.status, 0, `116m 文档收口授权文件应通过: ${resOk.stdout}`)
  const payloadOk = JSON.parse(resOk.stdout)
  assert.equal(payloadOk.ok, true)
  assert.equal(payloadOk.workorder, '116m-release')
  assert.equal(payloadOk.files, allowedFiles.length)
  assert.equal(payloadOk.violations.length, 0)

  const forbiddenFiles = [
    'app/lib/pages/home/home_page.dart',
    'backend/src/app.js',
    'backend/admin/src/App.jsx',
    'backend/src/contracts/capabilities.js',
    'app/lib/core/feature_catalog.dart',
    'backend/prisma/schema.prisma',
    'backend/data/village.db',
  ]
  for (const p of forbiddenFiles) writeFile(repo, p, 'x\n')
  commitAll(repo, '116m 越界文件')
  const headBad = mustGit(repo, ['rev-parse', 'HEAD'])
  const resBad = runChecker(repo, ['--branch', 'collab/116m-release-docs', '--base', headOk, '--head', headBad, '--json'])
  assert.equal(resBad.status, 1, '116m 越界文件必须失败')
  const payloadBad = JSON.parse(resBad.stdout)
  const badPaths = new Set(payloadBad.violations.map((v) => v.path))
  for (const p of forbiddenFiles) assert.ok(badPaths.has(p), `越界文件必须被列出: ${p}`)
})


/* ═══════════════════════════════════════════════════════════
 * D. workorder 模式下的 A/M/D/R 与中文/空格路径
 * ═══════════════════════════════════════════════════════════ */

test('D1 116g-X：中文+空格路径（scripts/collaboration 内通过，docs 外拒绝）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'scripts/collaboration/中文 文件.mjs', 'x\n')
  commitAll(repo, '中文脚本合法')
  const head1 = mustGit(repo, ['rev-parse', 'HEAD'])
  const res1 = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', base, '--head', head1])
  assert.equal(res1.status, 0)
  assert.match(res1.stdout, /OK/)

  writeFile(repo, 'docs/中文 文档/新 文件.md', 'x\n')
  commitAll(repo, 'docs 中文越界')
  const head2 = mustGit(repo, ['rev-parse', 'HEAD'])
  const res2 = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', head1, '--head', head2])
  assert.equal(res2.status, 1)
  assert.match(res2.stdout, /docs\/中文 文档\/新 文件\.md/)
  assert.match(res2.stdout, /不在工单 '116g-X' 白名单/)
})

test('D2 116g-X：重命名在 scripts/collaboration 内通过（R 新旧路径均在白名单）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'scripts/collaboration/rename-me.mjs', 'x\n')
  commitAll(repo, '准备重命名源文件')
  const head1 = mustGit(repo, ['rev-parse', 'HEAD'])
  fs.renameSync(path.join(repo, 'scripts', 'collaboration', 'rename-me.mjs'), path.join(repo, 'scripts', 'collaboration', 'renamed.mjs'))
  commitAll(repo, '白名单内重命名')
  const head2 = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', head1, '--head', head2])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /"R"/)
})

test('D3 116g-X：重命名越界（脚本 → docs）精确列出新路径', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'scripts/collaboration/rename-out.mjs', 'x\n')
  commitAll(repo, '准备重命名源文件')
  const head1 = mustGit(repo, ['rev-parse', 'HEAD'])
  fs.renameSync(path.join(repo, 'scripts', 'collaboration', 'rename-out.mjs'), path.join(repo, 'docs', 'out.md'))
  commitAll(repo, '越界重命名到 docs')
  const head2 = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', head1, '--head', head2])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /\[R\] docs\/out\.md/)
  assert.match(res.stdout, /不在工单 '116g-X' 白名单/)
})

test('D4 116g-X：删除协作约定.md 通过；删除 backend/src/app.js 拒绝', () => {
  const { repo, base } = initRepo()
  fs.unlinkSync(path.join(repo, 'docs', '协作约定.md'))
  commitAll(repo, '删除白名单内文件')
  const head1 = mustGit(repo, ['rev-parse', 'HEAD'])
  const res1 = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', base, '--head', head1])
  assert.equal(res1.status, 0)
  assert.match(res1.stdout, /OK/)

  fs.unlinkSync(path.join(repo, 'backend', 'src', 'app.js'))
  commitAll(repo, '删除白名单外文件')
  const head2 = mustGit(repo, ['rev-parse', 'HEAD'])
  const res2 = runChecker(repo, ['--branch', 'collab/integration-gates', '--base', head1, '--head', head2])
  assert.equal(res2.status, 1)
  assert.match(res2.stdout, /\[D\] backend\/src\/app\.js/)
  assert.match(res2.stdout, /不在工单 '116g-X' 白名单/)
})
