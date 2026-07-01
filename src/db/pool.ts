import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Render (y la mayoría de hostings) exponen una única DATABASE_URL con SSL
// requerido. Si existe, se usa esa; si no, se cae a las variables sueltas
// (DB_HOST, DB_PORT...) para desarrollo local con docker-compose.
const connectionString = process.env.DATABASE_URL

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })

pool.on('connect', () => console.log('✅ PostgreSQL connected'))
pool.on('error', (err) => console.error('❌ PostgreSQL pool error:', err.message))

// Verificación de arranque: si la conexión falla, lo dejamos bien visible en
// los logs con la causa real (auth, host inexistente, BD caducada...) en vez
// de descubrirlo indirectamente cuando el primer endpoint devuelva un 500.
pool
  .query('SELECT 1')
  .then(() => console.log('✅ Conexión a la base de datos verificada'))
  .catch((err) => {
    console.error('❌ No se pudo conectar a la base de datos al arrancar:')
    console.error(`   ${err.message}`)
  })

export default pool
