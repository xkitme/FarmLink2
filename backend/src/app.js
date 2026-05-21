import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { registerRoutes } from './routes/index.js'
import adminRouter from './routes/admin.js'
import { apiSwitchMiddleware } from './middleware/apiSwitch.js'
import { loadSwitches } from './config/apiSwitches.js'

loadSwitches()

export const prisma = new PrismaClient()

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(apiSwitchMiddleware)
app.use('/admin', adminRouter)
app.get('/health', (req, res) => res.json({ status: 'ok' }))

registerRoutes(app)

// 404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: `Route not found: ${req.method} ${req.path}` })
})

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
})

export default app
