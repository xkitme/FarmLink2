import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'
import { invalidateApiSwitchCache, rateLimitSnapshot } from '../../middleware/apiControl.js'

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
    policies: [
      { name: 'global', limit: 100, windowSec: 60, scope: 'IP' },
      { name: 'auth-login', limit: 10, windowSec: 60, scope: 'IP' },
      { name: 'sms', limit: 5, windowSec: 3600, scope: 'IP' },
      { name: 'ai', limit: 20, windowSec: 3600, scope: '用户或IP' },
      { name: 'upload', limit: 30, windowSec: 3600, scope: '用户或IP' },
    ],
    counters: rateLimitSnapshot(),
  })
}
