import { Router } from 'express'
import { createReview, getReviews } from '../controllers/reviews.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', getReviews)
router.post('/', authenticate, createReview)

export default router
