/**
 * 116g-A 平台资源（admin 通用 CRUD）域守卫 policy（纯规则层，无 DB / 无 HTTP 副作用）。
 *
 * 职责：把「资源 key 白名单 / 字段级白名单 / 系统与危险字段不可写」收口为
 * 可单测的纯函数与常量，resource.controller.js 接入本文件做判定。
 *
 * 事实源（只读）：
 * - 合法资源 key = resource.config.js 的 RESOURCE_CONFIGS 键（model 必须存在）。
 * - 可写字段 = 该资源 config.fields 中声明的字段（声明即白名单）；
 *   未声明字段 / createOnly 在编辑模式 / readonly 服务端指派字段一律不写入。
 * - 系统字段 id / createdAt / updatedAt / lastLoginAt 与 passwordHash
 *   为危险字段：任何模式下都不可由通用 CRUD 写入。
 */

/** 危险字段（任何资源、任何模式都不可经通用 CRUD 写入）。 */
export const DANGEROUS_FIELD_NAMES = Object.freeze([
  'id',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'passwordHash',
])

/** 字段是否属于系统/危险字段（不可写）。 */
export function isDangerousFieldName(fieldName) {
  return DANGEROUS_FIELD_NAMES.includes(fieldName)
}

/** 资源 key 是否已登记（越权资源名判定）。 */
export function isKnownResourceKey(key, configIndex) {
  return Boolean(key && configIndex && Object.prototype.hasOwnProperty.call(configIndex, key))
}

/**
 * 某模式下可写字段名集合（白名单语义）：
 * - 字段必须在 config.fields 中声明（未声明字段一律不写）；
 * - 系统/危险字段剔除；
 * - virtual（计算/服务端维护）剔除；
 * - createOnly 仅创建模式可写；
 * - readonly 服务端指派：创建模式不可写（编辑模式由后端按需覆盖，通用写路径跳过）。
 * @returns {string[]} 字段名数组
 */
export function writableFieldNamesFor(config, mode) {
  const fields = Array.isArray(config?.fields) ? config.fields : []
  const names = []
  for (const field of fields) {
    if (!field || typeof field.name !== 'string') continue
    if (isDangerousFieldName(field.name)) continue
    if (field.virtual) continue
    if (field.createOnly && mode !== 'create') continue
    if (field.readonly && mode === 'create') continue
    names.push(field.name)
  }
  return names
}

/**
 * 请求体字段过滤：只保留「当前模式可写字段名」中出现在 body 的键
 * （白名单交集；未声明字段、危险字段、隐藏字段一律剔除）。
 * @returns {object} 干净的字段值映射
 */
export function pickWritableFields(config, body, mode) {
  const allowed = writableFieldNamesFor(config, mode)
  const clean = {}
  for (const name of allowed) {
    if (!Object.prototype.hasOwnProperty.call(body || {}, name)) continue
    clean[name] = body[name]
  }
  return clean
}
