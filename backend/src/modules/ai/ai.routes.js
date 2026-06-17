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
router.post('/ai/assistant/turn', wrap(ai.assistantTurn))
router.post('/ai/assistant/command-result', wrap(ai.assistantCommandResult))
router.post('/ai/policy/ask', wrap(ai.policyAsk))
router.post('/ai/agri/ask', wrap(ai.agriAsk))
router.post('/ai/legal/ask', wrap(ai.legalAsk))
router.get('/ai/kb/search', wrap(ai.kbSearch))
router.get('/ai/qa/records', wrap(ai.qaRecords))
router.get('/ai/qa/threads/:threadId', wrap(ai.qaThreadRecords))
router.post('/ai/qa/records/detect', wrap(ai.qaDetectRecord))
router.delete('/ai/qa/records', wrap(ai.qaClearAll))
router.delete('/ai/qa/record-items/:id', wrap(ai.qaRemoveOne))
router.delete('/ai/qa/threads/:threadId', wrap(ai.qaRemoveThread))
router.delete('/ai/qa/records/:id', wrap(ai.qaRemove))

// ── 本地中文语音合成（Kokoro TTS sidecar）─────
router.post('/ai/tts', wrap(ai.tts))
router.get('/ai/tts/status', wrap(ai.ttsStatus))

// ── 语音与图像 ──────────────────────────────
router.post('/ai/voice/recognize', upload.single('audio'), wrap(ai.voiceRecognize))
router.post('/ai/image/analyze', upload.single('image'), wrap(ai.imageAnalyze))
router.post('/ai/image/detect', upload.single('image'), wrap(ai.imageAnalyze))
router.post('/ai/detect-feedback', wrap(ai.detectFeedback))

export default router
