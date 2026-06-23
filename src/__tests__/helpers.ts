import jwt from 'jsonwebtoken'

export const makeToken = (id: number, role: 'customer' | 'admin') =>
  jwt.sign({ id, role }, process.env.JWT_SECRET!, { expiresIn: '1h' })
