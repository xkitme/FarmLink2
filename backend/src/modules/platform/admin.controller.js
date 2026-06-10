import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'
import { invalidateApiSwitchCache, rateLimitPolicies, rateLimitSnapshot } from '../../middleware/apiControl.js'
import { RESOURCE_CONFIGS, RESOURCE_GROUPS } from './resource.config.js'

function switchWhere(query) {
  const where = {}
  if (query.category) where.category = String(query.category)
  if (query.enabled !== undefined) where.enabled = String(query.enabled) === 'true'
  if (query.keyword) {
    where.OR = [
      { key: { contains: String(query.keyword) } },
      { name: { contains: String(query.keyword) } },
      { description: { contains: String(query.keyword) } },
    ]
  }
  return where
}

/** API 开关列表 */
export async function apiSwitchList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = switchWhere(req.query)
  const [records, total] = await Promise.all([
    prisma.apiSwitch.findMany({ where, orderBy: [{ category: 'asc' }, { id: 'asc' }], skip, take }),
    prisma.apiSwitch.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}

/** API 开关分类 */
export async function apiSwitchCategories(req, res) {
  const rows = await prisma.apiSwitch.findMany({ select: { category: true } })
  ok(res, [...new Set(rows.map((r) => r.category))].filter(Boolean).sort())
}

/** 新增 API 开关 */
export async function apiSwitchCreate(req, res) {
  const { key, name, category, description, enabled } = req.body
  if (!key || !name || !category) throw errors.param('key、name、category 必填')
  const created = await prisma.apiSwitch.create({
    data: { key, name, category, description: description || null, enabled: enabled !== false },
  })
  invalidateApiSwitchCache()
  ok(res, created, 'API 开关已创建')
}

/** 更新 API 开关 */
export async function apiSwitchUpdate(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.apiSwitch.findUnique({ where: { id } })
  if (!exist) throw errors.notFound('API 开关不存在')
  const data = {}
  for (const field of ['key', 'name', 'category', 'description']) {
    if (req.body[field] !== undefined) data[field] = req.body[field]
  }
  if (req.body.enabled !== undefined) data.enabled = Boolean(req.body.enabled)
  const updated = await prisma.apiSwitch.update({ where: { id }, data })
  invalidateApiSwitchCache()
  ok(res, updated, 'API 开关已更新')
}

/** 快速切换 API 开关 */
export async function apiSwitchToggle(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.apiSwitch.findUnique({ where: { id } })
  if (!exist) throw errors.notFound('API 开关不存在')
  const enabled = req.body.enabled === undefined ? !exist.enabled : Boolean(req.body.enabled)
  const updated = await prisma.apiSwitch.update({ where: { id }, data: { enabled } })
  invalidateApiSwitchCache()
  ok(res, updated, enabled ? '功能已开启' : '功能已关闭')
}

/** 删除 API 开关 */
export async function apiSwitchRemove(req, res) {
  const id = Number(req.params.id)
  await prisma.apiSwitch.delete({ where: { id } })
  invalidateApiSwitchCache()
  ok(res, null, 'API 开关已删除')
}

/** 操作日志列表 */
export async function operationLogList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.query.module) where.module = String(req.query.module)
  if (req.query.userId) where.userId = Number(req.query.userId)
  if (req.query.keyword) where.action = { contains: String(req.query.keyword) }
  const [rows, total] = await Promise.all([
    prisma.operationLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.operationLog.count({ where }),
  ])
  const records = rows.map((row) => ({ ...row, detail: parseJson(row.detail, row.detail) }))
  okPage(res, { records, total, pageNum, pageSize })
}

/** 限流计数快照 */
export async function rateLimitStatus(req, res) {
  ok(res, {
    policies: rateLimitPolicies(),
    counters: rateLimitSnapshot(),
  })
}

/** 初始化数据概览 */
export async function seedDataSummary(req, res) {
  const modelCountCache = new Map()

  async function countResource(resourceKey) {
    const config = RESOURCE_CONFIGS[resourceKey]
    if (!config?.model || !prisma[config.model]) {
      return {
        key: resourceKey,
        title: config?.title || resourceKey,
        model: config?.model || '-',
        count: null,
        ready: false,
      }
    }
    if (!modelCountCache.has(config.model)) {
      modelCountCache.set(config.model, await prisma[config.model].count())
    }
    const count = modelCountCache.get(config.model)
    return {
      key: resourceKey,
      title: config.title,
      model: config.model,
      count,
      ready: count > 0,
    }
  }

  const groups = []
  for (const group of RESOURCE_GROUPS) {
    const resources = []
    for (const resourceKey of group.resources) {
      resources.push(await countResource(resourceKey))
    }
    groups.push({
      key: group.key,
      title: group.title,
      resources,
      readyCount: resources.filter((item) => item.ready).length,
    })
  }

  const [apiSwitchCount, enabledSwitchCount, operationLogCount] = await Promise.all([
    prisma.apiSwitch.count(),
    prisma.apiSwitch.count({ where: { enabled: true } }),
    prisma.operationLog.count(),
  ])

  ok(res, {
    generatedAt: new Date().toISOString(),
    summary: {
      groupCount: groups.length,
      resourceCount: groups.reduce((sum, group) => sum + group.resources.length, 0),
      recordCount: [...modelCountCache.values()].reduce((sum, count) => sum + count, 0),
      apiSwitchCount,
      enabledSwitchCount,
      operationLogCount,
    },
    groups,
    commands: {
      installAll: 'cd backend && npm run install:all',
      migrate: 'cd backend && npm run db:push',
      seed: 'cd backend && npm run db:seed',
      start: 'start.bat',
    },
    files: {
      seedScript: 'backend/seeds/index.js',
      schema: 'backend/prisma/schema.prisma',
      database: 'backend/prisma/dev.db',
    },
    notes: [
      '初始化数据用于快速填充平台基础用户、业务样例、API 开关与知识库条目。',
      '执行初始化命令前请确认当前数据是否需要保留。',
    ],
  })
}
