/**
 * 116g-B 字段元数据消费策略（纯函数）。
 *
 * 元数据事实源 = 后端 `/admin/resource/:key/config` 下发的字段配置
 * （backend/src/modules/platform/resource.config.js，Admin 不手写镜像）。
 * 当前后端使用 createOnly / required；readonly 为契约预留，消费层必须支持。
 *
 * 规则（不推断、不镜像领域状态；未声明的元数据一律按可编辑处理）：
 * - createOnly：仅创建模式可见/可编辑；编辑模式隐藏（不展示、不提交）。
 * - readonly：服务端指派字段——创建模式隐藏（创建时不可提供）；
 *   编辑模式可见但禁用（只读呈现）。
 * - required：创建/编辑均必填（后端校验为主，前端仅体验层提示）。
 */

export const FORM_MODE = Object.freeze({
  CREATE: 'create',
  EDIT: 'edit',
})

/** 字段在该模式下是否渲染到表单（隐藏字段不进入初始值、不提交）。 */
export function isFieldVisible(field, mode) {
  if (!field) return false
  if (field.createOnly && mode === FORM_MODE.EDIT) return false
  if (field.readonly && mode === FORM_MODE.CREATE) return false
  return true
}

/** 字段在该模式下是否可编辑（readonly 恒禁用；隐藏字段自然不可编辑）。 */
export function isFieldEditable(field, mode) {
  if (!field) return false
  if (!isFieldVisible(field, mode)) return false
  if (field.readonly) return false
  return true
}

/** 字段是否必填（required 元数据直接映射；创建/编辑同口径）。 */
export function isFieldRequired(field) {
  return Boolean(field?.required)
}

/** 该模式下应渲染进表单的字段列表。 */
export function editableFormFields(fields, mode) {
  return (fields || []).filter((field) => isFieldVisible(field, mode))
}

/**
 * 编辑初始值归一化：只取当前模式可见的字段；
 * createOnly 在编辑模式被排除；readonly 在编辑模式保留（只读呈现）；
 * date 字符串截断到 YYYY-MM-DD（与后端 Date 字段口径一致）。
 */
export function normalizeInitial(record, fields, mode = FORM_MODE.EDIT) {
  const values = {}
  for (const field of fields || []) {
    if (!isFieldVisible(field, mode)) continue
    const value = record?.[field.name]
    if (field.type === 'date' && typeof value === 'string') values[field.name] = value.slice(0, 10)
    else values[field.name] = value
  }
  return values
}
