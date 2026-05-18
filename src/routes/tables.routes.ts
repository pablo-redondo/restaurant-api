import { Router } from 'express'
import { getTables, createTable, updateTable } from '../controllers/tables.controller.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', getTables)
router.post('/', authenticate, requireAdmin, createTable)
router.patch('/:id', authenticate, requireAdmin, updateTable)

export default router
