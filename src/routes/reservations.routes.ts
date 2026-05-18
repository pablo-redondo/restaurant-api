import { Router } from 'express'
import {
  createReservation,
  getMyReservations,
  updateReservation,
  getAllReservations,
} from '../controllers/reservations.controller.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, createReservation)
router.get('/me', authenticate, getMyReservations)
router.patch('/:id', authenticate, updateReservation)
router.get('/', authenticate, requireAdmin, getAllReservations)

export default router
