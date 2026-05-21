import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import * as ctrl from '../controllers/media.controller.js'

const router = Router()

router.post('/upload', requireAuth, upload.single('file'), ctrl.uploadFile)
router.get('/:filename', ctrl.serveFile)

export default router
