import request from 'supertest'
import app from '../index'
import pool from '../db/pool'
import { makeToken } from './helpers'

jest.mock('../db/pool', () => ({ __esModule: true, default: { query: jest.fn() } }))

const mockQuery = (pool as any).query as jest.Mock

const adminToken = makeToken(1, 'admin')
const customerToken = makeToken(2, 'customer')

const fakeTables = [
  { id: 1, number: 1, capacity: 2, location: 'interior', is_active: true },
  { id: 2, number: 2, capacity: 4, location: 'terraza', is_active: true },
]

describe('GET /api/tables', () => {
  it('devuelve la lista de mesas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: fakeTables, rowCount: 2 })

    const res = await request(app).get('/api/tables')

    expect(res.status).toBe(200)
    expect(res.body.tables).toHaveLength(2)
    expect(res.body.total).toBe(2)
  })

  it('acepta filtros válidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeTables[1]], rowCount: 1 })

    const res = await request(app)
      .get('/api/tables')
      .query({ location: 'terraza', guests: 4, date: '2026-07-15', time: '21:00' })

    expect(res.status).toBe(200)
  })

  it('devuelve 422 con filtros inválidos', async () => {
    const res = await request(app)
      .get('/api/tables')
      .query({ location: 'azotea', guests: -1 })

    expect(res.status).toBe(422)
  })
})

describe('POST /api/tables', () => {
  it('crea una mesa si es admin', async () => {
    const newTable = { id: 3, number: 3, capacity: 6, location: 'interior', is_active: true }
    mockQuery.mockResolvedValueOnce({ rows: [newTable] })

    const res = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 3, capacity: 6, location: 'interior' })

    expect(res.status).toBe(201)
    expect(res.body.table.number).toBe(3)
  })

  it('devuelve 403 si no es admin', async () => {
    const res = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ number: 3, capacity: 6 })

    expect(res.status).toBe(403)
  })

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/tables').send({ number: 3, capacity: 6 })
    expect(res.status).toBe(401)
  })

  it('devuelve 422 con datos inválidos', async () => {
    const res = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: -1, capacity: 999, location: 'azotea' })

    expect(res.status).toBe(422)
  })
})

describe('PATCH /api/tables/:id', () => {
  it('actualiza una mesa si es admin', async () => {
    const updated = { ...fakeTables[0], capacity: 4 }
    mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 })

    const res = await request(app)
      .patch('/api/tables/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 4 })

    expect(res.status).toBe(200)
    expect(res.body.table.capacity).toBe(4)
  })

  it('devuelve 404 si la mesa no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const res = await request(app)
      .patch('/api/tables/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 4 })

    expect(res.status).toBe(404)
  })

  it('devuelve 422 con ID inválido', async () => {
    const res = await request(app)
      .patch('/api/tables/abc')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 4 })

    expect(res.status).toBe(422)
  })
})
