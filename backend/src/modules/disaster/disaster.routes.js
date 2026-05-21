import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as alert from './alert.controller.js'
import * as report from './report.controller.js'
import * as claim from './claim.controller.js'
import * as emergency from './emergency.controller.js'

const router = Router()

// ── 预警 / 指数（公开） ─────────────────────
router.get('/disaster/alert/list',     optionalAuth, wrap(alert.alertList))
router.get('/disaster/frost/advice',   optionalAuth, wrap(alert.frostAdvice))
router.get('/disaster/fire/risk',      optionalAuth, wrap(alert.fireRisk))
router.get('/disaster/drought/index',  optionalAuth, wrap(alert.droughtIndex))

// ── 应急预案（公开） ────────────────────────
router.get('/disaster/emergency/guide', optionalAuth, wrap(emergency.guideList))
router.get('/disaster/emergency/:id',   optionalAuth, wrap(emergency.guideDetail))

// ── 灾情上报 ────────────────────────────────
router.post('/disaster/report',          requireAuth, wrap(report.create))
router.get('/disaster/report/list',      requireAuth, wrap(report.list))
router.get('/disaster/report/:id',       requireAuth, wrap(report.detail))
router.put('/disaster/report/:id/status', requireAuth, wrap(report.updateStatus))

// ── 保险理赔 ────────────────────────────────
router.post('/disaster/claim/assess', requireAuth, wrap(claim.assess))
router.get('/disaster/claim/list',    requireAuth, wrap(claim.list))
router.get('/disaster/claim/:id',     requireAuth, wrap(claim.detail))

// ── 一键求助 ────────────────────────────────
router.post('/disaster/sos',          requireAuth, wrap(emergency.sosCreate))
router.get('/disaster/sos/list',      requireAuth, wrap(emergency.sosList))
router.put('/disaster/sos/:id/status', requireAuth, wrap(emergency.sosStatus))

export default router
