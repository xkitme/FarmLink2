import path from 'path'
import fs from 'fs'
import { config } from '../config/index.js'
import { ok, fail } from '../utils/response.js'

export async function uploadFile(req, res) {
  if (!req.file) return fail(res, '未接收到文件')
  ok(res, {
    filename: req.file.filename,
    url: `/api/media/${req.file.filename}`,
    size: req.file.size,
  })
}

export async function serveFile(req, res) {
  const filename = path.basename(req.params.filename)
  const filePath = path.join(config.upload.dir, filename)

  if (!fs.existsSync(filePath)) return res.status(404).json({ code: 404, message: '文件不存在' })
  res.sendFile(path.resolve(filePath))
}
