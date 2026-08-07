import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import { upload } from '../../middleware/upload.js'
import { uploadQuota } from '../../middleware/uploadQuota.js'
import * as price from './price.controller.js'
import * as product from './product.controller.js'
import * as order from './order.controller.js'
import * as trace from './trace.controller.js'
import * as buyer from './buyer.controller.js'
import * as ai from './aimarket.controller.js'

const router = Router()

// ── 行情（公开） ────────────────────────────
router.get('/market/price',         optionalAuth, wrap(price.priceList))
router.get('/market/price/trend',   optionalAuth, wrap(price.priceTrend))
router.get('/market/price/predict', optionalAuth, wrap(price.pricePredict))
router.get('/market/futures',       optionalAuth, wrap(price.futures))
router.get('/market/export',        optionalAuth, wrap(price.exportCompliance))

// ── 溯源查询（公开） ────────────────────────
router.get('/market/trace/:code',   optionalAuth, wrap(trace.query))

// ── 商品 ────────────────────────────────────
router.get('/market/product/list',  optionalAuth, wrap(product.list))
router.get('/market/product/mine',  requireAuth,  wrap(product.mine))
router.get('/market/product/:id',   optionalAuth, wrap(product.detail))
router.post('/market/product',      requireAuth,  wrap(product.create))
router.put('/market/product/:id',   requireAuth,  wrap(product.update))
router.delete('/market/product/:id', requireAuth, wrap(product.remove))

// ── 订单 ────────────────────────────────────
router.post('/market/order',            requireAuth, wrap(order.create))
router.get('/market/order/list',        requireAuth, wrap(order.list))
router.get('/market/order/:id',         requireAuth, wrap(order.detail))
router.put('/market/order/:id/status',  requireAuth, wrap(order.updateStatus))
router.get('/market/logistics/:no',     requireAuth, wrap(order.logistics))

// ── 溯源（写） ──────────────────────────────
router.post('/market/trace/generate',     requireAuth, wrap(trace.generate))
router.post('/market/trace/:code/record', requireAuth, wrap(trace.addRecord))

// ── 收购站 + 团购 ───────────────────────────
router.get('/market/buyer/map',       optionalAuth, wrap(buyer.buyerMap))
router.get('/market/buyer/list',      optionalAuth, wrap(buyer.buyerList))
router.get('/market/groupbuy/list',   optionalAuth, wrap(buyer.groupBuyList))
router.post('/market/groupbuy',       requireAuth,  wrap(buyer.groupBuyCreate))
router.post('/market/groupbuy/:id/join', requireAuth, wrap(buyer.groupBuyJoin))

// ── AI 能力 ─────────────────────────────────
router.post('/market/grade/detect',     requireAuth, uploadQuota(), upload.single('image'), wrap(ai.gradeDetect))
router.post('/market/package/generate', requireAuth, wrap(ai.packageGenerate))
router.post('/market/live/script',      requireAuth, wrap(ai.liveScript))

export default router
