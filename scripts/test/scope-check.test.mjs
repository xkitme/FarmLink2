/**
 * scope-check.test.mjs — scope checker 强测试（node:test，零依赖）
 *
 * 覆盖矩阵（每个用例都断言输出文本/文件状态，绝不只断言 exit code）：
 *   1. 四条 lane 的合法路径通过（backend/flutter/admin/integration）
 *   2. 越界路径失败且列出精确文件
 *   3. generated 文件对业务 lane 失败（feature_catalog.dart / capabilities.js）
 *   4. 中文/空格路径（新增、修改、删除、重命名）
 *   5. 删除与重命名（R 记录新旧路径同时检查）
 *   6. 正负对照（同一仓库先合法后越界，输出与退出码均不同）
 *   7. 唯一工作单例外路径（未授权失败 / 错误编号失败 / 正确编号通过）
 *   8. 未知 lane / 缺 base / 分叉 / 脏工作树 全部非零退出且带明确消息
 *   9. 检查前后仓库内容与 mtime 完全不变（checker 不修改工作树）
 *  10. 空 diff（base == head）通过
 *
 * 运行：node --test scripts/test/scope-check.test.mjs
 */

import { test, before, after } from 'node:test'
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
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// generated\n')
  writeFile(repo, 'app/test/home_test.dart', 'test()\n')
  writeFile(repo, 'backend/admin/src/App.jsx', 'export default 1\n')
  writeFile(repo, 'backend/admin/src/apiCatalog.js', '// generated\n')
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

before(() => {})
after(() => {
  for (const root of tempRoots) {
    try { fs.rmSync(root, { recursive: true, force: true }) } catch { /* ignore */ }
  }
})

/* ── 1. 四条 lane 合法路径通过 ───────────────────────────── */

test('backend lane: backend/test 新增文件通过（内容断言 OK 输出）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/test/新测试.test.js', 'test()\n')
  commitAll(repo, 'add backend test')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK: 全部变更均属于 lane 允许范围/)
  assert.match(res.stdout, /files=1/)
  assert.doesNotMatch(res.stdout, /VIOLATION/)
  // checker 不改工作树
  assert.equal(mustGit(repo, ['status', '--porcelain']), '')
})

test('flutter lane: app/test 新增文件通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'app/test/widget_新增_test.dart', 'test()\n')
  commitAll(repo, 'add flutter test')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /app\/test\/widget_新增_test\.dart|files=1/)
})

test('admin lane: backend/admin/src 修改通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/admin/src/App.jsx', 'export default 2\n')
  commitAll(repo, 'modify admin App')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'admin', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

test('integration lane: docs/scripts/.github 新增通过', () => {
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

/* ── 2. 越界路径失败且列出精确文件 ───────────────────────── */

test('backend lane 越界改 docs：非零退出且精确列出文件', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/协作约定.md', '# 被越界修改\n')
  commitAll(repo, 'backend 越界改 docs')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /VIOLATION/)
  assert.match(res.stdout, /docs\/协作约定\.md/)
  assert.match(res.stdout, /不属于 lane 'backend' 的允许路径/)
  assert.match(res.stdout, /\[M\]/)
})

test('flutter lane 越界改 backend/src：非零退出且列出精确文件', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 999\n')
  commitAll(repo, 'flutter 越界改 backend')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /VIOLATION/)
  assert.match(res.stdout, /backend\/src\/app\.js/)
})

/* ── 3. generated 文件对业务 lane 失败 ────────────────────── */

test('flutter lane 手改 feature_catalog.dart：生成产物失败', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// hand edit\n')
  commitAll(repo, '手改生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /app\/lib\/core\/feature_catalog\.dart/)
  assert.match(res.stdout, /生成产物/)
})

test('backend lane 手改 capabilities.js：生成产物失败', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// hand edit\n')
  commitAll(repo, '手改注册表生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/src\/contracts\/capabilities\.js/)
  assert.match(res.stdout, /生成产物/)
})

test('integration lane 可改生成产物（--write 重建路径放行）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/contracts/capabilities.js', '// regenerated by integration\n')
  writeFile(repo, 'app/lib/core/feature_catalog.dart', '// regenerated\n')
  commitAll(repo, 'integration 重建生成产物')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

/* ── 4. 中文/空格路径 ────────────────────────────────────── */

