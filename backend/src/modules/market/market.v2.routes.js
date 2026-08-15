/**
 * API v2 market 只读样板（116f-C）—— 薄适配器。
 *
 * 核心约束（docs/116f-APIv2与能力注册表.md §9 116f-C）：
 * - 只做 v2 路径 → v1 controller 的挂载映射，**直接复用** product.list / product.detail；
 * - 不复制任何商品查询、过滤、分页、seller 投影或 images 解析逻辑；
 * - 不改变 v1 路径、响应、错误码、排序或业务语义；不加弃用响应、不删除旧接口；
 * - 外部路径（mount-relative 规则）：v2 前缀 + 本文件 path
 *   → GET /api/v2/market/products 与 GET /api/v2/market/products/:id。
 */

import { Router } from 'express'
import { optionalAuth } from '../../middleware/auth.js'
import { wrap } from '../../middleware/error.js'
import * as product from './product.controller.js'

const router = Router()

// 与 v1 GET /market/product/list 同一 controller、同一 optionalAuth 公开读取语义
router.get('/market/products', optionalAuth, wrap(product.list))

// 与 v1 GET /market/product/:id 同一 controller（参数名同为 :id，边界行为完全一致）
router.get('/market/products/:id', optionalAuth, wrap(product.detail))

export default router
