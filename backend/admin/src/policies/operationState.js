/**
 * 116g-B 写操作状态机与删除确认（纯函数）。
 *
 * 用途：
 * - reduceWriteOp：idle → submitting → succeeded | failed → idle。
 *   submitting 期间再次 start 返回 duplicate=true，调用方据此拦截双击，
 *   保证一次交互只产生一次写请求。
 * - 失败（failed）不携带成功标记：调用方必须保持弹窗与表单值，绝不展示成功提示。
 * - 成功（succeeded）携带 refreshOnce=true：调用方据此做恰好一次的确定性刷新。
 */

export const WRITE_OP_PHASE = Object.freeze({
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
})

/**
 * @param {{phase?: string}} state 当前状态
 * @param {{type: 'start'|'success'|'failure'|'dismiss', category?: string, message?: string}} event
 * @returns {{phase: string, duplicate: boolean, refreshOnce?: boolean, category?: string|null, message?: string|null}}
 */
export function reduceWriteOp(state, event) {
  const phase = state?.phase || WRITE_OP_PHASE.IDLE
  switch (event?.type) {
    case 'start':
      if (phase === WRITE_OP_PHASE.SUBMITTING) return { phase, duplicate: true }
      return { phase: WRITE_OP_PHASE.SUBMITTING, duplicate: false }
    case 'success':
      return { phase: WRITE_OP_PHASE.SUCCEEDED, duplicate: false, refreshOnce: true }
    case 'failure':
      return {
        phase: WRITE_OP_PHASE.FAILED,
        duplicate: false,
        category: event.category ?? null,
        message: event.message ?? null,
      }
    case 'dismiss':
      return { phase: WRITE_OP_PHASE.IDLE, duplicate: false }
    default:
      return { phase, duplicate: false }
  }
}

/** 删除确认用首要标识：首个列表字段的值，缺失回退记录 id，再缺失回退空串。 */
export function primaryRecordText(record, listFields) {
  const fields = listFields || []
  const first = fields[0]
  if (first && record?.[first] !== undefined && record?.[first] !== null && record?.[first] !== '') {
    return String(record[first])
  }
  if (record?.id !== undefined && record?.id !== null && record?.id !== '') {
    return String(record.id)
  }
  return ''
}

/**
 * 删除确认文案：必须包含具体资源标题与记录标识（id + 首要字段值），
 * 防止「确认删除这条记录？」这类不含标识的误触确认。
 * 首要字段值缺省时回退 listFields 首字段 / id；与 id 相同则不重复展示。
 */
export function buildDeleteConfirmText({ resourceTitle, record, primaryValue, listFields } = {}) {
  const title = resourceTitle || '该记录'
  const id = record?.id ?? ''
  const primary = primaryValue || primaryRecordText(record, listFields)
  const showPrimary = Boolean(primary) && primary !== String(id)
  const identity = `${id}${showPrimary ? `（${primary}）` : ''}`
  return `确认删除「${title}」#${identity}？该操作不可恢复。`
}
