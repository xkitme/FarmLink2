import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as machinery from './machinery.controller.js'
import * as booking from './booking.controller.js'
import * as transfer from './transfer.controller.js'
import * as service from './service.controller.js'

const router = Router()

// ── 农机预约租赁 ────────────────────────────
router.get('/machinery/list',          optionalAuth, wrap(machinery.list))
router.get('/machinery/mine',           requireAuth, wrap(machinery.mine))
router.post('/machinery',               requireAuth, wrap(machinery.create))
router.post('/machinery/booking',       requireAuth, wrap(booking.bookingCreate))
router.get('/machinery/booking/list',   requireAuth, wrap(booking.bookingList))
router.put('/machinery/booking/:id/status', requireAuth, wrap(booking.bookingStatus))

// ── 作业轨迹 ────────────────────────────────
router.post('/machinery/track',         requireAuth, wrap(booking.trackReport))
router.get('/machinery/track/list',     requireAuth, wrap(booking.trackList))

// ── 维保 / 故障诊断 ─────────────────────────
router.get('/machinery/maintain/remind', requireAuth, wrap(booking.maintainRemind))
router.post('/machinery/fault/diagnose', requireAuth, wrap(booking.faultDiagnose))

// ── 成本核算 ────────────────────────────────
router.get('/machinery/cost/summary',   requireAuth, wrap(transfer.costSummary))

// ── 保险 / 认证 ─────────────────────────────
router.post('/machinery/insurance',      requireAuth, wrap(service.insuranceCreate))
router.get('/machinery/insurance/list',  requireAuth, wrap(service.insuranceList))
router.post('/machinery/cert/apply',     requireAuth, wrap(service.certApply))
router.get('/machinery/cert/list',       requireAuth, wrap(service.certList))

// 详情/改/删（:id 通配放最后）
router.get('/machinery/:id',     optionalAuth, wrap(machinery.detail))
router.put('/machinery/:id',     requireAuth, wrap(machinery.update))
router.delete('/machinery/:id',  requireAuth, wrap(machinery.remove))

// ── 土地流转平台 ────────────────────────────
router.get('/land/transfer/list',  optionalAuth, wrap(transfer.transferList))
router.get('/land/transfer/:id',   optionalAuth, wrap(transfer.transferDetail))
router.post('/land/transfer',      requireAuth, wrap(transfer.transferCreate))
router.put('/land/transfer/:id',   requireAuth, wrap(transfer.transferUpdate))
router.delete('/land/transfer/:id', requireAuth, wrap(transfer.transferRemove))

export default router