test('中文+空格路径新增（integration 合法）通过', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'docs/中文 文档/新 文件.md', 'new\n')
  commitAll(repo, '新增中文空格路径')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /files=1/)
})

test('中文+空格路径越界（backend lane 改 中文 路径/文件 名.md）非零且路径无损列出', () => {
  const { repo, base } = initRepo()
  writeFile(repo, '中文 路径/文件 名.md', '被越界修改\n')
  commitAll(repo, '越界修改中文文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /中文 路径\/文件 名\.md/)
  assert.doesNotMatch(res.stdout, /\\u/)
})

/* ── 5. 删除与重命名 ─────────────────────────────────────── */

test('删除：flutter lane 删除 app/lib/main.dart 通过', () => {
  const { repo, base } = initRepo()
  fs.unlinkSync(path.join(repo, 'app', 'lib', 'main.dart'))
  commitAll(repo, 'flutter 删除自己的文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
})

test('删除：flutter lane 删除 backend/src/app.js 越界且精确列出', () => {
  const { repo, base } = initRepo()
  fs.unlinkSync(path.join(repo, 'backend', 'src', 'app.js'))
  commitAll(repo, 'flutter 越界删除 backend 文件')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /\[D\] backend\/src\/app\.js/)
})

test('重命名：backend lane 在 src 内重命名通过（R 新旧路径均合法）', () => {
  const { repo, base } = initRepo()
  fs.renameSync(path.join(repo, 'backend', 'src', 'app.js'), path.join(repo, 'backend', 'src', 'app2.js'))
  commitAll(repo, 'backend 内部重命名')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /OK/)
  assert.match(res.stdout, /"R"/)
})

