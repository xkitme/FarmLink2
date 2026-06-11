import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ok, errors } from '../../utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteDir = path.resolve(__dirname, '../../../uploads/site')

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

// 站点图清单：运维/管理台把图片放进 backend/uploads/site/ 即对外可用，
// 覆盖同名文件即可实时更新前端展示，无需重新发布 App。
// key = 去扩展名的文件名（与前端 bundled 资产名一一对应，如 auth-hero）。
export async function listSiteImages(req, res) {
  let files = []
  try {
    files = fs.readdirSync(siteDir)
  } catch {
    files = []
  }
  const images = {}
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    const key = path.basename(file, ext)
    images[key] = `/uploads/site/${file}`
  }
  ok(res, { images })
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
