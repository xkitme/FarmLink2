import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../app.js'
import { signToken, signRefreshToken, verifyToken } from '../utils/jwt.js'
import { ok, created, fail, unauthorized } from '../utils/response.js'

export async function register(req, res) {
  const { phone, nickname, password } = req.body

  const exists = await prisma.user.findUnique({ where: { phone } })
  if (exists) return fail(res, '该手机号已注册')

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { id: uuidv4(), phone, nickname, passwordHash },
  })

  const token = signToken({ id: user.id, phone: user.phone })
  const refreshToken = signRefreshToken({ id: user.id })

  created(res, { token, refreshToken, user: safeUser(user) })
}

export async function login(req, res) {
  const { phone, password } = req.body

  const user = await prisma.user.findUnique({ where: { phone } })
  if (!user) return fail(res, '账号或密码错误')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return fail(res, '账号或密码错误')

  const token = signToken({ id: user.id, phone: user.phone })
  const refreshToken = signRefreshToken({ id: user.id })

  ok(res, { token, refreshToken, user: safeUser(user) })
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body
  if (!refreshToken) return unauthorized(res, '缺少 refreshToken')

  try {
    const payload = verifyToken(refreshToken)
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return unauthorized(res)

    const token = signToken({ id: user.id, phone: user.phone })
    ok(res, { token })
  } catch {
    unauthorized(res, 'refreshToken 无效或已过期')
  }
}

export async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) return unauthorized(res)
  ok(res, safeUser(user))
}

export async function updateMe(req, res) {
  const { nickname, avatarPath } = req.body
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { nickname, avatarPath },
  })
  ok(res, safeUser(user))
}

const safeUser = (u) => ({
  id: u.id,
  phone: u.phone,
  nickname: u.nickname,
  avatarPath: u.avatarPath,
  level: u.level,
  expPoints: u.expPoints,
  memberType: u.memberType,
  memberExpireAt: u.memberExpireAt,
  createdAt: u.createdAt,
})
