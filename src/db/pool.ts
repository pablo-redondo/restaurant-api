import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    })

pool.on('connect', () => console.log('✅ PostgreSQL connected'))
pool.on('error', (err) => console.error('❌ PostgreSQL error:', err))

export default pool
