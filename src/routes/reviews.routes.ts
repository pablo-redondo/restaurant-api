import { Router } from 'express'
import { body, query } from 'express-validator'
import { createReview, getReviews } from '../controllers/reviews.controller.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100'),
  validate,
  asyncHandler(getReviews)
)

router.post(
  '/',
  authenticate,
  body('reservation_id').isInt({ min: 1 }).withMessage('reservation_id inválido'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('El rating debe estar entre 1 y 5'),
  body('comment').optional().isString().trim().isLength({ max: 1000 }).withMessage('El comentario no puede superar 1000 caracteres'),
  validate,
  asyncHandler(createReview)
)

export default router
