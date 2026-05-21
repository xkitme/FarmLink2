import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/index.js'

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  cb(null, allowed.includes(file.mimetype))
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024 },
})
