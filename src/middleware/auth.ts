import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthRequest } from '../types/index.js'

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' })
    return
  }
  next()
}
