import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { config } from './config/index.js'
import { registerRoutes } from './routes/index.js'
import { traceMiddleware, notFoundHandler, errorHandler } from './middleware/error.js'
import { ok } from './utils/response.js'

export const prisma = new PrismaClient()

const app = express()

// 基础中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(traceMiddleware)

// 健康检查
app.get('/health', (req, res) => ok(res, { status: 'ok', env: config.isProd ? 'production' : 'development' }))

// 业务路由
registerRoutes(app, config.apiPrefix)

// 404 + 全局异常
app.use(notFoundHandler)
app.use(errorHandler)

export default app
