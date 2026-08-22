#!/usr/bin/env node
/**
 * scope-check.mjs — 四轨协作变更范围门禁（只读，绝不修改工作树）
 *
 * 用法（cwd 可为任意位置，--repo 指向仓库根）：
 *   # CI / 推荐：按真实分支解析 lane + workorder（白名单精确检查）
 *   node scripts/collaboration/scope-check.mjs --branch <branch> --base <sha> [--head <sha>]
 *       [--repo <path>] [--config <path>] [--json]
 *
 *   # 显式指定工单白名单
 *   node scripts/collaboration/scope-check.mjs --lane <lane> --workorder <id> --base <sha> [...]
 *
 *   # legacy：仅按 lane 允许/禁止路径（本地 ad-hoc 用，CI 不用）
 *   node scripts/collaboration/scope-check.mjs --lane <lane> --base <sha> [...]
 *
 * 规则（与 scripts/collaboration/lanes.json 的 schemaVersion=2 一致）：
 *   1. 参数/状态校验：base 必须提供且可解析、head 默认 HEAD；base 必须是 head 的祖先
 *      （否则判定分叉，拒绝静默通过）；工作树必须干净；未知/模糊分支非零失败。
 *   2. 变更清单：git diff --name-status -z -M <base> <head>（A/M/D/R/C/T…，
 *      中文/空格路径经 core.quotepath=false + NUL 分隔无损解析；重命名同时检查新旧路径）。
 *   3. workorder 模式（--branch 或 --workorder 触发）逐路径判定：
 *        a. globalForbid 命中                 → 越界（硬失败）
 *        b. lane != integration 且命中 generatedProducts → 越界（生成产物仅 Integration 重建）
 *        c. lane.forbid 命中                  → 越界
 *        d. workorders[<id>].allow 命中       → 放行（精确工单白名单；pending 待定项永不放行）
 *        e. 其余                              → 越界（不在当前工单白名单）
 *   4. legacy 模式（仅 --lane）逐路径判定：
 *        a. globalForbid → b. 生成产物 → c. lane.forbid → d. lane.exceptions（当前一律未授权）
 *        e. lane.allow → f. 越界
 *   5. 任一越界：列出精确文件（路径+状态+原因）并以退出码 1 结束；全部放行则退出 0。
 *   6. 本脚本只执行 git 只读命令（status/rev-parse/merge-base/diff），不写入任何文件，
 *      不修改工作树，不改 .git 引用。
 *
 * 退出码：0 = 通过；1 = 越界/分叉/脏工作树；2 = 用法或参数错误（未知 lane/分支、缺 base、
 *        sha 不可解析、分支模糊、配置不一致）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONFIG = path.join(__dirname, 'lanes.json')

/* ── 参数解析 ─────────────────────────────────────────────── */

function parseArgs(argv) {
  const opts = { lane: null, branch: null, workorder: null, base: null, head: null, repo: null, config: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => { i++; return argv[i] }
    switch (a) {
      case '--lane': opts.lane = next(); break
      case '--branch': opts.branch = next(); break
      case '--workorder': opts.workorder = next(); break
      case '--base': opts.base = next(); break
      case '--head': opts.head = next(); break
      case '--repo': opts.repo = next(); break
      case '--config': opts.config = next(); break
      case '--json': opts.json = true; break
      case '--help': case '-h':
        printHelp(); process.exit(0)
      default:
        usageError(`未知参数: ${a}`)
    }
  }
  return opts
}

function printHelp() {
  console.log(`scope-check.mjs — 四轨协作变更范围门禁（只读）
用法:
  node scripts/collaboration/scope-check.mjs --branch <branch> --base <sha> [--head <sha>]
      [--repo <path>] [--config <path>] [--json]
  node scripts/collaboration/scope-check.mjs --lane <lane> --workorder <id> --base <sha> [...]
  node scripts/collaboration/scope-check.mjs --lane <lane> --base <sha> [...]   # legacy
--branch: 真实分支名，按 branchMap 解析 lane + workorder（未知/模糊 → 退出码 2）
--workorder: 工单编号（config.workorders 中的键），切换为精确白名单模式
--base: 变更起点 commit（必填）；--head: 变更终点 commit（默认 HEAD）
--config: 配置文件（默认 scripts/collaboration/lanes.json）
--json: 以 JSON 输出结果（stdout）
退出码: 0=通过 1=越界/分叉/脏工作树 2=用法错误`)
}

