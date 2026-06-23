import { validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array().map(e => ({ field: e.type === 'field' ? (e as any).path : undefined, message: e.msg })) })
    return
  }
  next()
}
