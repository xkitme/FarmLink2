import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import * as ctrl from '../controllers/contents.controller.js'

const router = Router()

router.get('/', ctrl.list)
router.get('/daily/recommend', ctrl.daily)
router.get('/season/current', ctrl.seasonContent)
router.get('/:id', optionalAuth, ctrl.detail)
router.post('/:id/view', ctrl.recordView)
router.post('/:id/favorite', requireAuth, ctrl.toggleFavorite)
router.get('/user/favorites', requireAuth, ctrl.myFavorites)

export default router
