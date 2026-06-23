import request from 'supertest'
import app from '../index'
import pool from '../db/pool'
import { makeToken } from './helpers'

jest.mock('../db/pool', () => ({ __esModule: true, default: { query: jest.fn() } }))

const mockQuery = (pool as any).query as jest.Mock

const customerToken = makeToken(1, 'customer')

const fakeReview = {
  id: 1, user_id: 1, reservation_id: 1, rating: 5, comment: 'Excelente', created_at: new Date(),
}

describe('GET /api/reviews', () => {
  it('devuelve reseñas con rating promedio', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...fakeReview, user_name: 'Ana' }] })
      .mockResolvedValueOnce({ rows: [{ average: '4.5' }] })

    const res = await request(app).get('/api/reviews')

    expect(res.status).toBe(200)
    expect(res.body.reviews).toHaveLength(1)
    expect(res.body.average_rating).toBe('4.5')
  })

  it('devuelve average_rating null si no hay reseñas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ average: null }] })

    const res = await request(app).get('/api/reviews')

    expect(res.status).toBe(200)
    expect(res.body.average_rating).toBeNull()
  })

  it('devuelve 422 con paginación inválida', async () => {
    const res = await request(app).get('/api/reviews').query({ page: 0 })
    expect(res.status).toBe(422)
  })
})

describe('POST /api/reviews', () => {
  it('crea una reseña sobre una reserva confirmada', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'confirmed' }], rowCount: 1 }) // check reservation
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                // check duplicate
      .mockResolvedValueOnce({ rows: [fakeReview] })                                  // insert

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reservation_id: 1, rating: 5, comment: 'Excelente' })

    expect(res.status).toBe(201)
    expect(res.body.review.rating).toBe(5)
  })

  it('devuelve 403 si la reserva no está confirmada (pending)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })  // no confirmed reservation found

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reservation_id: 1, rating: 4 })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/confirmadas/)
  })

  it('devuelve 409 si ya existe una reseña para esa reserva', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })  // check reservation OK
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 })  // duplicate found

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reservation_id: 1, rating: 3 })

    expect(res.status).toBe(409)
  })

  it('devuelve 422 con rating fuera de rango', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reservation_id: 1, rating: 6 })

    expect(res.status).toBe(422)
  })

  it('devuelve 422 sin reservation_id', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4 })

    expect(res.status).toBe(422)
  })

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ reservation_id: 1, rating: 5 })

    expect(res.status).toBe(401)
  })
})
