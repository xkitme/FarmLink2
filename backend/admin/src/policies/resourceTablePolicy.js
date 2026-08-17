/**
 * 116g-B ResourceTable 状态解析与竞态判定（纯函数）。
 *
 * - resolveTableState：把加载/错误/数据源信号解析为唯一确定的状态 key，
 *   保证 loading / empty / error / unauthorized / api-disabled 互不混淆。
 * - isStaleResponse：请求序号守卫——响应回来时序号已落后于最新序号即为陈旧，
 *   必须丢弃，防止切换资源/搜索/翻页/详情之间的旧响应覆盖新状态。
 */

export const TABLE_STATE = Object.freeze({
  CONFIG_LOADING: 'config-loading',
  LIST_LOADING: 'list-loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  UNAUTHORIZED: 'unauthorized',
  API_DISABLED: 'api-disabled',
})

/**
 * @param {object} input
 * @param {boolean} input.configLoading 资源配置是否加载中
 * @param {boolean} input.listLoading 列表是否加载中
 * @param {{category?: string, message?: string}|null} input.error 最近一次加载错误
 * @param {Array} input.rows 当前列表数据
 * @param {object|null} input.config 资源配置（null 表示尚未加载成功）
 * @returns {string} 唯一状态 key（TABLE_STATE 之一）
 *
 * 优先级：错误 > 配置加载中 > 列表加载中 > 空 > 就绪。
 * 错误存在时无论 rows 是否残留都呈现错误态（不静默回退旧数据）。
 */
export function resolveTableState({ configLoading = false, listLoading = false, error = null, rows = [], config = null } = {}) {
  if (error) {
    if (error.category === 'forbidden') return TABLE_STATE.UNAUTHORIZED
    if (error.category === 'api-disabled') return TABLE_STATE.API_DISABLED
    return TABLE_STATE.ERROR
  }
  if (!config) {
    // 配置未就绪：加载中 → config-loading；否则（防御分支，正常流程不可达）→ error。
    return configLoading ? TABLE_STATE.CONFIG_LOADING : TABLE_STATE.ERROR
  }
  if (listLoading) return TABLE_STATE.LIST_LOADING
  if (!Array.isArray(rows) || rows.length === 0) return TABLE_STATE.EMPTY
  return TABLE_STATE.READY
}

/** 旧响应判定：请求序号不等于最新序号即为陈旧，结果必须丢弃。 */
export function isStaleResponse(requestSeq, latestSeq) {
  return requestSeq !== latestSeq
}
