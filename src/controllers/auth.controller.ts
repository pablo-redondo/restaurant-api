import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import { AuthRequest } from '../types/index.js'

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'El email ya está registrado' })
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const result = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
    [name, email, hashed]
  )

  const user = result.rows[0]
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' })

  res.status(201).json({ user, token })
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user!.id]
  )
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Usuario no encontrado' })
    return
  }
  res.json({ user: result.rows[0] })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  const user = result.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Credenciales incorrectas' })
    return
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' })

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token })
}
