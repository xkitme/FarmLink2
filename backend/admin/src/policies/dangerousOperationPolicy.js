/**
 * 116x-60pct 危险操作判定策略（纯函数，无 DOM / 无副作用）。
 *
 * 116g-B 已落地写操作协调器（createWriteOperation）与删除二次确认文案；
 * 本文件把「什么操作属于危险操作、危险操作何时必须禁用/二次确认」收口为
 * 可单测的统一判定，ResourcePage 与未来批量操作共用同一实现。
 *
 * 规则：
 * - 危险操作 = 不可恢复写：删除（delete）。批量删除（batch-delete）为预留
 *   类别（当前 ResourcePage 无批量 UI，不强行新增批量系统）。
 * - 危险操作必须二次确认（requiresConfirmation = true）。
 * - 危险操作在以下状态必须 disabled 且给出原因：
 *     · config 未就绪（配置加载中/加载失败/尚无配置）——避免无配置写；
 *     · 表格处于错误/无权限/API 关闭态——错误态下不允许危险写；
 *     · 写操作 busy——防双击。
 * - 判定为「可执行」时调用方才允许发起写请求；判定 disabled 时绝不调用 API。
 */

/** 危险操作类型白名单（集中登记；未登记动作一律不是危险操作）。 */
export const DANGEROUS_ACTIONS = Object.freeze({
  DELETE: 'delete',
  BATCH_DELETE: 'batch-delete',
})

/** 是否登记过的危险操作（未登记 → 非危险，无需二次确认）。 */
export function isDangerousAction(actionType) {
  return Object.values(DANGEROUS_ACTIONS).includes(actionType)
}

/** 危险操作一律必须二次确认（当前仅删除；批量删除预留同规则）。 */
export function requiresConfirmation(actionType) {
  return isDangerousAction(actionType)
}

/**
 * 危险操作可用性判定。
 * @param {object} input
 * @param {string} input.actionType 危险操作类型（DANGEROUS_ACTIONS 之一）
 * @param {boolean} input.configReady 资源配置是否加载成功（false = 加载中/失败/尚无）
 * @param {string|null} input.tableErrorCategory 表格错误分类（null = 无错误）
 * @param {boolean} input.busy 写操作是否进行中
 * @param {number} input.selectionCount 批量选中数量（batch-delete 用；行删除忽略）
 * @returns {{disabled: boolean, reason: string|null}}
 */
export function dangerousActionAvailability({
  actionType = DANGEROUS_ACTIONS.DELETE,
  configReady = true,
  tableErrorCategory = null,
  busy = false,
  selectionCount = 0,
} = {}) {
  if (!isDangerousAction(actionType)) {
    return { disabled: false, reason: null }
  }
  if (!configReady) {
    return { disabled: true, reason: '资源配置未就绪，危险操作不可用' }
  }
  if (busy) {
    return { disabled: true, reason: '操作进行中，请勿重复提交' }
  }
  if (tableErrorCategory === 'forbidden') {
    return { disabled: true, reason: '无权限执行该操作' }
  }
  if (tableErrorCategory === 'api-disabled') {
    return { disabled: true, reason: '功能已关闭，危险操作不可用' }
  }
  if (tableErrorCategory === 'network' || tableErrorCategory === 'server') {
    return { disabled: true, reason: '当前数据加载异常，请重试后再操作' }
  }
  if (tableErrorCategory) {
    return { disabled: true, reason: '当前表格处于错误态，危险操作不可用' }
  }
  if (actionType === DANGEROUS_ACTIONS.BATCH_DELETE && selectionCount <= 0) {
    return { disabled: true, reason: '请先勾选要删除的记录' }
  }
  return { disabled: false, reason: null }
}
