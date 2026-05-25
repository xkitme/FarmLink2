import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as dashboard from './dashboard.controller.js'
import * as statistics from './statistics.controller.js'
import * as sync from './sync.controller.js'

const router = Router()

router.use('/data', requireAuth)

// ── 农情数据看板 ────────────────────────────
router.get('/data/dashboard', wrap(dashboard.dashboard))
router.get('/data/remote-sensing', wrap(dashboard.remoteSensing))
router.get('/data/annual-report/list', wrap(dashboard.annualReportList))
router.post('/data/annual-report/generate', wrap(dashboard.generateAnnualReport))

// ── 农业统计上报 ────────────────────────────
router.get('/data/statistics', wrap(statistics.list))
router.get('/data/statistics/summary', wrap(statistics.summary))
router.post('/data/statistics/report', wrap(statistics.create))
router.put('/data/statistics/:id/status', wrap(statistics.updateStatus))

// ── 数据同步 ────────────────────────────────
router.post('/data/sync', wrap(sync.syncData))
router.get('/data/sync/status', wrap(sync.status))
router.get('/data/sync/logs', wrap(sync.logs))

export default router
