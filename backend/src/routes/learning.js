import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as ctrl from '../controllers/learning.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/path', ctrl.getPath)
router.get('/today', ctrl.today)
router.get('/review/due', ctrl.dueReviews)
router.post('/progress', ctrl.updateProgress)
router.post('/quiz/submit', ctrl.submitQuiz)
router.get('/stats', ctrl.stats)
router.post('/checkin', ctrl.checkin)
router.get('/streak', ctrl.streakInfo)

export default router
