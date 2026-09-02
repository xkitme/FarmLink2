import bcrypt from 'bcryptjs'
import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'
import { getResourceConfig, listResourceConfigs, RESOURCE_GROUPS } from './resource.config.js'
import {
  isDangerousFieldName,
  isKnownResourceKey,
  pickWritableFields,
} from './resource.policy.js'

// 资源 key 索引（policy 白名单判定用；模块级构建一次）
const RESOURCE_INDEX = Object.freeze(
  listResourceConfigs().reduce((acc, cfg) => {
    acc[cfg.key] = true
    return acc
  }, {}),
)

function assertResource(resource) {
  // 越权资源名：未登记的资源 key 直接拒绝（404 / 40401 / msg=管理资源不存在）
  if (!isKnownResourceKey(resource, RESOURCE_INDEX)) throw errors.notFound('管理资源不存在')
  const config = getResourceConfig(resource)
  if (!config || !prisma[config.model]) throw errors.notFound('管理资源不存在')
  return config
}

function visibleConfig(resource, config) {
  return {
    key: resource,
    title: config.title,
    listFields: config.listFields,
    searchFields: config.searchFields || [],
    fields: config.fields,
  }
}

function parseValue(field, value, mode) {
  if (value === undefined) return undefined
  if (value === '' || value === null) {
    if (mode === 'create' && field.required) {
      if (field.type === 'int' || field.type === 'float') return 0
      if (field.type === 'boolean') return false
      return ''
    }
    return null
  }
  if (field.type === 'int') return Number.parseInt(value, 10) || 0
  if (field.type === 'float') return Number(value) || 0
  if (field.type === 'boolean') return Boolean(value)
  if (field.type === 'date') return new Date(value)
  if (field.type === 'json' || field.type === 'images') return typeof value === 'string' ? value : JSON.stringify(value)
  if (field.type === 'password') return String(value)
  return String(value)
}

async function buildData(config, body, mode) {
  const data = {}
  // 字段白名单（policy）：只允许 config.fields 声明字段；危险/系统字段不可写
  const clean = pickWritableFields(config, body || {}, mode)
  for (const field of config.fields) {
    if (!(field.name in clean)) continue
    if (field.virtual || isDangerousFieldName(field.name)) continue
    if (config.model === 'user' && field.name === 'password') continue
    const parsed = parseValue(field, clean[field.name], mode)
    if (parsed !== undefined) data[field.name] = parsed
  }

  if (config.model === 'user') {
    if (mode === 'create') {
      data.passwordHash = await bcrypt.hash(body.password || '123456', 10)
    } else if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10)
    }
  }
  return data
}

function rowForClient(row) {
  if (!row) return row
  const { passwordHash, ...rest } = row
  return rest
}

function searchWhere(config, keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return {}
  const fields = config.searchFields || []
  return {
    OR: fields.map((name) => ({ [name]: { contains: kw } })),
  }
}

/** 资源清单：供管理台生成菜单/标签。 */
export async function resourceIndex(req, res) {
  ok(res, {
    groups: RESOURCE_GROUPS,
    resources: listResourceConfigs(),
  })
}

/** 单资源字段配置。 */
export async function resourceConfig(req, res) {
  const config = assertResource(req.params.resource)
  ok(res, visibleConfig(req.params.resource, config))
}

/** 通用列表。 */
export async function resourceList(req, res) {
  const config = assertResource(req.params.resource)
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = searchWhere(config, req.query.keyword)
  const model = prisma[config.model]
  const orderBy = config.orderBy || { id: 'desc' }
  const [rows, total] = await Promise.all([
    model.findMany({ where, orderBy, skip, take }),
    model.count({ where }),
  ])
  okPage(res, {
    records: rows.map(rowForClient),
    total,
    pageNum,
    pageSize,
  })
}

/** 详情。 */
export async function resourceDetail(req, res) {
  const config = assertResource(req.params.resource)
  const row = await prisma[config.model].findUnique({ where: { id: Number(req.params.id) } })
  if (!row) throw errors.notFound('记录不存在')
  ok(res, rowForClient(row))
}

/** 新增。 */
export async function resourceCreate(req, res) {
  const config = assertResource(req.params.resource)
  const data = await buildData(config, req.body || {}, 'create')
  const created = await prisma[config.model].create({ data })
  ok(res, rowForClient(created), '记录已创建')
}

/** 更新。 */
export async function resourceUpdate(req, res) {
  const config = assertResource(req.params.resource)
  const id = Number(req.params.id)
  const exist = await prisma[config.model].findUnique({ where: { id } })
  if (!exist) throw errors.notFound('记录不存在')
  const data = await buildData(config, req.body || {}, 'update')
  const updated = await prisma[config.model].update({ where: { id }, data })
  ok(res, rowForClient(updated), '记录已更新')
}

/** 删除。 */
export async function resourceRemove(req, res) {
  const config = assertResource(req.params.resource)
  const id = Number(req.params.id)
  const exist = await prisma[config.model].findUnique({ where: { id } })
  if (!exist) throw errors.notFound('记录不存在')
  await prisma[config.model].delete({ where: { id } })
  ok(res, null, '记录已删除')
}
