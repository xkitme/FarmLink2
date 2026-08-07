import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from '../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadDir = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// 允许的上传 MIME 白名单
const ALLOWED_MIME = new Set([
  // 图片
  'image/jpeg',
  'image/png',
  'image/webp',
  // 音频
  'audio/wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
])

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true)
  cb(new Error(`不支持的文件类型：${file.mimetype}`))
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024 },
})

// ── sharp 图片消毒（可选依赖，缺失时降级跳过）──

let sharpModule = null
async function loadSharp() {
  if (sharpModule !== null) return sharpModule
  try {
    sharpModule = (await import('sharp')).default
  } catch {
    sharpModule = false
  }
  return sharpModule
}

/**
 * 图片安全重编码（剥离 EXIF、限制最大尺寸、统一为 JPEG）。
 * 仅处理 image/* 上传；非图片或 sharp 不可用时原样保留。
 * @param {string} filePath - multer 落盘后的文件路径
 * @param {object} opts
 * @param {number} [opts.maxWidth=2048] - 最大宽度
 * @param {number} [opts.maxHeight=2048] - 最大高度
 * @param {number} [opts.quality=85] - JPEG 质量
 * @returns {Promise<{sanitized: boolean, reason?: string}>}
 */
export async function sanitizeUploadedImage(filePath, opts = {}) {
  const ext = path.extname(filePath).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return { sanitized: false, reason: '非图片格式，跳过消毒' }
  }

  const sharp = await loadSharp()
  if (!sharp) {
    return { sanitized: false, reason: 'sharp 未安装，跳过消毒' }
  }

  const tmpPath = filePath + '.sanitized'

  try {
    await sharp(filePath)
      .rotate() // 尊重 EXIF 旋转方向后丢弃 EXIF
      .resize(opts.maxWidth || 2048, opts.maxHeight || 2048, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: opts.quality || 85 })
      .toFile(tmpPath)

    fs.renameSync(tmpPath, filePath)
    return { sanitized: true }
  } catch (err) {
    // 清理可能残留的临时文件
    try { fs.unlinkSync(tmpPath) } catch {}
    return { sanitized: false, reason: `sharp 处理失败：${err.message}` }
  }
}

/**
 * 检查文件是否为图片 MIME（用于控制器判断是否需调用 sanitizeUploadedImage）
 */
export function isImageFile(file) {
  return IMAGE_MIME.has(file?.mimetype)
}
