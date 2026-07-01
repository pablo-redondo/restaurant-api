import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import path from 'path'

import authRoutes from './routes/auth.routes.js'
import tablesRoutes from './routes/tables.routes.js'
import reservationsRoutes from './routes/reservations.routes.js'
import reviewsRoutes from './routes/reviews.routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authLimiter, apiLimiter } from './middleware/rateLimit.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

// En Render (y la mayoría de hostings) la app corre detrás de un proxy/balanceador
// que añade X-Forwarded-For. Sin esto, express-rate-limit no puede identificar
// la IP real del cliente de forma fiable y lo señala como un aviso en cada petición.
app.set('trust proxy', 1)

const swaggerDoc = YAML.load(path.join(__dirname, '..', 'swagger.yaml'))

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use('/api', apiLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/tables', tablesRoutes)
app.use('/api/reservations', reservationsRoutes)
app.use('/api/reviews', reviewsRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📋 Health check: http://localhost:${PORT}/health`)
  })
}

export default app
