/**
 * 116g-B 写操作协调器与删除确认（ResourcePage 与测试共用同一实现）。
 *
 * createWriteOperation —— 消除「测试一套、页面另一套」的平行模型：
 * - ResourcePage 的提交/删除真实消费本协调器；
 * - busy 期间的重复 run 直接返回 duplicate=true，绝不触发第二次写请求；
 * - 成功只调用一次 onSuccess（组件内 = 关弹窗 + 成功提示一次 + 确定性刷新一次）；
 * - 失败只调用一次 onFailure（组件内 = 保留弹窗与表单、不弹成功、不刷新）。
 */

/**
 * @param {object} options
 * @param {(payload: any) => Promise<any>} options.perform 实际写请求（POST/PUT/DELETE）
 * @param {(result: any) => void|Promise<void>} options.onSuccess 成功副作用（恰好一次）
 * @param {(error: Error) => void|Promise<void>} options.onFailure 失败副作用（恰好一次）
 */
export function createWriteOperation({ perform, onSuccess, onFailure } = {}) {
  let busy = false
  async function run(payload) {
    if (busy) return { duplicate: true, ok: false }
    busy = true
    try {
      const result = await perform?.(payload)
      await onSuccess?.(result)
      return { duplicate: false, ok: true, result }
    } catch (error) {
      await onFailure?.(error)
      return { duplicate: false, ok: false, error }
    } finally {
      busy = false
    }
  }
  return {
    run,
    isBusy: () => busy,
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
