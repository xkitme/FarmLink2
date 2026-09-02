/**
 * 116g-A 数据同步一致性 policy（纯规则层，无 DB / 无 HTTP 副作用）。
 *
 * 职责：把「replay 表白名单 / 表名合法性 / 服务端所有权强制 / localUuid 幂等」
 * 收口为可单测的纯函数与常量，sync.controller.js 接入本文件做判定。
 *
 * 事实源（只读）：
 * - 当前真正回放业务表的白名单 = land_plot / farm_record / disaster_report
 *   （与 Flutter 端 offline_sync_queue.dart `_replayTables` 一致）；
 *   白名单之外的表名一律拒绝（不允许静默记日志冒充成功）。
 * - userId / regionCode 一律以服务端会话（req.user）为准，客户端传入的
 *   userId / regionCode 字段不得覆盖服务端值（防越权伪造）。
 * - localUuid 幂等：同一 localUuid 的重复回放不产生重复业务记录。
 */

/** replay 表白名单（去 `t_` 前缀后比较；唯一事实源）。 */
export const REPLAY_TABLES = Object.freeze(['land_plot', 'farm_record', 'disaster_report'])

/** 表名合法字符（SQL 标识符安全，拒绝注入/花式串）。 */
const TABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** 归一化表名：去 `t_` 前缀 + 去空白。 */
export function normalizeTableName(raw) {
  return String(raw ?? '').trim().replace(/^t_/, '')
}

/** 表名是否属于 replay 白名单。 */
export function isReplayTable(tableName) {
  return REPLAY_TABLES.includes(normalizeTableName(tableName))
}

/** 表名是否合法（非空且为安全标识符；空表名/注入串一律非法）。 */
export function isValidTableName(tableName) {
  const name = normalizeTableName(tableName)
  return name.length > 0 && TABLE_NAME_RE.test(name)
}

/**
 * 服务端所有权强制（防伪造）：返回该条同步记录的归属字段。
 * - userId：始终取服务端会话用户 id；
 * - regionCode：始终取服务端会话 regionCode（普通用户不得伪造跨区数据）。
 * 任何客户端提交的 userId / regionCode 都不进入返回值。
 */
export function serverOwnershipFor(user) {
  return {
    userId: user?.id ?? null,
    regionCode: user?.regionCode ?? null,
  }
}

/** localUuid 是否存在（幂等键校验用）。 */
export function hasLocalUuid(item, payload) {
  const uuid = item?.localUuid || payload?.localUuid
  return typeof uuid === 'string' && uuid.trim().length > 0
}
