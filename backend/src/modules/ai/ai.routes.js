import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { upload } from '../../middleware/upload.js'
import { wrap } from '../../middleware/error.js'
import * as ai from './ai.controller.js'

const router = Router()

router.use('/ai', requireAuth)

// ── 状态与模型 ──────────────────────────────
router.get('/ai/status', wrap(ai.status))
router.get('/ai/model/version', wrap(ai.modelVersion))

// ── 大模型问答 ──────────────────────────────
router.post('/ai/chat', wrap(ai.chat))
router.post('/ai/policy/ask', wrap(ai.policyAsk))
router.post('/ai/agri/ask', wrap(ai.agriAsk))
router.post('/ai/legal/ask', wrap(ai.legalAsk))
router.get('/ai/kb/search', wrap(ai.kbSearch))
router.get('/ai/qa/records', wrap(ai.qaRecords))
router.delete('/ai/qa/records', wrap(ai.qaClearAll))
router.delete('/ai/qa/records/:id', wrap(ai.qaRemove))

// ── 语音与图像 ──────────────────────────────
router.post('/ai/voice/recognize', upload.single('audio'), wrap(ai.voiceRecognize))
router.post('/ai/image/analyze', upload.single('image'), wrap(ai.imageAnalyze))
router.post('/ai/image/detect', upload.single('image'), wrap(ai.imageAnalyze))

export default router
