import { Router } from 'express'
import { optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as iot from './iot.controller.js'

const router = Router()

// ── 智慧物联 · 设备监测 ──────────────────────
router.get('/iot/devices', optionalAuth, wrap(iot.listDevices))
router.get('/iot/devices/:id', optionalAuth, wrap(iot.deviceDetail))

// ── 智慧物联 · 设备联动 ──────────────────────
router.get('/iot/linkage/rules', optionalAuth, wrap(iot.listLinkageRules))
router.get('/iot/linkage/logs', optionalAuth, wrap(iot.linkageLogs))
router.post('/iot/linkage/rules/:id/toggle', optionalAuth, wrap(iot.toggleLinkageRule))

export default router
