import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteDir = path.resolve(__dirname, '../../../uploads/site')

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const IMAGE_EXT_ORDER = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const STARTUP_AD_SETTING_KEY = 'startup_ad'
const STARTUP_AD_IMAGE_KEY = 'app-fullscreen-ad'
const DEFAULT_STARTUP_AD = {
  enabled: true,
  imageKey: STARTUP_AD_IMAGE_KEY,
  durationSeconds: 5,
  targetPath: '/home',
}

function safeReadSiteFiles() {
  try {
    return fs.readdirSync(siteDir)
  } catch {
    return []
  }
}

function siteImageUrlForKey(key) {
  const normalized = `${key || ''}`.trim()
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) return ''
  const files = safeReadSiteFiles()
  for (const ext of IMAGE_EXT_ORDER) {
    const hit = files.find((file) => file === `${normalized}${ext}`)
    if (hit) return `/uploads/site/${hit}`
  }
  return ''
}

function parseSettingValue(value) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeStartupAdConfig(value = {}) {
  const duration = Number(value.durationSeconds ?? value.durationMs / 1000)
  const imageKey = `${value.imageKey || DEFAULT_STARTUP_AD.imageKey}`.trim()
  const targetPath = `${value.targetPath || DEFAULT_STARTUP_AD.targetPath}`.trim()
  return {
    enabled: value.enabled !== false,
    imageKey: /^[a-zA-Z0-9_-]+$/.test(imageKey) ? imageKey : DEFAULT_STARTUP_AD.imageKey,
    durationSeconds: Number.isFinite(duration)
      ? Math.min(60, Math.max(1, Math.round(duration)))
      : DEFAULT_STARTUP_AD.durationSeconds,
    targetPath: targetPath.startsWith('/') ? targetPath : DEFAULT_STARTUP_AD.targetPath,
  }
}

async function loadStartupAdConfig() {
  const row = await prisma.siteSetting.findUnique({ where: { key: STARTUP_AD_SETTING_KEY } })
  if (!row) return { ...DEFAULT_STARTUP_AD }
  return normalizeStartupAdConfig(parseSettingValue(row.value))
}

async function startupAdPayload(config = null) {
  const current = config || await loadStartupAdConfig()
  const imageUrl = siteImageUrlForKey(current.imageKey) || siteImageUrlForKey('farm-market')
  return {
    ...current,
    imageUrl,
    durationMs: current.durationSeconds * 1000,
    serverTime: Date.now(),
    enabled: current.enabled && Boolean(imageUrl),
  }
}

// 站点图清单：运维/管理台把图片放进 backend/uploads/site/ 即对外可用，
// 覆盖同名文件即可实时更新前端展示，无需重新发布 App。
// key = 去扩展名的文件名（与前端 bundled 资产名一一对应，如 auth-hero）。
export async function listSiteImages(req, res) {
  const files = safeReadSiteFiles()
  const images = {}
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    const key = path.basename(file, ext)
    images[key] = `/uploads/site/${file}`
  }
  // 广告图 key 默认也出现在管理台，便于首次上传；未上传时预览复用现有集市图。
  if (!images[STARTUP_AD_IMAGE_KEY]) {
    const fallback = siteImageUrlForKey('farm-market')
    if (fallback) images[STARTUP_AD_IMAGE_KEY] = fallback
  }
  ok(res, { images })
}

// App 启动广告配置：公开读取，移动端据此展示全屏广告与真实倒计时。
export async function getStartupAd(req, res) {
  ok(res, await startupAdPayload())
}

// 管理台读取启动广告配置。
export async function adminGetStartupAd(req, res) {
  ok(res, await startupAdPayload())
}

// 管理台保存启动广告配置；广告图本身继续复用 POST /site/images/:key 上传。
export async function adminUpdateStartupAd(req, res) {
  const current = await loadStartupAdConfig()
  const next = { ...current }

  if (req.body.enabled !== undefined) {
    next.enabled = req.body.enabled === true || req.body.enabled === 'true'
  }
  if (req.body.imageKey !== undefined) {
    const imageKey = `${req.body.imageKey || ''}`.trim()
    if (!/^[a-zA-Z0-9_-]+$/.test(imageKey)) throw errors.param('广告图标识不合法')
    next.imageKey = imageKey
  }
  if (req.body.durationSeconds !== undefined || req.body.durationMs !== undefined) {
    const raw = req.body.durationSeconds ?? Number(req.body.durationMs) / 1000
    const duration = Number(raw)
    if (!Number.isFinite(duration) || duration < 1 || duration > 60) {
      throw errors.param('广告显示时间需为 1-60 秒')
    }
    next.durationSeconds = Math.round(duration)
  }
  if (req.body.targetPath !== undefined) {
    const targetPath = `${req.body.targetPath || ''}`.trim()
    if (!targetPath.startsWith('/')) throw errors.param('跳转路径需以 / 开头')
    next.targetPath = targetPath
  }

  const value = JSON.stringify(normalizeStartupAdConfig(next))
  await prisma.siteSetting.upsert({
    where: { key: STARTUP_AD_SETTING_KEY },
    create: {
      key: STARTUP_AD_SETTING_KEY,
      value,
      description: 'App 启动全屏广告配置',
    },
    update: { value },
  })
  ok(res, await startupAdPayload(JSON.parse(value)), '启动广告配置已保存')
}

// 上传/替换站点图：覆盖 uploads/site/<key>.<ext>，前端下次加载即更新。
export async function uploadSiteImage(req, res) {
  const key = `${req.params.key || ''}`.trim()
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw errors.param('非法图片标识')
  if (!req.file) throw errors.param('请上传图片文件')
  const ext = (path.extname(req.file.originalname) || '.jpg').toLowerCase()
  if (!IMAGE_EXT.has(ext)) {
    fs.unlink(req.file.path, () => {})
    throw errors.param('仅支持 jpg/png/webp/gif 图片')
  }
  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true })
  // 删除同 key 旧文件（避免 key.jpg 与 key.png 并存），再落新文件
  for (const file of fs.readdirSync(siteDir)) {
    const fileExt = path.extname(file).toLowerCase()
    if (IMAGE_EXT.has(fileExt) && path.basename(file, fileExt) === key) {
      try {
        fs.unlinkSync(path.join(siteDir, file))
      } catch {
        // 忽略删除失败，继续覆盖
      }
    }
  }
  fs.renameSync(req.file.path, path.join(siteDir, `${key}${ext}`))
  ok(res, { key, url: `/uploads/site/${key}${ext}` })
}
