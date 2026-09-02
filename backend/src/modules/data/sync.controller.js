import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'
import {
  isValidTableName,
  isReplayTable,
  normalizeTableName,
  serverOwnershipFor,
} from './sync.policy.js'

function parseItems(body) {
  if (Array.isArray(body?.items)) return body.items
  if (Array.isArray(body)) return body
  return [body]
}

function getPayload(item) {
  return item.payload || item.payloadJson || item.data || {}
}

function payloadDate(value, fallback = new Date()) {
  return value ? new Date(value) : fallback
}

async function conflictByLocalUuid(model, localUuid, clientUpdatedAt) {
  if (!localUuid) return null
  const exist = await model.findFirst({ where: { localUuid } })
  if (!exist || !clientUpdatedAt || !exist.updatedAt) return exist
  return exist.updatedAt > new Date(clientUpdatedAt) ? { conflict: true, exist } : exist
}

async function replayLandPlot(item, ownership) {
  const payload = getPayload(item)
  const operation = String(item.operation || 'INSERT').toUpperCase()
  const localUuid = item.localUuid || payload.localUuid
  if (operation === 'DELETE') {
    if (localUuid) await prisma.landPlot.deleteMany({ where: { localUuid, userId: ownership.userId } })
    return { replayed: true }
  }
  const exist = await conflictByLocalUuid(prisma.landPlot, localUuid, payload.updatedAt)
  if (exist?.conflict) return { conflict: true, reason: '服务端地块数据较新' }
  const data = {
    userId: ownership.userId,
    plotName: payload.plotName || payload.name || '未命名地块',
    areaMu: Number(payload.areaMu) || 0,
    boundaryGeojson: payload.boundaryGeojson ? String(payload.boundaryGeojson) : null,
    cropType: payload.cropType || null,
    soilType: payload.soilType || null,
    // regionCode 以服务端会话为准：普通用户不得伪造跨村/跨区数据归属
    regionCode: ownership.regionCode,
    localUuid: localUuid || null,
  }
  if (exist) await prisma.landPlot.update({ where: { id: exist.id }, data })
  else await prisma.landPlot.create({ data })
  return { replayed: true }
}

async function replayFarmRecord(item, ownership) {
  const payload = getPayload(item)
  const operation = String(item.operation || 'INSERT').toUpperCase()
  const localUuid = item.localUuid || payload.localUuid
  if (operation === 'DELETE') {
    if (localUuid) await prisma.farmRecord.deleteMany({ where: { localUuid, userId: ownership.userId } })
    return { replayed: true }
  }
  const exist = await conflictByLocalUuid(prisma.farmRecord, localUuid, payload.updatedAt)
  if (exist?.conflict) return { conflict: true, reason: '服务端农事记录较新' }
  const data = {
    userId: ownership.userId,
    plotId: payload.plotId ? Number(payload.plotId) : null,
    recordType: payload.recordType || '其他',
    cropType: payload.cropType || null,
    content: payload.content || null,
    cost: Number(payload.cost) || 0,
    images: payload.images ? JSON.stringify(payload.images) : null,
    recordDate: payloadDate(payload.recordDate),
    localUuid: localUuid || null,
  }
  if (exist) await prisma.farmRecord.update({ where: { id: exist.id }, data })
  else await prisma.farmRecord.create({ data })
  return { replayed: true }
}

async function replayDisasterReport(item, ownership) {
  const payload = getPayload(item)
  const operation = String(item.operation || 'INSERT').toUpperCase()
  const localUuid = item.localUuid || payload.localUuid
  if (operation === 'DELETE') {
    if (localUuid) await prisma.disasterReport.deleteMany({ where: { localUuid, userId: ownership.userId } })
    return { replayed: true }
  }
  const exist = localUuid ? await prisma.disasterReport.findFirst({ where: { localUuid } }) : null
  const data = {
    userId: ownership.userId,
    disasterType: payload.disasterType || '其他',
    plotId: payload.plotId ? Number(payload.plotId) : null,
    affectedArea: Number(payload.affectedArea) || 0,
    estimatedLoss: Number(payload.estimatedLoss) || 0,
    description: payload.description || null,
    images: payload.images ? JSON.stringify(payload.images) : null,
    location: payload.location ? JSON.stringify(payload.location) : null,
    aiLossLevel: payload.aiLossLevel || '轻',
    status: payload.status || 'REPORTED',
    // regionCode 以服务端会话为准：普通用户不得伪造跨村/跨区数据归属
    regionCode: ownership.regionCode,
    localUuid: localUuid || null,
  }
  if (exist) await prisma.disasterReport.update({ where: { id: exist.id }, data })
  else await prisma.disasterReport.create({ data })
  return { replayed: true }
}

