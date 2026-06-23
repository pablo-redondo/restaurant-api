import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../index'
import pool from '../db/pool'
import { makeToken } from './helpers'

jest.mock('../db/pool', () => ({ __esModule: true, default: { query: jest.fn() } }))
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('$hashed'), compare: jest.fn() }))

const mockQuery = (pool as any).query as jest.Mock
const mockCompare = (bcrypt as any).compare as jest.Mock

describe('POST /api/auth/register', () => {
  it('crea usuario y devuelve token', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Ana', email: 'ana@test.com', role: 'customer' }] })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'secret123' })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('ana@test.com')
    expect(res.body.user.password).toBeUndefined()
  })

  it('devuelve 409 si el email ya existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'existing@test.com', password: 'secret123' })

    expect(res.status).toBe(409)
  })

  it('devuelve 422 si faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@test.com' })

    expect(res.status).toBe(422)
    expect(res.body.errors).toBeDefined()
  })

  it('devuelve 422 si el email no es válido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'no-es-email', password: 'secret123' })

    expect(res.status).toBe(422)
  })

  it('devuelve 422 si la contraseña es muy corta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: '123' })

    expect(res.status).toBe(422)
  })
})

describe('POST /api/auth/login', () => {
  it('devuelve token con credenciales válidas', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Ana', email: 'ana@test.com', role: 'customer', password: '$hashed' }],
    })
    mockCompare.mockResolvedValueOnce(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: 'secret123' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.password).toBeUndefined()
  })

  it('devuelve 401 con contraseña incorrecta', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, password: '$hashed' }],
    })
    mockCompare.mockResolvedValueOnce(false)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: 'wrong' })

    expect(res.status).toBe(401)
  })

  it('devuelve 401 si el usuario no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'secret123' })

    expect(res.status).toBe(401)
  })

  it('devuelve 422 si faltan campos', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(422)
  })
})

describe('GET /api/auth/me', () => {
  it('devuelve el perfil con token válido', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Ana', email: 'ana@test.com', role: 'customer', created_at: new Date() }],
      rowCount: 1,
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(1, 'customer')}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('ana@test.com')
  })

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('devuelve 401 con token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.falso.aqui')
    expect(res.status).toBe(401)
  })
})
