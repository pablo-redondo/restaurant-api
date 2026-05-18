import { Response } from 'express'
import pool from '../db/pool.js'
import { AuthRequest } from '../types/index.js'

export async function createReview(req: AuthRequest, res: Response): Promise<void> {
  const { reservation_id, rating, comment } = req.body
  const user_id = req.user!.id

  // Verify reservation belongs to user and is not cancelled
  const reservation = await pool.query(
    "SELECT * FROM reservations WHERE id = $1 AND user_id = $2 AND status != 'cancelled'",
    [reservation_id, user_id]
  )
  if (reservation.rowCount === 0) {
    res.status(403).json({ error: 'Solo puedes reseñar tus propias reservas completadas' })
    return
  }

  // Check no duplicate review
  const existing = await pool.query('SELECT id FROM reviews WHERE reservation_id = $1', [reservation_id])
  if (existing.rowCount && existing.rowCount > 0) {
    res.status(409).json({ error: 'Ya has dejado una reseña para esta reserva' })
    return
  }

  const result = await pool.query(
    'INSERT INTO reviews (user_id, reservation_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
    [user_id, reservation_id, rating, comment]
  )
  res.status(201).json({ review: result.rows[0] })
}

export async function getReviews(req: AuthRequest, res: Response): Promise<void> {
  const { page = 1, limit = 10 } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const result = await pool.query(
    `SELECT rv.*, u.name as user_name
     FROM reviews rv
     JOIN users u ON rv.user_id = u.id
     ORDER BY rv.created_at DESC
     LIMIT $1 OFFSET $2`,
    [Number(limit), offset]
  )

  const avg = await pool.query('SELECT ROUND(AVG(rating)::numeric, 1) as average FROM reviews')

  res.json({
    reviews: result.rows,
    average_rating: avg.rows[0]?.average ?? null,
    page: Number(page),
  })
}
