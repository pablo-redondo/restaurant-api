import { Router } from 'express'
import { body } from 'express-validator'
import { register, login, me } from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post(
  '/register',
  body('name').notEmpty().trim().withMessage('El nombre es obligatorio'),
  body('email').isEmail().normalizeEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validate,
  asyncHandler(register)
)

router.post(
  '/login',
  body('email').isEmail().normalizeEmail().withMessage('Email no válido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  validate,
  asyncHandler(login)
)

router.get('/me', authenticate, asyncHandler(me))

export default router
