import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import { upload } from '../../middleware/upload.js'
import * as plot from './plot.controller.js'
import * as record from './record.controller.js'
import * as detect from './detect.controller.js'
import * as advise from './advise.controller.js'
import * as info from './info.controller.js'

const router = Router()
router.use(requireAuth)

// ── 地块管理 ────────────────────────────────
router.get('/agri/plot/list',   wrap(plot.list))
router.post('/agri/plot',       wrap(plot.create))
router.get('/agri/plot/:id',    wrap(plot.detail))
router.put('/agri/plot/:id',    wrap(plot.update))
router.delete('/agri/plot/:id', wrap(plot.remove))

// ── 农事记录 ────────────────────────────────
router.get('/agri/record/list', wrap(record.list))
router.post('/agri/record',     wrap(record.create))
router.put('/agri/record/:id',  wrap(record.update))
router.delete('/agri/record/:id', wrap(record.remove))

// ── 农业碳汇 ────────────────────────────────
router.post('/agri/carbon/calc', wrap(record.carbonCalc))
router.get('/agri/carbon/list',  wrap(record.carbonList))

// ── AI 识别 ─────────────────────────────────
router.get('/agri/disease/list',     wrap(detect.diseaseList))
router.post('/agri/disease/detect',  upload.single('image'), wrap(detect.diseaseDetect))
router.post('/agri/weed/detect',     upload.single('image'), wrap(detect.weedDetect))
router.post('/agri/seed/detect',     upload.single('image'), wrap(detect.seedDetect))
router.post('/agri/crop/monitor',    upload.single('image'), wrap(detect.cropMonitor))
router.get('/agri/detect/records',   wrap(detect.records))
router.get('/agri/disease/:label',   wrap(detect.diseaseDetail))

// ── 智能建议 ────────────────────────────────
router.post('/agri/soil/advise',       wrap(advise.soilAdvise))
router.post('/agri/fertilizer/advise', wrap(advise.fertilizerAdvise))
router.post('/agri/irrigation/plan',   wrap(advise.irrigationPlan))
router.post('/agri/yield/predict',     wrap(advise.yieldPredict))
router.get('/agri/yield/list',         wrap(advise.yieldList))

// ── 农事信息 ────────────────────────────────
router.get('/agri/calendar',        wrap(info.calendar))
router.get('/agri/pesticide',       wrap(info.pesticideQuery))
router.get('/agri/pesticide/list',  wrap(info.pesticideList))
router.get('/agri/weather',         wrap(info.weather))
router.get('/agri/report/annual',   wrap(info.annualReport))

export default router
