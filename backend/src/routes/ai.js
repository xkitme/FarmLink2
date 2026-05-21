import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import * as ctrl from '../controllers/ai.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/health', ctrl.health)
router.post('/chat', ctrl.chat)
router.post('/character/chat', ctrl.characterChat)
router.post('/translate', ctrl.translate)
router.post('/quiz/generate', ctrl.generateQuiz)
router.post('/calligraphy/review', upload.single('image'), ctrl.reviewCalligraphy)

export default router
