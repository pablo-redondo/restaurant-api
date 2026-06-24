import rateLimit from 'express-rate-limit'

const skip = () => process.env.NODE_ENV === 'test'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip,
  validate: { xForwardedForHeader: false },
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip,
  validate: { xForwardedForHeader: false },
  message: { error: 'Demasiadas peticiones. Vuelve a intentarlo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})
