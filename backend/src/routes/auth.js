import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as ctrl from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.post('/refresh', ctrl.refreshToken)
router.get('/me', requireAuth, ctrl.getMe)
router.put('/me', requireAuth, ctrl.updateMe)

export default router