function usageError(msg) {
  process.stderr.write(`[scope-check] usage error: ${msg}\n`)
  process.exit(2)
}

/* ── git 只读调用 ────────────────────────────────────────── */

function git(repo, args) {
  const res = spawnSync('git', ['-C', repo, '-c', 'core.quotepath=false', ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  })
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' }
}

function resolveSha(repo, ref) {
  const r = git(repo, ['rev-parse', `${ref}^{commit}`])
  if (r.status !== 0) return null
  return r.stdout.trim()
}

/* ── glob 匹配（支持 ** / * / ?，路径用正斜杠） ─────────────── */

function globToRegExp(pattern) {
  let out = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        out += '.*'
        i += 2
        continue
      }
      out += '[^/]*'
      i += 1
      continue
    }
    if (ch === '?') {
      out += '[^/]'
      i += 1
      continue
    }
    if ('\\^$+.()[]{}|'.includes(ch)) out += '\\'
    out += ch
    i += 1
  }
  return new RegExp(`^${out}$`)
}

function compile(patterns) {
  return patterns.map((pat) => ({ pat, re: globToRegExp(pat) }))
}

function matches(compiled, filePath) {
  return compiled.some(({ re }) => re.test(filePath))
}

/* ── 变更解析（A/M/D/R…，中文/空格安全） ──────────────────── */

function parseNameStatus(raw) {
  // git diff -z --name-status -M 输出：<status>[<score>]\0<path>\0 或
  // <status>[<score>]\0<old>\0<new>\0（R/C 重命名/复制）。尾部可能有一个空 token。
  const tokens = raw.split('\0')
  const changes = []
  let i = 0
  while (i < tokens.length) {
    const statusToken = tokens[i]
    if (statusToken === undefined || statusToken === '') { i += 1; continue }
    const status = statusToken[0]
    if (!/^[ACDMRTUXB]$/.test(status)) {
      throw new Error(`无法解析的 name-status token: <${statusToken}>`)
    }
    const isTwoPath = status === 'R' || status === 'C'
    const oldPath = tokens[i + 1]
    const newPath = isTwoPath ? tokens[i + 2] : null
    if (oldPath === undefined || oldPath === '') {
      throw new Error(`name-status 记录缺少路径: status=<${statusToken}>`)
    }
    changes.push({ status, oldPath, newPath })
    i += isTwoPath ? 3 : 2
  }
  return changes
}

/* ── 主流程 ───────────────────────────────────────────────── */

