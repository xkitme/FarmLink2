import { Router } from 'express'
import { requireAuth, optionalAuth, requireRole } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import { upload } from '../../middleware/upload.js'
import * as auth from './auth.controller.js'
import * as user from './user.controller.js'
import * as noti from './notification.controller.js'
import * as fb from './feedback.controller.js'
import * as search from './search.controller.js'
import * as admin from './admin.controller.js'
import * as resource from './resource.controller.js'
import * as site from './site.controller.js'

const router = Router()

// ── 站点配图（清单公开；上传替换需管理员，覆盖即实时更新前端配图）─
router.get('/site/images', optionalAuth, wrap(site.listSiteImages))
router.get('/site/startup-ad', optionalAuth, wrap(site.getStartupAd))
router.get('/site/auth-background', optionalAuth, wrap(site.getAuthBackground))
router.post('/site/images/:key', requireAuth, requireRole('ADMIN'),
  upload.single('file'), wrap(site.uploadSiteImage))

// ── 认证（仅账号密码，后端校验） ─────────────
router.post('/auth/register',  wrap(auth.register))
router.post('/auth/login',     wrap(auth.login))
router.post('/auth/reset-password', wrap(auth.resetPassword))
router.post('/auth/refresh',   wrap(auth.refresh))
router.post('/auth/logout',    requireAuth, wrap(auth.logout))
router.get('/auth/sessions',   requireAuth, wrap(auth.sessions))
router.delete('/auth/sessions', requireAuth, wrap(auth.revokeAllSessions))
router.delete('/auth/sessions/:id', requireAuth, wrap(auth.revokeSession))

// ── 用户 ────────────────────────────────────
router.get('/user/profile',     requireAuth, wrap(user.getProfile))
router.put('/user/profile',     requireAuth, wrap(user.updateProfile))
router.put('/user/password',    requireAuth, wrap(user.updatePassword))
router.get('/user/points',      requireAuth, wrap(user.getPoints))
router.get('/user/points/log',  requireAuth, wrap(user.getPointsLog))
router.get('/user/growth',      requireAuth, wrap(user.getGrowth))
router.post('/upload/image',    requireAuth, upload.single('image'), wrap(user.uploadImage))

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

// ── 后端管理能力：API 开关 / 限流 / 操作日志 ─
router.get('/admin/api-switch/list',       requireAuth, requireRole('ADMIN'), wrap(admin.apiSwitchList))
router.get('/admin/api-switch/categories', requireAuth, requireRole('ADMIN'), wrap(admin.apiSwitchCategories))
router.post('/admin/api-switch',           requireAuth, requireRole('ADMIN'), wrap(admin.apiSwitchCreate))
router.put('/admin/api-switch/:id',        requireAuth, requireRole('ADMIN'), wrap(admin.apiSwitchUpdate))
router.put('/admin/api-switch/:id/toggle', requireAuth, requireRole('ADMIN'), wrap(admin.apiSwitchToggle))
router.delete('/admin/api-switch/:id',     requireAuth, requireRole('ADMIN'), wrap(admin.apiSwitchRemove))
router.get('/admin/ai-assistant/config',   requireAuth, requireRole('ADMIN'), wrap(admin.aiAssistantConfigGet))
router.put('/admin/ai-assistant/config',   requireAuth, requireRole('ADMIN'), wrap(admin.aiAssistantConfigUpdate))
router.post('/admin/ai-assistant/test',    requireAuth, requireRole('ADMIN'), wrap(admin.aiAssistantConfigTest))
router.get('/admin/operation-log/list',    requireAuth, requireRole('ADMIN'), wrap(admin.operationLogList))
router.get('/admin/rate-limit/status',     requireAuth, requireRole('ADMIN'), wrap(admin.rateLimitStatus))
router.get('/admin/seed/summary',          requireAuth, requireRole('ADMIN'), wrap(admin.seedDataSummary))
router.post('/admin/security/password-reset-code', requireAuth, requireRole('ADMIN'), wrap(admin.passwordResetCodeCreate))
router.post('/admin/security/revoke-sessions', requireAuth, requireRole('ADMIN'), wrap(admin.userSessionsRevoke))
router.get('/admin/site/startup-ad',       requireAuth, requireRole('ADMIN'), wrap(site.adminGetStartupAd))
router.put('/admin/site/startup-ad',       requireAuth, requireRole('ADMIN'), wrap(site.adminUpdateStartupAd))
router.get('/admin/resource/index',        requireAuth, requireRole('ADMIN'), wrap(resource.resourceIndex))
router.get('/admin/resource/:resource/config', requireAuth, requireRole('ADMIN'), wrap(resource.resourceConfig))
router.get('/admin/resource/:resource/list',   requireAuth, requireRole('ADMIN'), wrap(resource.resourceList))
router.get('/admin/resource/:resource/:id',     requireAuth, requireRole('ADMIN'), wrap(resource.resourceDetail))
router.post('/admin/resource/:resource',        requireAuth, requireRole('ADMIN'), wrap(resource.resourceCreate))
router.put('/admin/resource/:resource/:id',     requireAuth, requireRole('ADMIN'), wrap(resource.resourceUpdate))
router.delete('/admin/resource/:resource/:id',  requireAuth, requireRole('ADMIN'), wrap(resource.resourceRemove))

export default router