test('重命名：flutter lane 把 app 文件重命名进 backend 越界，新旧路径都列出', () => {
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

/* ── 6. 正负对照 ─────────────────────────────────────────── */

test('正负对照：同一仓库合法提交通过、越界提交失败，输出文本不同', () => {
  const { repo, base } = initRepo()
  // 正例
  writeFile(repo, 'backend/test/positive.test.js', 'test()\n')
  commitAll(repo, 'positive')
  const headPos = mustGit(repo, ['rev-parse', 'HEAD'])
  const resPos = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', headPos])
  assert.equal(resPos.status, 0)
  assert.match(resPos.stdout, /OK/)
  // 负例（同一仓库继续越界提交）
  writeFile(repo, 'docs/协作约定.md', '# 越界\n')
  commitAll(repo, 'negative')
  const headNeg = mustGit(repo, ['rev-parse', 'HEAD'])
  const resNeg = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', headNeg])
  assert.equal(resNeg.status, 1)
  assert.match(resNeg.stdout, /VIOLATION/)
  assert.notEqual(resPos.stdout, resNeg.stdout)
})

/* ── 7. 唯一工作单例外路径 ───────────────────────────────── */

function writeTempConfig() {
  const raw = fs.readFileSync(REAL_LANES, 'utf8')
  const cfg = JSON.parse(raw)
  // 把正式配置中 schema.prisma 的例外条目（workorders 为空 = 未授权）替换为授权 WO-001
  cfg.lanes.backend.exceptions[0].workorders = ['WO-001']
  const cfgPath = path.join(os.tmpdir(), `lanes-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8')
  tempRoots.push(cfgPath)
  return cfgPath
}

test('唯一工作单例外：未授权 / 错误编号失败，正确编号通过', () => {
  const { repo, base } = initRepo()
  const cfgPath = writeTempConfig()
  writeFile(repo, 'backend/prisma/schema.prisma', 'datasource db {}\n-- changed\n')
  commitAll(repo, '改 prisma schema')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])

  const resNoAuth = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head, '--config', cfgPath])
  assert.equal(resNoAuth.status, 1)
  assert.match(resNoAuth.stdout, /backend\/prisma\/schema\.prisma/)
  assert.match(resNoAuth.stdout, /唯一工作单例外路径/)

  const resWrongId = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head, '--config', cfgPath, '--workorder', 'WO-999'])
  assert.equal(resWrongId.status, 1)
  assert.match(resWrongId.stdout, /唯一工作单例外路径/)

  const resRightId = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head, '--config', cfgPath, '--workorder', 'WO-001'])
  assert.equal(resRightId.status, 0)
  assert.match(resRightId.stdout, /OK/)
})

test('正式配置中 prisma 例外 workorders 为空：任何工作单都失败（当前未授权）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/prisma/migrations/20260801_init/migration.sql', 'CREATE TABLE t(id INTEGER);\n')
  commitAll(repo, '加 migration')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head, '--workorder', 'ANY-ID'])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /backend\/prisma\/migrations\//)
  assert.match(res.stdout, /当前未授权任何工作单/)
})

/* ── 8. 未知 lane / 缺 base / 分叉 / 脏工作树 ────────────── */

test('未知 lane：退出码 2 且列出合法 lane', () => {
  const { repo, base } = initRepo()
  const res = runChecker(repo, ['--lane', 'unknown-lane', '--base', base])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /未知 lane 'unknown-lane'/)
  assert.match(res.stderr, /backend, flutter, admin, integration/)
})

test('缺 --base：退出码 2 且明确报错', () => {
  const { repo } = initRepo()
  const res = runChecker(repo, ['--lane', 'integration'])
  assert.equal(res.status, 2)
  assert.match(res.stderr, /缺少 --base/)
})

test('分叉（base 不是 head 祖先）：非零退出且明确报分叉', () => {
  const { repo, base } = initRepo()
  // main 上继续提交 D
  writeFile(repo, 'docs/主线.md', 'main\n')
  commitAll(repo, 'main D')
  const mainHead = mustGit(repo, ['rev-parse', 'HEAD'])
  // 从 base 拉出侧分支提交 C
  mustGit(repo, ['checkout', '-b', 'side', base])
  writeFile(repo, 'docs/侧线.md', 'side\n')
  commitAll(repo, 'side C')
  const sideHead = mustGit(repo, ['rev-parse', 'HEAD'])
  // base=mainHead（D），head=sideHead（C），D 不是 C 祖先 → 分叉
  const res = runChecker(repo, ['--lane', 'integration', '--base', mainHead, '--head', sideHead])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /不是 head/)
  assert.match(res.stdout, /分叉/)
})

test('脏工作树：未提交修改 → 非零退出并列出脏条目', () => {
  const { repo, base } = initRepo()
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  writeFile(repo, 'docs/未提交.md', 'dirty\n') // 不 commit
  const res = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(res.status, 1)
  assert.match(res.stdout, /工作树不干净/)
  assert.match(res.stdout, /docs\/未提交\.md/)
})

/* ── 9. 检查前后内容与 mtime 不变 ────────────────────────── */

test('checker 运行前后：仓库文件内容与 mtime 完全不变，无新增文件', () => {
  const { repo, base } = initRepo()
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const before = snapshotTree(repo)
  const beforeList = Object.keys(before).sort()

  // 跑一次合法 + 一次越界
  const resOk = runChecker(repo, ['--lane', 'integration', '--base', base, '--head', head])
  assert.equal(resOk.status, 0)
  writeFile(repo, 'docs/越界样例.md', 'x\n')
  commitAll(repo, '越界样例')
  const head2 = mustGit(repo, ['rev-parse', 'HEAD'])
  const resBad = runChecker(repo, ['--lane', 'backend', '--base', base, '--head', head2])
  assert.equal(resBad.status, 1)

  const after = snapshotTree(repo)
  const afterList = Object.keys(after).sort()
  // 只有我们主动新增的越界样例文件，checker 本身没有新增/删除任何文件
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

/* ── 10. 空 diff ─────────────────────────────────────────── */

test('base == head（空 diff）：通过且 files=0', () => {
  const { repo, base } = initRepo()
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', base])
  assert.equal(res.status, 0)
  assert.match(res.stdout, /files=0/)
  assert.match(res.stdout, /OK/)
})

/* ── 11. --json 输出结构 ─────────────────────────────────── */

test('--json 输出可解析且字段完整（ok/violations/counts）', () => {
  const { repo, base } = initRepo()
  writeFile(repo, 'backend/src/app.js', 'module.exports = 42\n')
  commitAll(repo, 'json 样例')
  const head = mustGit(repo, ['rev-parse', 'HEAD'])
  const res = runChecker(repo, ['--lane', 'flutter', '--base', base, '--head', head, '--json'])
  assert.equal(res.status, 1)
  const payload = JSON.parse(res.stdout)
  assert.equal(payload.ok, false)
  assert.equal(payload.lane, 'flutter')
  assert.equal(payload.files, 1)
  assert.equal(payload.violations.length, 1)
  assert.equal(payload.violations[0].path, 'backend/src/app.js')
  assert.equal(payload.counts.M, 1)
})
