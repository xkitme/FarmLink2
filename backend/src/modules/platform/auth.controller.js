import bcrypt from 'bcryptjs'
import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { verifyAuthToken } from '../../middleware/auth.js'
import { buildPublicRegistrationData } from './auth.policy.js'
import {
  issueSession,
  listUserSessions,
  revokeAllUserSessions,
  revokeSession as revokeUserSession,
  sessionMetadata,
} from './auth-session.service.js'
import { verifyTokenClaims } from './auth-token.js'
import { resetPasswordWithCode } from './password-reset.service.js'
import { config } from '../../config/index.js'
import { setCsrfCookie, clearCsrfCookie } from '../../middleware/csrf.js'
import { hashOpaqueToken, safeHashEquals, REFRESH_ROTATION_GRACE_MS } from './auth.security.js'
import { isNativeClient } from '../../utils/client-detect.js'

/** 去除敏感字段 */
export function sanitizeUser(user) {
  if (!user) return null
  const { passwordHash, passwordChangedAt, ...rest } = user
  return rest
}

/** 设置认证相关 cookie */
function setAuthCookies(res, token, refreshToken) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api',
    maxAge: config.cookie.accessTokenMaxAge,
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/v1/auth',
    maxAge: config.cookie.refreshTokenMaxAge,
  })
  setCsrfCookie(res)
}

/** 清除认证相关 cookie */
function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/api' })
  res.clearCookie('refresh_token', { path: '/api/v1/auth' })
  clearCsrfCookie(res)
}

/** 构建登录会话返回体 */
export async function buildSession(user, req, replaceSessionId = null) {
  const session = await issueSession(user, sessionMetadata(req), replaceSessionId)
  return {
    token: session.token,
    refreshToken: session.refreshToken,
    user: sanitizeUser(user),
  }
}

/** 当前用户 — 管理台页面恢复从 cookie 读 access_token，requireAuth 已完成校验 */
export async function me(req, res) {
  ok(res, sanitizeUser(req.user))
}

/** 注册 */
export async function register(req, res) {
  const username = `${req.body.username || ''}`.trim()
  const password = `${req.body.password || ''}`
  const phone = `${req.body.phone || ''}`.trim()
  if (!username || !password) throw errors.param('用户名和密码必填')
  if (password.length < 6) throw errors.param('密码至少 6 位')

  if (await prisma.user.findUnique({ where: { username } })) {
    throw errors.param('用户名已存在')
  }
  if (phone && await prisma.user.findUnique({ where: { phone } })) {
    throw errors.param('该手机号已注册')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: buildPublicRegistrationData(req.body, passwordHash),
  })
  ok(res, await buildSession(user, req), '注册成功')
}

/** 登录（账号密码，后端校验） */
export async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) throw errors.param('请输入用户名和密码')

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw errors.param('用户名或密码错误')
  }
  if (user.status !== 1) throw errors.forbidden('账号已被禁用')

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  if (isNativeClient(req)) {
    // Capacitor 原生壳：保持 Bearer token 响应 + 30 天 refresh JWT，不设 cookie
    const session = await issueSession(user, sessionMetadata(req))
    ok(res, { token: session.token, refreshToken: session.refreshToken, user: sanitizeUser(user) }, '登录成功')
  } else {
    // 管理台浏览器：HttpOnly cookie + 7 天 refresh JWT（与 cookie Max-Age 对齐）
    const session = await issueSession(user, sessionMetadata(req), null, config.jwt.refreshExpiresInBrowser)
    setAuthCookies(res, session.token, session.refreshToken)
    ok(res, { user: sanitizeUser(user) }, '登录成功')
  }
}

/** 忘记密码：使用管理员生成的一次性重置码 */
export async function resetPassword(req, res) {
  await resetPasswordWithCode({
    username: req.body.username,
    resetCode: req.body.resetCode,
    newPassword: req.body.newPassword,
  })
  ok(res, null, '密码已重置，请使用新密码登录')
}

