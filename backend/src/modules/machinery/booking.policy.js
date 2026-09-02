/**
 * 116g-A 农机预约一致性 policy（纯规则层，无 DB / 无 HTTP 副作用）。
 *
 * 职责：把「预约状态白名单 / 时间冲突 / 参与者访问边界」收口为可单测的
 * 纯函数与常量，booking.controller.js 接入本文件做判定并抛出业务错误。
 *
 * 事实源（只读）：
 * - 状态值域与 Prisma `MachineryBooking.status` 注释一致
 *   （PENDING/CONFIRMED/DONE/CANCELLED）。
 * - 参与者：renterId（承租方）/ machinery.ownerId（机主）双方可查看与操作；
 *   第三方 403。
 * - 同一台农机在同一时间段只允许一个未取消的预约（PENDING/CONFIRMED 占期，
 *   DONE 为已完成不占期、CANCELLED 不占期）。
 * - 机器不可预约条件：机器不存在 / status !== 1（已下架）/ 预约自己的农机。
 */

/** 预约状态白名单（唯一事实源；与 Prisma 注释 + resource.config.js select 同口径）。 */
export const BOOKING_STATUSES = Object.freeze([
  'PENDING',   // 待机主确认
  'CONFIRMED', // 已确认（占期）
  'DONE',      // 已完成（占期结束）
  'CANCELLED', // 已取消（不占期）
])

/** 状态是否在白名单内。 */
export function isKnownBookingStatus(status) {
  return BOOKING_STATUSES.includes(status)
}

const BOOKING_TRANSITIONS = Object.freeze({
  PENDING: Object.freeze(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: Object.freeze(['DONE', 'CANCELLED']),
  DONE: Object.freeze([]),
  CANCELLED: Object.freeze([]),
})

/**
 * 状态变更判定：目标状态必须属于白名单；同状态重复提交视为幂等成功；
 * 非白名单方向拒绝，DONE/CANCELLED 终态不允许再回退或改写。
 */
export function canTransitionBookingStatus(from, to) {
  if (!isKnownBookingStatus(from) || !isKnownBookingStatus(to)) return false
  if (from === to) return true
  return BOOKING_TRANSITIONS[from].includes(to)
}

/** 是否「同状态幂等重复」。 */
export function isIdempotentBookingStatus(from, to) {
  return from === to
}

/** 区间重叠判定（含边界：任一端点落入对方区间即重叠）。 */
export function areDateRangesOverlapping(startA, endA, startB, endB) {
  const a = startA instanceof Date ? startA : new Date(startA)
  const b = endA instanceof Date ? endA : new Date(endA)
  const c = startB instanceof Date ? startB : new Date(startB)
  const d = endB instanceof Date ? endB : new Date(endB)
  if ([a, b, c, d].some((v) => Number.isNaN(v.getTime()))) return false
  return a <= d && c <= b
}

/**
 * 预约是否占用时段（可作为冲突候选）：
 * PENDING/CONFIRMED 占期；DONE/CANCELLED 不占期。
 */
export function isBookingOccupying(status) {
  return status === 'PENDING' || status === 'CONFIRMED'
}

/**
 * 参与者视角：返回该用户对某条预约的角色。
 * @returns {'renter'|'owner'|'none'}
 */
export function bookingPartyOf(user, booking, machine) {
  if (!user || !booking) return 'none'
  if (booking.renterId === user.id) return 'renter'
  if (machine && machine.ownerId === user.id) return 'owner'
  return 'none'
}

/** 是否可查看/操作该预约（承租方或机主本人）。 */
export function canManageBooking(user, booking, machine) {
  const party = bookingPartyOf(user, booking, machine)
  return party === 'renter' || party === 'owner'
}

/** 是否可执行指定预约状态动作。 */
export function canChangeBookingStatus(user, booking, machine, targetStatus) {
  const party = bookingPartyOf(user, booking, machine)
  if (party !== 'renter' && party !== 'owner') return false
  if (targetStatus === booking.status) return true
  if (targetStatus === 'CONFIRMED') return party === 'owner'
  if (targetStatus === 'DONE') return party === 'owner'
  if (targetStatus === 'CANCELLED') return party === 'renter' || party === 'owner'
  return false
}
