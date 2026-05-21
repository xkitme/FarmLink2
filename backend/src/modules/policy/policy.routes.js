import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as policy from './policy.controller.js'
import * as party from './party.controller.js'
import * as village from './village.controller.js'
import * as training from './training.controller.js'

const router = Router()

// ── 三级政策推送 ────────────────────────────
router.get('/policy/list',  optionalAuth, wrap(policy.list))

// ── 补贴申请 ────────────────────────────────
router.post('/policy/subsidy/apply', requireAuth, wrap(policy.subsidyApply))
router.get('/policy/subsidy/list',   requireAuth, wrap(policy.subsidyList))

// ── 政策 AI 问答 / 法律咨询 ─────────────────
router.post('/policy/ai/ask',    requireAuth, wrap(policy.aiAsk))
router.post('/policy/legal/ask', requireAuth, wrap(policy.legalAsk))

// ── 乡村振兴积分 ────────────────────────────
router.get('/policy/points/rank',     requireAuth, wrap(party.pointsRank))
router.get('/policy/points/items',    requireAuth, wrap(party.exchangeItems))
router.post('/policy/points/exchange', requireAuth, wrap(party.pointsExchange))

router.get('/policy/:id', optionalAuth, wrap(policy.detail))

// ── 党建学习打卡 ────────────────────────────
router.get('/party/lesson/list',     requireAuth, wrap(party.lessonList))
router.get('/party/lesson/:id',      requireAuth, wrap(party.lessonDetail))
router.post('/party/lesson/:id/finish', requireAuth, wrap(party.lessonFinish))
router.get('/party/learn/log',       requireAuth, wrap(party.learnLog))

// ── 村务公开 ────────────────────────────────
router.get('/village/affairs',  optionalAuth, wrap(village.affairList))
router.post('/village/affairs', requireAuth,  wrap(village.affairCreate))

// ── 文明乡风榜 ──────────────────────────────
router.get('/village/honor',          optionalAuth, wrap(village.honorList))
router.post('/village/honor',         requireAuth,  wrap(village.honorCreate))
router.post('/village/honor/:id/vote', requireAuth, wrap(village.honorVote))

// ── 职业农民培训 ────────────────────────────
router.get('/training/course/list', optionalAuth, wrap(training.courseList))
router.get('/training/my',           requireAuth,  wrap(training.myTraining))
router.get('/training/course/:id',   optionalAuth, wrap(training.courseDetail))
router.post('/training/course/:id/enroll',   requireAuth, wrap(training.enroll))
router.post('/training/course/:id/progress', requireAuth, wrap(training.updateProgress))

// ── 乡村人才库 ──────────────────────────────
router.get('/talent/list', optionalAuth, wrap(training.talentList))
router.post('/talent',     requireAuth,  wrap(training.talentApply))

export default router
