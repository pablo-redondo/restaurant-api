import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  createReservation,
  getMyReservations,
  getReservationById,
  updateReservation,
  getAllReservations,
} from '../controllers/reservations.controller.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.post(
  '/',
  authenticate,
  body('table_id').isInt({ min: 1 }).withMessage('table_id inválido'),
  body('date').isISO8601({ strict: true }).withMessage('Fecha inválida (YYYY-MM-DD)'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('Hora en formato HH:MM'),
  body('guests').isInt({ min: 1 }).withMessage('El número de comensales debe ser al menos 1'),
  body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage('Las notas no pueden superar 500 caracteres'),
  validate,
  asyncHandler(createReservation)
)

router.get(
  '/me',
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled']).withMessage('Estado inválido'),
  validate,
  asyncHandler(getMyReservations)
)

router.get(
  '/:id',
  authenticate,
  param('id').isInt({ min: 1 }).withMessage('ID de reserva inválido'),
  validate,
  asyncHandler(getReservationById)
)

router.patch(
  '/:id',
  authenticate,
  param('id').isInt({ min: 1 }).withMessage('ID de reserva inválido'),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled']).withMessage('Estado inválido'),
  body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage('Las notas no pueden superar 500 caracteres'),
  validate,
  asyncHandler(updateReservation)
)

router.get(
  '/',
  authenticate,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100'),
  query('date').optional().isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled']).withMessage('Estado inválido'),
  validate,
  asyncHandler(getAllReservations)
)

export default router
