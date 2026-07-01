import { Response } from 'express'
import pool from '../db/pool.js'
import { AuthRequest } from '../types/index.js'

export async function createReservation(req: AuthRequest, res: Response): Promise<void> {
  const { table_id, date, time, guests, notes } = req.body
  const user_id = req.user!.id

  // Check table capacity
  const table = await pool.query('SELECT * FROM tables WHERE id = $1 AND is_active = true', [table_id])
  if (table.rowCount === 0) {
    res.status(404).json({ error: 'Mesa no encontrada' })
    return
  }
  if (table.rows[0].capacity < guests) {
    res.status(400).json({ error: `La mesa solo tiene capacidad para ${table.rows[0].capacity} personas` })
    return
  }

  // Check availability
  const conflict = await pool.query(
    "SELECT id FROM reservations WHERE table_id = $1 AND date = $2 AND time = $3 AND status != 'cancelled'",
    [table_id, date, time]
  )
  if (conflict.rowCount && conflict.rowCount > 0) {
    res.status(409).json({ error: 'La mesa ya está reservada en ese horario' })
    return
  }

  const result = await pool.query(
    'INSERT INTO reservations (user_id, table_id, date, time, guests, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [user_id, table_id, date, time, guests, notes]
  )
  res.status(201).json({ reservation: result.rows[0] })
}

export async function getMyReservations(req: AuthRequest, res: Response): Promise<void> {
  const { page = 1, limit = 10, status } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  let query = `
    SELECT r.*, t.number as table_number, t.location
    FROM reservations r
    JOIN tables t ON r.table_id = t.id
    WHERE r.user_id = $1
  `
  const params: unknown[] = [req.user!.id]

  if (status) {
    params.push(status)
    query += ` AND r.status = $${params.length}`
  }

  query += ` ORDER BY r.date DESC, r.time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  params.push(Number(limit), offset)

  const result = await pool.query(query, params)
  res.json({ reservations: result.rows, page: Number(page) })
}

export async function getReservationById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const user_id = req.user!.id
  const isAdmin = req.user!.role === 'admin'

  const result = await pool.query(
    `SELECT r.*, t.number as table_number, t.location, u.name as user_name, u.email as user_email,
            rv.id as review_id, rv.rating as review_rating, rv.comment as review_comment
     FROM reservations r
     JOIN tables t ON r.table_id = t.id
     JOIN users u ON r.user_id = u.id
     LEFT JOIN reviews rv ON rv.reservation_id = r.id
     WHERE r.id = $1`,
    [id]
  )

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Reserva no encontrada' })
    return
  }

  const reservation = result.rows[0]
  if (!isAdmin && reservation.user_id !== user_id) {
    res.status(403).json({ error: 'No tienes permiso para ver esta reserva' })
    return
  }

  res.json({ reservation })
}

export async function updateReservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { status, notes } = req.body
  const user_id = req.user!.id
  const isAdmin = req.user!.role === 'admin'

  const existing = await pool.query('SELECT * FROM reservations WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    res.status(404).json({ error: 'Reserva no encontrada' })
    return
  }

  const reservation = existing.rows[0]
  if (!isAdmin && reservation.user_id !== user_id) {
    res.status(403).json({ error: 'No tienes permiso para modificar esta reserva' })
    return
  }

  const result = await pool.query(
    'UPDATE reservations SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
    [status, notes, id]
  )
  res.json({ reservation: result.rows[0] })
}

export async function getAllReservations(req: AuthRequest, res: Response): Promise<void> {
  const { page = 1, limit = 20, date, status } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  let query = `
    SELECT r.*, u.name as user_name, u.email as user_email, t.number as table_number, t.location
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN tables t ON r.table_id = t.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (date) { params.push(date); query += ` AND r.date = $${params.length}` }
  if (status) { params.push(status); query += ` AND r.status = $${params.length}` }

  query += ` ORDER BY r.date ASC, r.time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  params.push(Number(limit), offset)

  const result = await pool.query(query, params)
  res.json({ reservations: result.rows, page: Number(page) })
}
