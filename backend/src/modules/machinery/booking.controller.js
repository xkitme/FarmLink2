import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'
import {
  areDateRangesOverlapping,
  canManageBooking,
  isKnownBookingStatus,
} from './booking.policy.js'

const SERVICE_INTERVAL = 250   // 小时/次：常规保养
const OVERHAUL_INTERVAL = 2000 // 小时/次：大修

// ── 预约租赁 ────────────────────────────────

/** 预约农机 */
export async function bookingCreate(req, res) {
  const { machineryId, startDate, endDate, remark } = req.body
  if (!machineryId || !startDate || !endDate) throw errors.param('请选择农机与起止日期')

  const machine = await prisma.machinery.findUnique({ where: { id: Number(machineryId) } })
  if (!machine || machine.status !== 1) throw errors.notFound('农机不存在或不可租')
  if (machine.ownerId === req.user.id) throw errors.param('不能预约自己的农机')

  const s = new Date(startDate)
  const e = new Date(endDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) throw errors.param('预约日期格式不合法')
  if (e < s) throw errors.param('结束日期不能早于开始日期')

  // 时间冲突：同机未取消（PENDING/CONFIRMED）的预约在重叠时段内拒绝，防止一机双约
  const overlaps = await prisma.machineryBooking.findMany({
    where: { machineryId: machine.id, status: { in: ['PENDING', 'CONFIRMED'] } },
    select: { startDate: true, endDate: true },
  })
  if (overlaps.some((b) => areDateRangesOverlapping(s, e, b.startDate, b.endDate))) {
    throw errors.param('该时段已有预约，请更换时间')
  }

  const days = Math.max(1, Math.ceil((e - s) / 86400000) + 1)
  const totalAmount = Number((machine.dailyPrice * days).toFixed(2))

  const booking = await prisma.machineryBooking.create({
    data: {
      machineryId: machine.id,
      renterId: req.user.id,
      startDate: s,
      endDate: e,
      totalAmount,
      status: 'PENDING',
      remark: remark || null,
    },
  })
  ok(res, { ...booking, days, deposit: machine.deposit }, '预约已提交，等待机主确认')
}

/** 预约记录（role=renter 承租 / owner 机主） */
export async function bookingList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  let where
  if (req.query.role === 'owner') {
    const myMachines = await prisma.machinery.findMany({
      where: { ownerId: req.user.id }, select: { id: true },
    })
    where = { machineryId: { in: myMachines.map((m) => m.id) } }
  } else {
    where = { renterId: req.user.id }
  }
  if (req.query.status) where.status = req.query.status

  const [rows, total] = await Promise.all([
    prisma.machineryBooking.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.machineryBooking.count({ where }),
  ])
  const ids = [...new Set(rows.map((b) => b.machineryId))]
  const machines = await prisma.machinery.findMany({ where: { id: { in: ids } } })
  const mmap = Object.fromEntries(machines.map((m) => [m.id, m]))
  const records = rows.map((b) => ({
    ...b,
    machinery: mmap[b.machineryId]
      ? { id: mmap[b.machineryId].id, machineName: mmap[b.machineryId].machineName, machineType: mmap[b.machineryId].machineType }
      : null,
  }))
  okPage(res, { records, total, pageNum, pageSize })
}

/** 更新预约状态 */
export async function bookingStatus(req, res) {
  const id = Number(req.params.id)
  const { status } = req.body
  if (!isKnownBookingStatus(status)) throw errors.param('状态不合法')

  const booking = await prisma.machineryBooking.findUnique({ where: { id } })
  if (!booking) throw errors.notFound('预约不存在')
  const machine = await prisma.machinery.findUnique({ where: { id: booking.machineryId } })
  if (!canManageBooking(req.user, booking, machine)) {
    throw errors.forbidden('无权操作该预约')
  }
  const updated = await prisma.machineryBooking.update({ where: { id }, data: { status } })
  ok(res, updated, '预约状态已更新')
}

// ── 作业轨迹记录 ────────────────────────────

/** 上报作业轨迹 */
export async function trackReport(req, res) {
  const { machineryId, workDate, trackPoints, workArea, durationHours } = req.body
  if (!machineryId) throw errors.param('请指定农机')
  const machine = await prisma.machinery.findUnique({ where: { id: Number(machineryId) } })
  if (!machine) throw errors.notFound('农机不存在')

  const dur = Number(durationHours) || 0
  const track = await prisma.machineryTrack.create({
    data: {
      machineryId: Number(machineryId),
      operatorId: req.user.id,
      workDate: workDate ? new Date(workDate) : new Date(),
      trackPoints: trackPoints ? JSON.stringify(trackPoints) : null,
      workArea: Number(workArea) || 0,
      durationHours: dur,
    },
  })
  // 累计使用时长
  if (dur > 0) {
    await prisma.machinery.update({
      where: { id: machine.id },
      data: { totalHours: { increment: Math.round(dur) } },
    })
  }
  ok(res, track, '作业轨迹已记录')
}

