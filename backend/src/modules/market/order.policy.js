/**
 * 116g-A 订单一致性 policy（纯规则层，无 DB / 无 HTTP 副作用）。
 *
 * 职责：把「订单状态白名单 / 幂等重复 / 参与者访问边界」收口为可单测的
 * 纯函数与常量，order.controller.js 接入本文件做判定并抛出业务错误；
 * 任何 UI / controller 不得在 policy 之外另建一套状态口径。
 *
 * 事实源（只读）：
 * - 状态值域与 Prisma `Order.status` 注释一致（PENDING/PAID/SHIPPED/DONE/CANCELLED）。
 * - 参与者：buyerId（买家）/ sellerId（卖家）双方可查看与操作；第三方 403。
 * - 管理端（ADMIN）经 `/admin/resource/order` 通用资源接口维护，不经本
 *   C 端状态接口（requireRole('ADMIN') 已在 platform.routes.js 保护）。
 * - 幂等：同状态重复提交返回成功且不重复执行副作用（发货/回补库存只发生一次）。
 */

/** 订单状态白名单（唯一事实源；与 Prisma 注释 + resource.config.js 的 select 同口径）。 */
export const ORDER_STATUSES = Object.freeze([
  'PENDING', // 待支付（下单成功）
  'PAID',    // 已支付
  'SHIPPED', // 已发货（生成物流单）
  'DONE',    // 已完成
  'CANCELLED', // 已取消（回补库存）
])

/** 状态是否在白名单内（非法状态判定用）。 */
export function isKnownOrderStatus(status) {
  return ORDER_STATUSES.includes(status)
}

/**
 * 状态变更判定（controller 更新状态前调用）。
 * - 目标状态必须属于白名单；
 * - 同状态重复提交（from === to）视为幂等成功，不拒绝（副作用由 controller 幂等化）。
 * 语义与现状一致：合法白名单内任意正向流转均允许，由业务侧保证方向。
 */
export function canTransitionOrderStatus(from, to) {
  if (!isKnownOrderStatus(to)) return false
  return true
}

/** 是否「同状态幂等重复」（供 controller 短路副作用：发货/取消只执行一次）。 */
export function isIdempotentRepeat(from, to) {
  return from === to
}

/**
 * 参与者访问边界：返回该用户对订单的角色视角。
 * @returns {'buyer'|'seller'|'admin'|'none'}
 *   - buyer：订单买家本人；
 *   - seller：订单卖家本人；
 *   - admin：平台管理员（管理端资源接口维护，C 端不据此放行）；
 *   - none：无关第三方（必须拒绝查看/操作）。
 */
export function orderPartyOf(user, order) {
  if (!user || !order) return 'none'
  const uid = user.id
  if (order.buyerId === uid) return 'buyer'
  if (order.sellerId === uid) return 'seller'
  if (user.role === 'ADMIN') return 'admin'
  return 'none'
}

/** 是否可查看订单（买家/卖家本人；管理员走管理端接口，此处不放行 C 端）。 */
export function canViewOrder(user, order) {
  const party = orderPartyOf(user, order)
  return party === 'buyer' || party === 'seller'
}

/** 是否可操作订单状态（与查看同边界）。 */
export function canManageOrder(user, order) {
  return canViewOrder(user, order)
}
