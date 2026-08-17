#!/usr/bin/env node
/**
 * scope-check.mjs — 四轨协作变更范围门禁（只读，绝不修改工作树）
 *
 * 用法（cwd 可为任意位置，--repo 指向仓库根）：
 *   node scripts/collaboration/scope-check.mjs \
 *     --lane <backend|flutter|admin|integration> \
 *     --base <sha> [--head <sha>] [--repo <path>] [--workorder <id>] [--config <path>] [--json]
 *
 * 规则（与 scripts/collaboration/lanes.json 的 schemaVersion=1 一致）：
 *   1. 参数/状态校验：--lane 必须已知；--base 必须提供；base/head 必须可解析；
 *      base 必须是 head 的祖先（否则判定分叉，拒绝静默通过）；工作树必须干净。
 *   2. 变更清单：git diff --name-status -z -M <base> <head>（A/M/D/R/C/T…，
 *      中文/空格路径经 core.quotepath=false + NUL 分隔无损解析；重命名同时检查新旧路径）。
 *   3. 逐路径判定顺序：
 *        a. globalForbid 命中                → 越界（硬失败）
 *        b. lane != integration 且命中 generatedProducts → 越界（生成产物仅 Integration 重建）
 *        c. lane.forbid 命中                 → 越界
 *        d. lane.exceptions 命中且 --workorder ∈ workorders → 放行（唯一工作单例外）
 *        e. lane.allow 命中                  → 放行
 *        f. 其余                             → 越界
 *   4. 任一越界：列出精确文件（路径+状态+原因）并以退出码 1 结束；全部放行则退出 0。
 *   5. 本脚本只执行 git 只读命令（status/rev-parse/merge-base/diff），不写入任何文件，
 *      不修改工作树，不改 .git 引用。
 *
 * 退出码：0 = 通过；1 = 越界/分叉/脏工作树；2 = 用法或参数错误（未知 lane、缺 base、sha 不可解析）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONFIG = path.join(__dirname, 'lanes.json')

/* ── 参数解析 ─────────────────────────────────────────────── */

function parseArgs(argv) {
  const opts = { lane: null, base: null, head: null, repo: null, workorder: null, config: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => { i++; return argv[i] }
    switch (a) {
      case '--lane': opts.lane = next(); break
      case '--base': opts.base = next(); break
      case '--head': opts.head = next(); break
      case '--repo': opts.repo = next(); break
      case '--workorder': opts.workorder = next(); break
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
  node scripts/collaboration/scope-check.mjs --lane <lane> --base <sha> [--head <sha>]
      [--repo <path>] [--workorder <id>] [--config <path>] [--json]
lane: backend | flutter | admin | integration
--base: 变更起点 commit（必填）；--head: 变更终点 commit（默认 HEAD）
--workorder: 唯一工作单编号，用于放行 lanes.exceptions 中登记的例外路径
--config: lane 配置文件（默认 scripts/collaboration/lanes.json）
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

function resolveSha(repo, ref, label) {
  const r = git(repo, ['rev-parse', `${ref}^{commit}`])
  if (r.status !== 0) return null
  return r.stdout.trim()
}

/* ── glob 匹配（支持 ** / * / ?，路径用正斜杠） ─────────────── */

function globToRegExp(pattern) {
  const p = pattern.replace(/\//g, '/')
  let out = ''
  let i = 0
  while (i < p.length) {
    const ch = p[i]
    if (ch === '*') {
      if (p[i + 1] === '*') {
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
    usageError(`无法读取 lane 配置 ${configPath}: ${err.message}`)
  }
  if (!config || config.schemaVersion !== 1 || !config.lanes) {
    usageError(`lane 配置 ${configPath} 不符合 schemaVersion=1`)
  }

  // lane 校验
  if (!opts.lane) usageError('缺少 --lane')
  const lane = config.lanes[opts.lane]
  if (!lane) {
    usageError(`未知 lane '${opts.lane}'；合法 lane: ${Object.keys(config.lanes).join(', ')}`)
  }

  // base 校验
  if (!opts.base) usageError('缺少 --base（变更起点 commit）')

  const repo = opts.repo || process.cwd()
  if (!fs.existsSync(path.join(repo, '.git'))) {
    usageError(`不是 git 仓库（--repo=${repo} 下没有 .git）`)
  }

  const result = { lane: opts.lane, base: null, head: null, files: 0, counts: {}, violations: [], dirty: [], diverged: false, ok: false }

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
  const baseSha = resolveSha(repo, opts.base, 'base')
  if (!baseSha) usageError(`无法解析 base '${opts.base}'`)
  const headRef = opts.head || 'HEAD'
  const headSha = resolveSha(repo, headRef, 'head')
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
  const allow = compile(lane.allow || [])
  const forbid = compile(lane.forbid || [])
  const globalForbid = compile(config.globalForbid || [])
  const generated = config.generatedProducts || []
  const exceptions = (lane.exceptions || []).map((e) => ({ ...e, re: globToRegExp(e.path) }))

  // 逐路径判定
  for (const ch of changes) {
    result.files += 1
    result.counts[ch.status] = (result.counts[ch.status] || 0) + 1
    const paths = ch.newPath !== null ? [ch.oldPath, ch.newPath] : [ch.oldPath]
    for (const filePath of paths) {
      const reason = evaluate(filePath, lane, allow, forbid, globalForbid, generated, exceptions, opts)
      if (reason) result.violations.push({ status: ch.status, path: filePath, reason })
    }
  }

  result.ok = result.violations.length === 0
  emit(result, opts.json)
  process.exit(result.ok ? 0 : 1)
}

function evaluate(filePath, lane, allow, forbid, globalForbid, generated, exceptions, opts) {
  const norm = filePath.replace(/\\/g, '/')
  if (matches(globalForbid, norm)) return '命中 globalForbid（仓库级禁止路径）'
  if (opts.lane !== 'integration' && generated.includes(norm)) {
    return '生成产物：禁止手改，仅 Integration 可经生成器 --write 重建'
  }
  if (matches(forbid, norm)) return `命中 lane '${opts.lane}' 的 forbid（禁止路径）`
  const exc = exceptions.find((e) => e.re.test(norm))
  if (exc) {
    if (opts.workorder && exc.workorders.includes(opts.workorder)) return null
    const ids = exc.workorders.length > 0 ? exc.workorders.join(', ') : '（当前未授权任何工作单）'
    return `唯一工作单例外路径，需 --workorder 授权（已登记工作单: ${ids}）`
  }
  if (matches(allow, norm)) return null
  return `不属于 lane '${opts.lane}' 的允许路径`
}

function emit(result, json) {
  if (json) {
    const payload = {
      ok: result.ok,
      lane: result.lane,
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
  console.log(`scope-check lane=${result.lane} base=${short(result.base)} head=${short(result.head)} files=${result.files} counts=${JSON.stringify(result.counts)}`)
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
  console.log('OK: 全部变更均属于 lane 允许范围')
}

main()
