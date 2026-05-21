import { Router } from 'express'
import * as ctrl from '../controllers/search.controller.js'

const router = Router()

router.get('/', ctrl.search)
router.get('/suggest', ctrl.suggest)

export default router
