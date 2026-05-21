import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import * as ctrl from '../controllers/community.controller.js'

const router = Router()

router.get('/works', optionalAuth, ctrl.listWorks)
router.post('/works', requireAuth, upload.single('media'), ctrl.createWork)
router.get('/works/:id', optionalAuth, ctrl.getWork)
router.delete('/works/:id', requireAuth, ctrl.deleteWork)
router.post('/works/:id/like', requireAuth, ctrl.toggleLike)
router.get('/works/:id/comments', ctrl.listComments)
router.post('/works/:id/comments', requireAuth, ctrl.addComment)

router.get('/challenges/daily', optionalAuth, ctrl.getDailyChallenge)
router.post('/challenges/daily/submit', requireAuth, ctrl.submitChallenge)
router.get('/challenges/daily/rank', ctrl.challengeRank)

export default router