/** 轨迹列表 */
export async function trackList(req, res) {
  const where = {}
  if (req.query.machineryId) where.machineryId = Number(req.query.machineryId)
  else where.operatorId = req.user.id
  const rows = await prisma.machineryTrack.findMany({
    where, orderBy: { workDate: 'desc' }, take: 50,
  })
  ok(res, rows.map((t) => ({ ...t, trackPoints: parseJson(t.trackPoints, []) })))
}

// ── 维保提醒 ────────────────────────────────

/** 维保提醒（基于累计使用时长预测） */
export async function maintainRemind(req, res) {
  const machines = await prisma.machinery.findMany({ where: { ownerId: req.user.id } })
  const reminders = machines.map((m) => {
    const h = m.totalHours
    const sinceService = h % SERVICE_INTERVAL
    const nextService = h - sinceService + SERVICE_INTERVAL
    const serviceRemain = nextService - h
    const sinceOverhaul = h % OVERHAUL_INTERVAL
    const nextOverhaul = h - sinceOverhaul + OVERHAUL_INTERVAL
    return {
      machineryId: m.id,
      machineName: m.machineName,
      totalHours: h,
      nextServiceHours: nextService,
      serviceRemainHours: serviceRemain,
      nextOverhaulHours: nextOverhaul,
      level: serviceRemain <= 30 ? 'DUE' : 'OK',
      advice: serviceRemain <= 30
        ? `距下次常规保养仅剩约 ${serviceRemain} 小时作业量，建议尽快保养（更换机油、滤芯，检查皮带）。`
        : `运行状况正常，距下次保养约 ${serviceRemain} 小时作业量。`,
    }
  })
  ok(res, reminders)
}

// ── 故障 AI 诊断 ──

const FAULT_RULES = [
  { keys: ['启动', '打不着', '不着火', '无法启动'], causes: ['电瓶电量不足', '燃油不足或油路堵塞', '启动马达故障'],
    advice: '先检查电瓶电压与油量，清理油路滤芯；仍无法启动则检查启动马达与保险丝。' },
  { keys: ['黑烟', '冒黑烟'], causes: ['空气滤清器堵塞', '喷油器雾化不良', '负荷过大'],
    advice: '清洗或更换空气滤清器，检查喷油器，适当减小作业负荷。' },
  { keys: ['蓝烟', '烧机油'], causes: ['活塞环磨损', '气门油封老化', '机油加注过量'],
    advice: '检查机油液位，磨损件需到农机维修点检修更换。' },
  { keys: ['过热', '水温', '开锅'], causes: ['冷却液不足', '水箱散热片堵塞', '风扇皮带松动'],
    advice: '补充冷却液，清理水箱散热片，调整或更换风扇皮带。' },
  { keys: ['异响', '响声', '噪音'], causes: ['轴承磨损', '传动部件松动', '润滑不足'],
    advice: '停机检查传动部位，补充润滑油，松动部件及时紧固。' },
  { keys: ['液压', '无力', '举升', '提升'], causes: ['液压油不足', '液压泵磨损', '油路漏油'],
    advice: '检查液压油位与油路密封，必要时检修液压泵。' },
  { keys: ['漏油', '渗油'], causes: ['密封垫老化', '油管接头松动', '壳体裂纹'],
    advice: '紧固油管接头，更换老化密封垫，壳体裂纹需专业焊修。' },
]

/** 农机故障诊断 */
export async function faultDiagnose(req, res) {
  const { machineType, symptom } = req.body
  if (!symptom || !symptom.trim()) throw errors.param('请描述故障现象')

  const hit = FAULT_RULES.find((r) => r.keys.some((k) => symptom.includes(k)))
  const result = hit
    ? { possibleCauses: hit.causes, advice: hit.advice, matched: true }
    : {
        possibleCauses: ['故障现象描述不够明确，无法精准定位'],
        advice: '建议补充故障的具体表现（如声音、烟色、是否能启动等），或联系就近农机维修点检查。',
        matched: false,
      }
  ok(res, {
    machineType: machineType || '通用农机',
    symptom,
    ...result,
    tip: '本诊断仅供参考；复杂故障请联系专业维修人员。',
  }, '诊断完成')
}
