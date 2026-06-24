import { Request, Response } from 'express'
import pool from '../db/pool.js'
import { AuthRequest } from '../types/index.js'

export async function getTables(req: Request, res: Response): Promise<void> {
  const { date, time, guests, location, includeInactive } = req.query

  let query = `SELECT * FROM tables WHERE ${includeInactive ? '1=1' : 'is_active = true'}`
  const params: unknown[] = []

  if (location) {
    params.push(location)
    query += ` AND location = $${params.length}`
  }

  if (guests) {
    params.push(Number(guests))
    query += ` AND capacity >= $${params.length}`
  }

  if (date && time) {
    query += ` AND id NOT IN (
      SELECT table_id FROM reservations
      WHERE date = $${params.length + 1} AND time = $${params.length + 2}
      AND status != 'cancelled'
    )`
    params.push(date, time)
  }

  query += ' ORDER BY number'

  const result = await pool.query(query, params)
  res.json({ tables: result.rows, total: result.rowCount })
}

export async function createTable(req: AuthRequest, res: Response): Promise<void> {
  const { number, capacity, location } = req.body
  const result = await pool.query(
    'INSERT INTO tables (number, capacity, location) VALUES ($1, $2, $3) RETURNING *',
    [number, capacity, location ?? 'interior']
  )
  res.status(201).json({ table: result.rows[0] })
}

export async function updateTable(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { capacity, location, is_active } = req.body
  const result = await pool.query(
    'UPDATE tables SET capacity = COALESCE($1, capacity), location = COALESCE($2, location), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *',
    [capacity, location, is_active, id]
  )
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Mesa no encontrada' })
    return
  }
  res.json({ table: result.rows[0] })
}
