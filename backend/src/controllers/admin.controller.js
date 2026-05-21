import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../app.js'
import { config } from '../config/index.js'
import { getAll, toggle } from '../config/apiSwitches.js'
import { checkHealth } from '../services/ai.service.js'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Auth ────────────────────────────────────────────────
export async function adminLogin(req, res) {
  const { username, password } = req.body
  if (username !== config.admin.username || password !== config.admin.password) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' })
  }
  const token = jwt.sign(
    { role: 'admin', username },
    config.admin.jwtSecret,
    { expiresIn: '8h' }
  )
  res.json({ code: 0, message: 'success', data: { token, username } })
}

// ─── Stats ───────────────────────────────────────────────
export async function getOverviewStats(req, res) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [users, contents, aiConvs, todayCheckins, weeklyUsers, works] = await Promise.all([
    prisma.user.count(),
    prisma.content.count(),
    prisma.aiConversation.count(),
    prisma.checkin.count({ where: { date: today } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(weekAgo) } } }),
    prisma.userWork.count(),
  ])

  res.json({
    code: 0, data: { users, contents, aiConvs, todayCheckins, weeklyUsers, works }
  })
}

export async function getChartData(req, res) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push(d.toISOString().slice(0, 10))
  }

  const checkinData = await Promise.all(
    days.map((date) => prisma.checkin.count({ where: { date } }))
  )
  const progressData = await Promise.all(
    days.map((date) => {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      return prisma.learningProgress.count({ where: { lastAccessedAt: { gte: start, lt: end } } })
    })
  )

  res.json({
    code: 0,
    data: days.map((date, i) => ({
      date,
      checkins: checkinData[i],
      learning: progressData[i],
    })),
  })
}

// ─── Users ───────────────────────────────────────────────
export async function listUsers(req, res) {
  const { page = 1, pageSize = 20, keyword, memberType } = req.query
  const where = {}
  if (keyword) where.OR = [{ nickname: { contains: keyword } }, { phone: { contains: keyword } }]
  if (memberType !== undefined && memberType !== '') where.memberType = parseInt(memberType)

  const [total, list] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, phone: true, nickname: true, avatarPath: true,
        level: true, expPoints: true, memberType: true,
        memberExpireAt: true, createdAt: true,
        _count: { select: { works: true, checkins: true } },
      },
    }),
  ])
  res.json({ code: 0, data: { total, list } })
}

export async function updateUser(req, res) {
  const { memberType, memberExpireAt, nickname } = req.body
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { memberType, memberExpireAt: memberExpireAt ? new Date(memberExpireAt) : undefined, nickname },
  })
  res.json({ code: 0, data: user })
}

export async function deleteUser(req, res) {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

// ─── Contents ────────────────────────────────────────────
export async function listContents(req, res) {
  const { page = 1, pageSize = 20, keyword, category, dynasty, difficulty } = req.query
  const where = {}
  if (keyword) where.OR = [{ title: { contains: keyword } }, { author: { contains: keyword } }]
  if (category) where.category = category
  if (dynasty) where.dynasty = dynasty
  if (difficulty) where.difficulty = parseInt(difficulty)

  const [total, list] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { createdAt: 'desc' },
    }),
  ])
  res.json({ code: 0, data: { total, list } })
}

export async function createContent(req, res) {
  const content = await prisma.content.create({
    data: {
      id: uuidv4(),
      ...req.body,
      tags: req.body.tags ? JSON.stringify(req.body.tags) : null,
      annotation: req.body.annotation ? JSON.stringify(req.body.annotation) : null,
    },
  })
  res.status(201).json({ code: 0, data: content })
}

export async function updateContent(req, res) {
  const data = { ...req.body }
  if (data.tags && Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags)
  const content = await prisma.content.update({ where: { id: req.params.id }, data })
  res.json({ code: 0, data: content })
}

export async function deleteContent(req, res) {
  await prisma.content.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

// ─── AI ──────────────────────────────────────────────────
export async function getAIStatus(req, res) {
  const online = await checkHealth()
  const { primaryModel, visionModel } = config.ollama
  res.json({ code: 0, data: { online, primaryModel, visionModel } })
}

export async function getAIStats(req, res) {
  const total = await prisma.aiConversation.count()
  const today = new Date().toISOString().slice(0, 10)
  const todayStart = new Date(today)
  const todayCount = await prisma.aiConversation.count({ where: { createdAt: { gte: todayStart } } })

  // 按 mode 统计
  const modeStats = await prisma.aiConversation.groupBy({
    by: ['mode'],
    _count: { id: true },
  })

  res.json({ code: 0, data: { total, todayCount, modeStats } })
}

export async function listConversations(req, res) {
  const { page = 1, pageSize = 20, mode, userId } = req.query
  const where = {}
  if (mode) where.mode = mode
  if (userId) where.userId = userId

  const [total, list] = await Promise.all([
    prisma.aiConversation.count({ where }),
    prisma.aiConversation.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, nickname: true } } },
    }),
  ])
  res.json({ code: 0, data: { total, list } })
}

