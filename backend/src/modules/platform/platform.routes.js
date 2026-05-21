import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as auth from './auth.controller.js'
import * as user from './user.controller.js'
import * as noti from './notification.controller.js'
import * as fb from './feedback.controller.js'
import * as search from './search.controller.js'

const router = Router()

// ── 认证 ────────────────────────────────────
router.post('/auth/register',      wrap(auth.register))
router.post('/auth/login',         wrap(auth.login))
router.post('/auth/login/wechat',  wrap(auth.wechatLogin))
router.post('/auth/sms/send',      wrap(auth.sendSms))
router.post('/auth/refresh',       wrap(auth.refresh))
router.post('/auth/logout',        requireAuth, wrap(auth.logout))

// ── 用户 ────────────────────────────────────
router.get('/user/profile',     requireAuth, wrap(user.getProfile))
router.put('/user/profile',     requireAuth, wrap(user.updateProfile))
router.get('/user/points',      requireAuth, wrap(user.getPoints))
router.get('/user/points/log',  requireAuth, wrap(user.getPointsLog))

// ── 通知 ────────────────────────────────────
router.get('/notification/list',      requireAuth, wrap(noti.list))
router.get('/notification/unread',    requireAuth, wrap(noti.unreadCount))
router.put('/notification/read-all',  requireAuth, wrap(noti.markAllRead))
router.put('/notification/:id/read',  requireAuth, wrap(noti.markRead))

// ── 反馈 ────────────────────────────────────
router.post('/feedback',       optionalAuth, wrap(fb.create))
router.get('/feedback/list',   requireAuth,  wrap(fb.listMine))

// ── 全局搜索 ────────────────────────────────
router.get('/search', optionalAuth, wrap(search.globalSearch))

export default router
