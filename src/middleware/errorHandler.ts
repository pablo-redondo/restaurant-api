import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // PostgreSQL: unique violation
  if ((err as any).code === '23505') {
    res.status(409).json({ error: 'Registro duplicado' })
    return
  }

  // PostgreSQL: foreign key violation
  if ((err as any).code === '23503') {
    res.status(400).json({ error: 'Referencia inválida' })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
