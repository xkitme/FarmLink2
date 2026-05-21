import authRoutes from './auth.js'
import contentsRoutes from './contents.js'
import aiRoutes from './ai.js'
import learningRoutes from './learning.js'
import communityRoutes from './community.js'
import achievementsRoutes from './achievements.js'
import searchRoutes from './search.js'
import mediaRoutes from './media.js'

export function registerRoutes(app) {
  app.use('/api/auth', authRoutes)
  app.use('/api/contents', contentsRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api/learning', learningRoutes)
  app.use('/api/community', communityRoutes)
  app.use('/api/achievements', achievementsRoutes)
  app.use('/api/search', searchRoutes)
  app.use('/api/media', mediaRoutes)
}
