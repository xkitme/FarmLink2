import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as ctrl from '../controllers/achievements.controller.js'

const router = Router()

router.get('/', ctrl.listAll)
router.get('/me', requireAuth, ctrl.myAchievements)
router.get('/leaderboard', ctrl.leaderboard)

export default router