/** 刷新 Token */
export async function refresh(req, res) {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken
  if (!refreshToken) throw errors.param('缺少 refreshToken')

  let sessionUser
  try {
    // 浏览器客户端允许 rotation-revoked session 通过（并发 refresh grace）
    // Capacitor 原生壳保持严格：revoked 的 session 直接拒绝
    const verifyOpts = isNativeClient(req) ? {} : { allowRevokedForRotation: true }
    sessionUser = await verifyAuthToken(refreshToken, 'refresh', verifyOpts)
  } catch (e) {
    if (e.name === 'BusinessError') throw e
    throw errors.unauthorized('refreshToken 无效或已过期')
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!user) throw errors.unauthorized()

  // 并发 refresh：verifyAuthToken 可能允许 rotation-revoked session 通过
  // 这里负责 CAS 消费一次性 grace，并确保不满足条件的请求被拒绝
  let replaceId = sessionUser.sessionId
  if (replaceId) {
    const existing = await prisma.authSession.findUnique({ where: { id: replaceId } })
    if (!existing) throw errors.unauthorized('refreshToken 已失效')

    if (existing.revokedAt) {
      // session 在 verifyAuthToken 后被另一个并发 refresh 撤销
      // 必须同时满足：hash 匹配、rotation 标记（revokedAt==lastUsedAt）、5s 时间窗
      if (!safeHashEquals(existing.refreshTokenHash, hashOpaqueToken(refreshToken))) {
        throw errors.unauthorized('refreshToken 已失效')
      }
      if (existing.revokedAt.getTime() !== existing.lastUsedAt.getTime()) {
        throw errors.unauthorized('refreshToken 已失效')
      }
      if (Math.abs(Date.now() - existing.revokedAt.getTime()) > REFRESH_ROTATION_GRACE_MS) {
        throw errors.unauthorized('refreshToken 已失效')
      }
      const consumed = await prisma.authSession.updateMany({
        where: {
          id: replaceId,
          revokedAt: existing.revokedAt,
          lastUsedAt: existing.lastUsedAt,
        },
        data: { lastUsedAt: new Date(Date.now() + 1000) },
      })
      if (consumed.count !== 1) throw errors.unauthorized('refreshToken 已失效')
      replaceId = null // grace 已消费，跳过 issueSession 中的 revoke 直接新建
    }
    // 如果 !existing.revokedAt：session 仍活跃，保留 replaceId 由 issueSession 做正常轮换
  }

  if (isNativeClient(req)) {
    const session = await issueSession(user, sessionMetadata(req), replaceId)
    ok(res, { token: session.token, refreshToken: session.refreshToken })
  } else {
    const session = await issueSession(user, sessionMetadata(req), replaceId, config.jwt.refreshExpiresInBrowser, true)
    setAuthCookies(res, session.token, session.refreshToken)
    ok(res, { user: sanitizeUser(user) })
  }
}

/** 退出当前设备 */
export async function logout(req, res) {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken || ''
  let userId = req.user?.id
  let sessionId = req.user?.sessionId

  if (refreshToken) {
    try {
      const claims = verifyTokenClaims(refreshToken, 'refresh')
      if (!claims.sid || !claims.id) throw errors.unauthorized()
      userId = Number(claims.id)
      sessionId = `${claims.sid}`
    } catch (error) {
      if (!req.user) throw errors.unauthorized('退出凭据无效或已过期')
    }
  }

  if (!userId || !sessionId) throw errors.unauthorized()
  await revokeUserSession(userId, sessionId)
  clearAuthCookies(res)
  ok(res, null, '已退出登录')
}

/** 当前用户的有效设备会话 */
export async function sessions(req, res) {
  ok(res, await listUserSessions(req.user.id, req.user.sessionId))
}

/** 撤销指定设备会话 */
export async function revokeSession(req, res) {
  const count = await revokeUserSession(req.user.id, `${req.params.id || ''}`)
  if (!count) throw errors.notFound('会话不存在或已失效')
  ok(res, null, '设备会话已退出')
}

/** 撤销当前账号全部设备会话 */
export async function revokeAllSessions(req, res) {
  const count = await revokeAllUserSessions(req.user.id)
  ok(res, { count }, '全部设备会话已退出')
}