function main() {
  const opts = parseArgs(process.argv.slice(2))

  // 配置文件
  const configPath = opts.config || DEFAULT_CONFIG
  let config
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (err) {
    usageError(`无法读取配置 ${configPath}: ${err.message}`)
  }
  if (!config || config.schemaVersion !== 2 || !config.lanes || !config.workorders || !config.branchMap) {
    usageError(`配置 ${configPath} 不符合 schemaVersion=2（需要 lanes + workorders + branchMap）`)
  }

  if (!opts.base) usageError('缺少 --base（变更起点 commit）')
  const repo = opts.repo || process.cwd()
  if (!fs.existsSync(path.join(repo, '.git'))) {
    usageError(`不是 git 仓库（--repo=${repo} 下没有 .git）`)
  }

  // ── lane / workorder 解析 ──────────────────────────────
  let laneName = null
  let workorderId = null
  let mode = 'legacy' // 'workorder' | 'legacy'

  if (opts.branch) {
    // 分支解析：branchMap 前缀/精确匹配；0 命中 = 未知，>1 命中 = 模糊
    const compiledMap = (config.branchMap || []).map((entry) => ({ ...entry, re: globToRegExp(entry.branch) }))
    const hits = compiledMap.filter((entry) => entry.re.test(opts.branch))
    if (hits.length === 0) {
      usageError(`未知分支 '${opts.branch}'（branchMap 未登记）；当前登记: ${config.branchMap.map((e) => e.branch).join(', ')}`)
    }
    if (hits.length > 1) {
      usageError(`分支 '${opts.branch}' 模糊（命中 ${hits.length} 条映射: ${hits.map((e) => e.branch).join(', ')}）`)
    }
    laneName = hits[0].lane
    workorderId = hits[0].workorder
    mode = 'workorder'
    if (opts.lane && opts.lane !== laneName) {
      usageError(`--branch '${opts.branch}' 解析为 lane '${laneName}'，与 --lane '${opts.lane}' 冲突`)
    }
    if (opts.workorder && opts.workorder !== workorderId) {
      usageError(`--branch '${opts.branch}' 解析为 workorder '${workorderId}'，与 --workorder '${opts.workorder}' 冲突`)
    }
  } else if (opts.workorder) {
    if (!config.workorders[opts.workorder]) {
      usageError(`未知 workorder '${opts.workorder}'；已登记: ${Object.keys(config.workorders).join(', ')}`)
    }
    workorderId = opts.workorder
    laneName = config.workorders[workorderId].lane
    mode = 'workorder'
    if (opts.lane && opts.lane !== laneName) {
      usageError(`workorder '${opts.workorder}' 属于 lane '${laneName}'，与 --lane '${opts.lane}' 冲突`)
    }
  } else {
    if (!opts.lane) usageError('缺少 --lane（或使用 --branch / --workorder 进入工单白名单模式）')
    laneName = opts.lane
    mode = 'legacy'
  }

  const lane = config.lanes[laneName]
  if (!lane) {
    usageError(`未知 lane '${laneName}'；合法 lane: ${Object.keys(config.lanes).join(', ')}`)
  }

  // workorder 与 lane 一致性（配置完整性）
  if (mode === 'workorder') {
    const wo = config.workorders[workorderId]
    if (wo.lane !== laneName) {
      usageError(`配置不一致：workorder '${workorderId}' 声明 lane '${wo.lane}'，但解析为 lane '${laneName}'`)
    }
  }

  const result = { lane: laneName, workorder: workorderId, mode, base: null, head: null, files: 0, counts: {}, violations: [], dirty: [], diverged: false, pending: 0, ok: false }

  // 工作树干净检查（只读）
  const status = git(repo, ['status', '--porcelain'])
  if (status.status !== 0) {
    usageError(`git status 执行失败: ${status.stderr.trim()}`)
  }
  const dirtyLines = status.stdout.split('\n').filter((l) => l.trim() !== '')
  if (dirtyLines.length > 0) {
    result.dirty = dirtyLines
    emit(result, opts.json)
    process.exit(1)
  }

  // sha 解析
  const baseSha = resolveSha(repo, opts.base)
  if (!baseSha) usageError(`无法解析 base '${opts.base}'`)
  const headRef = opts.head || 'HEAD'
  const headSha = resolveSha(repo, headRef)
  if (!headSha) usageError(`无法解析 head '${headRef}'`)
  result.base = baseSha
  result.head = headSha

  // 分叉检查：base 必须是 head 的祖先
  const anc = git(repo, ['merge-base', '--is-ancestor', baseSha, headSha])
  if (anc.status !== 0) {
    result.diverged = true
    emit(result, opts.json)
    process.exit(1)
  }

  // 变更清单
  const diff = git(repo, ['diff', '-z', '--name-status', '-M', baseSha, headSha])
  if (diff.status !== 0) {
    usageError(`git diff 执行失败: ${diff.stderr.trim()}`)
  }
  let changes
  try {
    changes = parseNameStatus(diff.stdout)
  } catch (err) {
    usageError(err.message)
  }

  // 编译模式
  const globalForbid = compile(config.globalForbid || [])
  const forbid = compile(lane.forbid || [])
  const generated = config.generatedProducts || []
  const exceptions = (lane.exceptions || []).map((e) => ({ ...e, re: globToRegExp(e.path) }))
  let workorderAllow = []
  let pendingCount = 0
  if (mode === 'workorder') {
    const wo = config.workorders[workorderId]
    workorderAllow = compile(wo.allow || [])
    pendingCount = (wo.pending || []).length
    result.pending = pendingCount
  } else {
    workorderAllow = compile(lane.allow || [])
  }

  // 逐路径判定
  for (const ch of changes) {
    result.files += 1
    result.counts[ch.status] = (result.counts[ch.status] || 0) + 1
    const paths = ch.newPath !== null ? [ch.oldPath, ch.newPath] : [ch.oldPath]
    for (const filePath of paths) {
      const reason = evaluate(filePath, laneName, mode, workorderId, workorderAllow, forbid, globalForbid, generated, exceptions)
      if (reason) result.violations.push({ status: ch.status, path: filePath, reason })
    }
  }

  result.ok = result.violations.length === 0
  emit(result, opts.json)
  process.exit(result.ok ? 0 : 1)
}

