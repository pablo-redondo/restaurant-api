import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { getTables, createTable, updateTable } from '../controllers/tables.controller.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.get(
  '/',
  query('guests').optional().isInt({ min: 1 }).withMessage('guests debe ser un entero positivo'),
  query('location').optional().isIn(['interior', 'terraza']).withMessage('Ubicación inválida'),
  query('date').optional().isISO8601({ strict: true }).withMessage('Fecha inválida (YYYY-MM-DD)'),
  query('time').optional().matches(/^\d{2}:\d{2}$/).withMessage('Hora en formato HH:MM'),
  query('includeInactive').optional().isBoolean().withMessage('includeInactive debe ser booleano'),
  validate,
  asyncHandler(getTables)
)

router.post(
  '/',
  authenticate,
  requireAdmin,
  body('number').isInt({ min: 1 }).withMessage('El número de mesa debe ser un entero positivo'),
  body('capacity').isInt({ min: 1, max: 20 }).withMessage('La capacidad debe estar entre 1 y 20'),
  body('location').optional().isIn(['interior', 'terraza']).withMessage('Ubicación inválida'),
  validate,
  asyncHandler(createTable)
)

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  param('id').isInt({ min: 1 }).withMessage('ID de mesa inválido'),
  body('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('La capacidad debe estar entre 1 y 20'),
  body('location').optional().isIn(['interior', 'terraza']).withMessage('Ubicación inválida'),
  body('is_active').optional().isBoolean().withMessage('is_active debe ser booleano'),
  validate,
  asyncHandler(updateTable)
)

export default router