async function replay(item, ownership) {
  const tableName = normalizeTableName(item.tableName || item.table)
  if (!isValidTableName(tableName)) {
    return { replayed: false, reason: `非法同步表名：${String(item.tableName || item.table).slice(0, 40)}` }
  }
  if (!isReplayTable(tableName)) {
    return { replayed: false, reason: `非法同步表：${tableName}（仅支持 ${['land_plot', 'farm_record', 'disaster_report'].join('/')} 回放）` }
  }
  if (tableName === 'land_plot') return replayLandPlot(item, ownership)
  if (tableName === 'farm_record') return replayFarmRecord(item, ownership)
  if (tableName === 'disaster_report') return replayDisasterReport(item, ownership)
  return { replayed: false }
}

/** 数据同步：仅 replay 白名单表真实回放，非法表名/非白名单表拒绝（不静默成功）。 */
export async function syncData(req, res) {
  const rawItems = parseItems(req.body)
  if (!rawItems.length) throw errors.param('同步队列不能为空')

  const results = []
  for (const raw of rawItems) {
    const item = {
      ...raw,
      userId: req.user.id,
      regionCode: req.user.regionCode || null,
    }
    // 所有权强制：userId/regionCode 一律取服务端会话值，忽略客户端提交的伪造字段
    const ownership = serverOwnershipFor(req.user)
    const tableName = normalizeTableName(item.tableName || item.table)
    const operation = String(item.operation || 'INSERT').toUpperCase()
    const localUuid = item.localUuid || getPayload(item).localUuid || null

    let status = 'SUCCESS'
    let detail = null
    try {
      if (!tableName) throw new Error('缺少 tableName')
      const replayResult = await replay(item, ownership)
      if (replayResult.conflict) {
        status = 'CONFLICT'
        detail = replayResult.reason
      } else if (!replayResult.replayed) {
        status = 'FAILED'
        detail = replayResult.reason || '同步失败'
      }
    } catch (err) {
      status = 'FAILED'
      detail = err.message || '同步失败'
    }

    const log = await prisma.syncLog.create({
      data: {
        userId: req.user.id,
        tableName: tableName || 'unknown',
        operation,
        localUuid,
        syncStatus: status,
        conflictDetail: detail,
      },
    })
    results.push({ id: log.id, tableName, operation, localUuid, status, detail })
  }

  ok(res, {
    total: results.length,
    success: results.filter((r) => r.status === 'SUCCESS').length,
    conflict: results.filter((r) => r.status === 'CONFLICT').length,
    failed: results.filter((r) => r.status === 'FAILED').length,
    results,
  }, '同步队列已处理')
}

/** 当前用户同步状态 */
export async function status(req, res) {
  const where = req.user.role === 'ADMIN' && req.query.userId ? { userId: Number(req.query.userId) } : { userId: req.user.id }
  const rows = await prisma.syncLog.findMany({ where, orderBy: { syncedAt: 'desc' }, take: 200 })
  const stat = rows.reduce((acc, r) => {
    acc[r.syncStatus] = (acc[r.syncStatus] || 0) + 1
    return acc
  }, {})
  ok(res, {
    total: rows.length,
    success: stat.SUCCESS || 0,
    conflict: stat.CONFLICT || 0,
    failed: stat.FAILED || 0,
    latest: rows.slice(0, 10),
  })
}

/** 同步日志分页 */
export async function logs(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.user.role !== 'ADMIN') where.userId = req.user.id
  if (req.query.syncStatus) where.syncStatus = String(req.query.syncStatus)
  if (req.query.tableName) where.tableName = normalizeTableName(req.query.tableName)
  const [records, total] = await Promise.all([
    prisma.syncLog.findMany({ where, orderBy: { syncedAt: 'desc' }, skip, take }),
    prisma.syncLog.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}