export async function deleteConversation(req, res) {
  await prisma.aiConversation.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

// ─── Challenges ──────────────────────────────────────────
export async function listChallenges(req, res) {
  const { page = 1, pageSize = 20 } = req.query
  const [total, list] = await Promise.all([
    prisma.dailyChallenge.count(),
    prisma.dailyChallenge.findMany({
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { date: 'desc' },
      include: { _count: { select: { submissions: true } } },
    }),
  ])
  res.json({ code: 0, data: { total, list } })
}

export async function createChallenge(req, res) {
  const challenge = await prisma.dailyChallenge.create({
    data: {
      id: uuidv4(),
      ...req.body,
      options: req.body.options ? JSON.stringify(req.body.options) : null,
    },
  })
  res.status(201).json({ code: 0, data: challenge })
}

export async function updateChallenge(req, res) {
  const data = { ...req.body }
  if (data.options && Array.isArray(data.options)) data.options = JSON.stringify(data.options)
  const challenge = await prisma.dailyChallenge.update({ where: { id: req.params.id }, data })
  res.json({ code: 0, data: challenge })
}

export async function deleteChallenge(req, res) {
  await prisma.dailyChallenge.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

// ─── Community ───────────────────────────────────────────
export async function listAdminWorks(req, res) {
  const { page = 1, pageSize = 20, workType } = req.query
  const where = workType ? { workType } : {}
  const [total, list] = await Promise.all([
    prisma.userWork.count({ where }),
    prisma.userWork.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, nickname: true } } },
    }),
  ])
  res.json({ code: 0, data: { total, list } })
}

export async function deleteAdminWork(req, res) {
  await prisma.userWork.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

export async function listComments(req, res) {
  const { page = 1, pageSize = 20 } = req.query
  const [total, list] = await Promise.all([
    prisma.comment.count(),
    prisma.comment.findMany({
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true } },
        work: { select: { id: true, title: true, workType: true } },
      },
    }),
  ])
  res.json({ code: 0, data: { total, list } })
}

export async function deleteComment(req, res) {
  await prisma.comment.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

// ─── Achievements ────────────────────────────────────────
export async function listAchievements(req, res) {
  const list = await prisma.achievement.findMany({
    orderBy: { category: 'asc' },
    include: { _count: { select: { userAchievements: true } } },
  })
  res.json({ code: 0, data: list })
}

export async function createAchievement(req, res) {
  const ach = await prisma.achievement.create({ data: { id: uuidv4(), ...req.body } })
  res.status(201).json({ code: 0, data: ach })
}

export async function updateAchievement(req, res) {
  const ach = await prisma.achievement.update({ where: { id: req.params.id }, data: req.body })
  res.json({ code: 0, data: ach })
}

export async function deleteAchievement(req, res) {
  await prisma.achievement.delete({ where: { id: req.params.id } })
  res.json({ code: 0, message: '已删除' })
}

// ─── API Switches ────────────────────────────────────────
export async function listApiSwitches(req, res) {
  res.json({ code: 0, data: getAll() })
}

export async function toggleApiSwitch(req, res) {
  const { key } = req.body
  if (!key) return res.status(400).json({ code: 1, message: '缺少 key' })
  const enabled = toggle(key)
  res.json({ code: 0, data: { key, enabled } })
}

export async function testApi(req, res) {
  const { method, path: apiPath, headers: extraHeaders = {}, body, query } = req.body
  if (!method || !apiPath) return res.status(400).json({ code: 1, message: '缺少 method 或 path' })

  const baseUrl = `http://localhost:${config.port}`
  let url = `${baseUrl}${apiPath}`
  if (query && Object.keys(query).length) {
    url += '?' + new URLSearchParams(query).toString()
  }

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    signal: AbortSignal.timeout(15000),
  }
  if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    fetchOptions.body = JSON.stringify(body)
  }

  const start = Date.now()
  try {
    const response = await fetch(url, fetchOptions)
    const duration = Date.now() - start
    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }

    res.json({
      code: 0,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
        duration,
      },
    })
  } catch (err) {
    res.json({ code: 1, message: err.message, data: { duration: Date.now() - start } })
  }
}

// ─── System ──────────────────────────────────────────────
export async function getSystemHealth(req, res) {
  const ollamaOk = await checkHealth()
  const dbPath = path.join(__dirname, '../../dev.db')
  const dbSize = fs.existsSync(dbPath)
    ? (fs.statSync(dbPath).size / 1024 / 1024).toFixed(2) + ' MB'
    : 'N/A'

  const [userCount, contentCount, workCount] = await Promise.all([
    prisma.user.count(),
    prisma.content.count(),
    prisma.userWork.count(),
  ])

  res.json({
    code: 0,
    data: {
      services: {
        backend: { status: 'ok', uptime: Math.floor(process.uptime()) },
        database: { status: 'ok', size: dbSize },
        ollama: { status: ollamaOk ? 'ok' : 'offline' },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        freeMemMB: Math.round(os.freemem() / 1024 / 1024),
        cpus: os.cpus().length,
        hostname: os.hostname(),
      },
      db: { userCount, contentCount, workCount },
    },
  })
}

export async function getSettings(req, res) {
  res.json({
    code: 0,
    data: {
      ollama: {
        baseUrl: config.ollama.baseUrl,
        primaryModel: config.ollama.primaryModel,
        visionModel: config.ollama.visionModel,
      },
      aiRateLimit: config.aiRateLimit,
      upload: config.upload,
    },
  })
}

export async function updateSettings(req, res) {
  // 比赛版：仅展示配置，不持久化（重启后恢复）
  res.json({ code: 0, message: '配置已应用（重启后恢复默认值）', data: req.body })
}
