import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as health from './health.controller.js'
import * as service from './service.controller.js'
import * as job from './job.controller.js'
import * as community from './community.controller.js'

const router = Router()

// ── 村医在线问诊 ────────────────────────────
router.get('/life/clinic/list',      optionalAuth, wrap(health.clinicList))
router.post('/life/clinic/consult',  requireAuth,  wrap(health.consultCreate))
router.get('/life/consult/list',     requireAuth,  wrap(health.consultList))
router.put('/life/consult/:id/reply', requireAuth, wrap(health.consultReply))

// ── 养老关爱服务 ────────────────────────────
router.get('/life/elder/services',  optionalAuth, wrap(health.elderServices))
router.post('/life/elder/checkin',  requireAuth,  wrap(health.elderCheckin))

// ── 快递代收站 ──────────────────────────────
router.get('/life/express/list',   optionalAuth, wrap(service.expressList))
router.get('/life/express/query',  optionalAuth, wrap(service.expressQuery))

// ── 水电气缴费 ──────────────────────────────
router.get('/life/utility/bill',  requireAuth, wrap(service.utilityBill))
router.post('/life/utility/pay',  requireAuth, wrap(service.utilityPay))

// ── 乡村旅游推广 ────────────────────────────
router.get('/life/tourism/list',     optionalAuth, wrap(service.tourismList))
router.post('/life/tourism',         requireAuth,  wrap(service.tourismCreate))
router.post('/life/tourism/promote', requireAuth,  wrap(service.tourismPromote))
router.get('/life/tourism/:id',      optionalAuth, wrap(service.tourismDetail))

// ── 就业信息平台 ────────────────────────────
router.get('/life/job/list',   optionalAuth, wrap(job.jobList))
router.post('/life/job',       requireAuth,  wrap(job.jobCreate))
router.post('/life/job/match', requireAuth,  wrap(job.jobMatch))

// ── 农业贷款服务 ────────────────────────────
router.get('/life/loan/products',     optionalAuth, wrap(job.loanProducts))
router.post('/life/loan/assess',      requireAuth,  wrap(job.loanAssess))
router.get('/life/loan/applications', requireAuth,  wrap(job.loanApplications))

// ── 子女教育辅导 ────────────────────────────
router.post('/life/edu/ask', requireAuth, wrap(job.eduAsk))

// ── 邻里互助 ────────────────────────────────
router.get('/life/help/list',       optionalAuth, wrap(community.helpList))
router.post('/life/help',           requireAuth,  wrap(community.helpCreate))
router.post('/life/help/:id/accept', requireAuth, wrap(community.helpAccept))

// ── 二手交易市场 ────────────────────────────
router.get('/life/secondhand/list', optionalAuth, wrap(community.secondhandList))
router.post('/life/secondhand',     requireAuth,  wrap(community.secondhandCreate))
router.put('/life/secondhand/:id',  requireAuth,  wrap(community.secondhandUpdate))

// ── 民俗文化记录 ────────────────────────────
router.get('/life/folk/list',  optionalAuth, wrap(community.folkList))
router.post('/life/folk',      requireAuth,  wrap(community.folkCreate))
router.get('/life/folk/:id',   optionalAuth, wrap(community.folkDetail))

// ── 环境问题举报 ────────────────────────────
router.post('/life/env/report',     requireAuth, wrap(community.envReport))
router.get('/life/env/list',        requireAuth, wrap(community.envList))
router.put('/life/env/:id/status',  requireAuth, wrap(community.envStatus))

export default router
