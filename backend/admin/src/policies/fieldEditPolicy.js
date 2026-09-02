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

/**
 * 系统/服务端维护字段（Admin 侧防御名单，与后端 resource.policy 的
 * DANGEROUS_FIELD_NAMES 同口径）：即使后端 config 意外下发，前端也绝不提交。
 * Admin 不据此推断领域状态，仅作写路径的最后一层硬防线。
 */
export const SYSTEM_MAINTAINED_FIELD_NAMES = Object.freeze([
  'id',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'passwordHash',
])

/** 字段名是否系统维护（服务端指派，前端不得提交）。 */
export function isSystemMaintainedFieldName(name) {
  return SYSTEM_MAINTAINED_FIELD_NAMES.includes(name)
}

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

/**
 * 提交体构建（116g-B 整改 #3，ResourcePage 真实使用）：
 * - 只提交当前模式「可见且可编辑」的字段；
 * - readonly 任何模式都永不提交（服务端维护字段）；
 * - createOnly 只在创建模式提交，编辑模式永不提交（表单里根本不渲染）；
 * - 隐藏字段与上一次弹窗残留值（values 中的多余键）一律不进入请求 body。
 */
export function buildSubmitPayload(values, fields, mode = FORM_MODE.EDIT) {
  const payload = {}
  const source = values || {}
  for (const field of fields || []) {
    if (!field || !isFieldVisible(field, mode)) continue
    if (!isFieldEditable(field, mode)) continue
    if (!(field.name in source)) continue
    if (isSystemMaintainedFieldName(field.name)) continue
    payload[field.name] = source[field.name]
  }
  return payload
}
