import { Router } from 'express'
import { requireAdmin } from '../middleware/adminAuth.js'
import * as ctrl from '../controllers/admin.controller.js'

const router = Router()

router.post('/auth/login', ctrl.adminLogin)

router.use(requireAdmin)

router.get('/stats/overview', ctrl.getOverviewStats)
router.get('/stats/chart', ctrl.getChartData)

router.get('/users', ctrl.listUsers)
router.put('/users/:id', ctrl.updateUser)
router.delete('/users/:id', ctrl.deleteUser)

router.get('/contents', ctrl.listContents)
router.post('/contents', ctrl.createContent)
router.put('/contents/:id', ctrl.updateContent)
router.delete('/contents/:id', ctrl.deleteContent)

router.get('/ai/status', ctrl.getAIStatus)
router.get('/ai/stats', ctrl.getAIStats)
router.get('/ai/conversations', ctrl.listConversations)
router.delete('/ai/conversations/:id', ctrl.deleteConversation)

router.get('/challenges', ctrl.listChallenges)
router.post('/challenges', ctrl.createChallenge)
router.put('/challenges/:id', ctrl.updateChallenge)
router.delete('/challenges/:id', ctrl.deleteChallenge)

router.get('/works', ctrl.listAdminWorks)
router.delete('/works/:id', ctrl.deleteAdminWork)
router.get('/comments', ctrl.listComments)
router.delete('/comments/:id', ctrl.deleteComment)

router.get('/achievements', ctrl.listAchievements)
router.post('/achievements', ctrl.createAchievement)
router.put('/achievements/:id', ctrl.updateAchievement)
router.delete('/achievements/:id', ctrl.deleteAchievement)

router.get('/apis', ctrl.listApiSwitches)
router.put('/apis/toggle', ctrl.toggleApiSwitch)
router.post('/apis/test', ctrl.testApi)

router.get('/system/health', ctrl.getSystemHealth)
router.get('/settings', ctrl.getSettings)
router.put('/settings', ctrl.updateSettings)

export default router
