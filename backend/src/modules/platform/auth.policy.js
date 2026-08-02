import { ROLES } from '../../config/index.js'

function optionalText(value) {
  const text = `${value ?? ''}`.trim()
  return text || null
}

/**
 * 公开注册的唯一可信写入策略。
 * 客户端即使提交 role/regionCode/villageName/status，也不会进入持久化数据。
 */
export function buildPublicRegistrationData(body, passwordHash) {
  const username = `${body?.username ?? ''}`.trim()
  const nickname = optionalText(body?.nickname ?? body?.displayName)

  return {
    username,
    passwordHash,
    nickname: nickname || username,
    phone: optionalText(body?.phone),
    role: ROLES.FARMER,
    regionCode: null,
    villageName: null,
  }
}