function evaluate(filePath, laneName, mode, workorderId, workorderAllow, forbid, globalForbid, generated, exceptions) {
  const norm = filePath.replace(/\\/g, '/')
  if (matches(globalForbid, norm)) return '命中 globalForbid（仓库级禁止路径）'
  if (laneName !== 'integration' && generated.includes(norm)) {
    return '生成产物：禁止手改，仅 Integration 可经生成器 --write 重建'
  }
  if (matches(forbid, norm)) return `命中 lane '${laneName}' 的 forbid（禁止路径）`
  if (mode === 'workorder') {
    if (matches(workorderAllow, norm)) return null
    return `不在工单 '${workorderId}' 白名单（lane '${laneName}' 精确允许范围）`
  }
  const exc = exceptions.find((e) => e.re.test(norm))
  if (exc) {
    return '唯一工作单例外路径（当前未授权任何工作单；需通过 workorder 白名单授权）'
  }
  if (matches(workorderAllow, norm)) return null
  return `不属于 lane '${laneName}' 的允许路径`
}

function emit(result, json) {
  if (json) {
    const payload = {
      ok: result.ok,
      mode: result.mode,
      lane: result.lane,
      workorder: result.workorder,
      pending: result.pending,
      base: result.base,
      head: result.head,
      diverged: result.diverged,
      dirty: result.dirty,
      files: result.files,
      counts: result.counts,
      violations: result.violations,
    }
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  const short = (s) => (s ? s.slice(0, 12) : null)
  const woTag = result.mode === 'workorder' ? ` workorder=${result.workorder}${result.pending ? ` pending=${result.pending}` : ''}` : ''
  console.log(`scope-check mode=${result.mode} lane=${result.lane}${woTag} base=${short(result.base)} head=${short(result.head)} files=${result.files} counts=${JSON.stringify(result.counts)}`)
  if (result.dirty.length > 0) {
    console.log(`VIOLATION: 工作树不干净（${result.dirty.length} 项），拒绝静默通过:`)
    for (const line of result.dirty) console.log(`  ${line}`)
    return
  }
  if (result.diverged) {
    console.log(`VIOLATION: base ${short(result.base)} 不是 head ${short(result.head)} 的祖先（历史分叉），拒绝静默通过`)
    return
  }
  if (result.violations.length > 0) {
    console.log(`VIOLATION: ${result.violations.length} 个文件越界:`)
    for (const v of result.violations) {
      console.log(`  [${v.status}] ${v.path}`)
      console.log(`        ${v.reason}`)
    }
    return
  }
  if (result.mode === 'workorder' && result.pending > 0) {
    console.log(`OK: 全部变更均属于工单 '${result.workorder}' 白名单（该工单尚有 ${result.pending} 个待定路径未回填，相关目录变更将被拒绝）`)
    return
  }
  console.log('OK: 全部变更均属于允许范围')
}

main()
