import request from 'supertest'
import app from '../index'
import pool from '../db/pool'
import { makeToken } from './helpers'

jest.mock('../db/pool', () => ({ __esModule: true, default: { query: jest.fn() } }))

const mockQuery = (pool as any).query as jest.Mock

const customerToken = makeToken(1, 'customer')
const adminToken = makeToken(99, 'admin')

const fakeTable = { id: 1, number: 1, capacity: 4, location: 'interior', is_active: true }
const fakeReservation = {
  id: 1, user_id: 1, table_id: 1, date: '2026-07-15', time: '20:00',
  guests: 2, status: 'pending', notes: null, created_at: new Date(),
}

describe('POST /api/reservations', () => {
  it('crea una reserva válida', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeTable], rowCount: 1 })  // check table
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })            // check conflict
      .mockResolvedValueOnce({ rows: [fakeReservation] })          // insert

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ table_id: 1, date: '2026-07-15', time: '20:00', guests: 2 })

    expect(res.status).toBe(201)
    expect(res.body.reservation.table_id).toBe(1)
  })

  it('devuelve 400 si la capacidad es insuficiente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeTable, capacity: 2 }], rowCount: 1 })

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ table_id: 1, date: '2026-07-15', time: '20:00', guests: 10 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/capacidad/)
  })

  it('devuelve 404 si la mesa no existe o está inactiva', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ table_id: 999, date: '2026-07-15', time: '20:00', guests: 2 })

    expect(res.status).toBe(404)
  })

  it('devuelve 409 si ya hay una reserva en ese horario', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeTable], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 })  // conflict

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ table_id: 1, date: '2026-07-15', time: '20:00', guests: 2 })

    expect(res.status).toBe(409)
  })

  it('devuelve 422 con datos inválidos', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ table_id: 'abc', date: 'no-es-fecha', time: '25:99' })

    expect(res.status).toBe(422)
  })

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({ table_id: 1, date: '2026-07-15', time: '20:00', guests: 2 })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/reservations/me', () => {
  it('devuelve las reservas del usuario autenticado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeReservation] })

    const res = await request(app)
      .get('/api/reservations/me')
      .set('Authorization', `Bearer ${customerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.reservations).toHaveLength(1)
  })

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/reservations/me')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/reservations/:id', () => {
  it('devuelve la reserva si pertenece al usuario', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeReservation, user_id: 1 }], rowCount: 1 })

    const res = await request(app)
      .get('/api/reservations/1')
      .set('Authorization', `Bearer ${customerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.reservation.id).toBe(1)
  })

  it('devuelve 403 si la reserva es de otro usuario', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeReservation, user_id: 99 }], rowCount: 1 })

    const res = await request(app)
      .get('/api/reservations/1')
      .set('Authorization', `Bearer ${customerToken}`)

    expect(res.status).toBe(403)
  })

  it('devuelve 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const res = await request(app)
      .get('/api/reservations/999')
      .set('Authorization', `Bearer ${customerToken}`)

    expect(res.status).toBe(404)
  })

  it('admin puede ver cualquier reserva', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeReservation, user_id: 1 }], rowCount: 1 })

    const res = await request(app)
      .get('/api/reservations/1')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/reservations/:id', () => {
  it('customer puede cancelar su propia reserva', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...fakeReservation, user_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...fakeReservation, status: 'cancelled' }] })

    const res = await request(app)
      .patch('/api/reservations/1')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(res.body.reservation.status).toBe('cancelled')
  })

  it('devuelve 403 si intenta modificar una reserva ajena', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeReservation, user_id: 99 }], rowCount: 1 })

    const res = await request(app)
      .patch('/api/reservations/1')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(403)
  })

  it('devuelve 422 con estado inválido', async () => {
    const res = await request(app)
      .patch('/api/reservations/1')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'volando' })

    expect(res.status).toBe(422)
  })

  it('admin puede confirmar cualquier reserva', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...fakeReservation, user_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...fakeReservation, status: 'confirmed' }] })

    const res = await request(app)
      .patch('/api/reservations/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' })

    expect(res.status).toBe(200)
  })
})

describe('GET /api/reservations (admin)', () => {
  it('admin obtiene todas las reservas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeReservation] })

    const res = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.reservations).toHaveLength(1)
  })

  it('devuelve 403 si no es admin', async () => {
    const res = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${customerToken}`)

    expect(res.status).toBe(403)
  })
})
