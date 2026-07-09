# Restaurant API

API REST para la gestión de reservas de un restaurante: autenticación de usuarios, disponibilidad de mesas, reservas y reseñas. Construida con **Node.js + Express + TypeScript** sobre **PostgreSQL**.

[![CI](https://github.com/pablo-redondo/restaurant-api/actions/workflows/ci.yml/badge.svg)](https://github.com/pablo-redondo/restaurant-api/actions/workflows/ci.yml)

## Índice

- [Stack técnico](#stack-técnico)
- [Arquitectura y decisiones de diseño](#arquitectura-y-decisiones-de-diseño)
- [Modelo de datos](#modelo-de-datos)
- [Endpoints](#endpoints)
- [Puesta en marcha](#puesta-en-marcha)
- [Testing](#testing)
- [Documentación OpenAPI](#documentación-openapi)

## Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20, TypeScript |
| Framework HTTP | Express 5 |
| Base de datos | PostgreSQL (driver `pg`, pool de conexiones) |
| Autenticación | JWT (`jsonwebtoken`) + `bcryptjs` |
| Validación | `express-validator` |
| Seguridad | `helmet`, `cors`, `express-rate-limit` |
| Documentación | OpenAPI 3.0 (`swagger-ui-express`) |
| Testing | Jest + Supertest (mocks de base de datos, sin dependencias externas) |
| CI/CD | GitHub Actions (lint + typecheck + tests en cada push/PR) |
| Contenedores | Docker multi-stage + Docker Compose (API + PostgreSQL) |

## Arquitectura y decisiones de diseño

- **Manejo de errores centralizado**: un middleware de error único (`errorHandler`) traduce excepciones de negocio (`AppError`) y códigos de error nativos de Postgres (`23505` duplicado, `23503` FK inválida) a respuestas HTTP consistentes, evitando `try/catch` repetido en cada controlador (patrón `asyncHandler`).
- **Rate limiting diferenciado**: límite estricto en `/api/auth` (10 req/15min) para mitigar fuerza bruta sobre login/registro, y límite más permisivo en el resto de `/api` (100 req/min).
- **Cabeceras de seguridad** vía `helmet` y `CORS` configurable por entorno.
- **Pool de conexiones a Postgres** (`pg.Pool`) en vez de conexiones por request, con listeners de `connect`/`error` para observabilidad básica.
- **Health check** (`GET /health`) pensado para probes de liveness/readiness de un orquestador (Docker, Kubernetes, balanceadores).
- **Imagen Docker multi-stage**: build de TypeScript en una etapa, runtime final solo con `dist/` y dependencias de producción — imagen final más pequeña y sin toolchain de compilación.
- **Autorización por rol** (`customer` / `admin`) a nivel de middleware, no de controlador, para que las reglas de acceso sean explícitas en las rutas.

## Modelo de datos

```
users                tables               reservations              reviews
─────                ──────               ────────────              ───────
id PK                id PK                id PK                     id PK
name                 number (unique)      user_id FK → users        user_id FK → users
email (unique)       capacity             table_id FK → tables      reservation_id FK → reservations (unique)
password (hash)      location             date                      rating (1-5)
role                 is_active            time                      comment
created_at                                guests                    created_at
                                           status                    
                                           notes                     
                                           created_at                
                                           UNIQUE(table_id, date, time)
```

- `reservations.status`: `pending` → `confirmed` → `cancelled`.
- La restricción `UNIQUE(table_id, date, time)` evita reservas duplicadas de la misma mesa en el mismo turno a nivel de base de datos, además de la comprobación de disponibilidad en la capa de aplicación.
- Una reseña solo puede crearse sobre una reserva propia y **confirmada**, y como máximo una por reserva (`reservation_id` es `UNIQUE`).

Esquema completo en [`src/db/schema.sql`](./src/db/schema.sql).

## Endpoints

Base URL: `/api`. Los endpoints marcados con 🔒 requieren `Authorization: Bearer <token>`; 🔒👑 requieren además rol `admin`.

### Auth

| Método | Ruta | Descripción | Body | Respuesta |
|---|---|---|---|---|
| POST | `/auth/register` | Registra un usuario nuevo | `{ name, email, password }` | `201 { user, token }` |
| POST | `/auth/login` | Inicia sesión | `{ email, password }` | `200 { user, token }` |
| GET 🔒 | `/auth/me` | Datos del usuario autenticado | — | `200 { user }` |

### Mesas

| Método | Ruta | Descripción | Body / Query | Respuesta |
|---|---|---|---|---|
| GET | `/tables` | Lista mesas, con filtro de disponibilidad | Query: `date?, time?, guests?, location?` | `200 { tables[], total }` |
| POST 🔒👑 | `/tables` | Crea una mesa | `{ number, capacity, location? }` | `201 { table }` |
| PATCH 🔒👑 | `/tables/:id` | Actualiza una mesa | `{ capacity?, location?, is_active? }` | `200 { table }` |

### Reservas

| Método | Ruta | Descripción | Body / Query | Respuesta |
|---|---|---|---|---|
| POST 🔒 | `/reservations` | Crea una reserva (valida capacidad y disponibilidad) | `{ table_id, date, time, guests, notes? }` | `201 { reservation }` |
| GET 🔒 | `/reservations/me` | Reservas del usuario autenticado | Query: `page?, limit?, status?` | `200 { reservations[], page }` |
| GET 🔒 | `/reservations/:id` | Detalle de una reserva (propia, o cualquiera si admin) | — | `200 { reservation }` |
| PATCH 🔒 | `/reservations/:id` | Cambia estado / notas (propia, o cualquiera si admin) | `{ status?, notes? }` | `200 { reservation }` |
| GET 🔒👑 | `/reservations` | Lista todas las reservas | Query: `page?, limit?, date?, status?` | `200 { reservations[], page }` |

### Reseñas

| Método | Ruta | Descripción | Body / Query | Respuesta |
|---|---|---|---|---|
| GET | `/reviews` | Lista reseñas públicas y rating medio | Query: `page?, limit?` | `200 { reviews[], average_rating, page }` |
| POST 🔒 | `/reviews` | Crea una reseña sobre una reserva propia confirmada | `{ reservation_id, rating, comment? }` | `201 { review }` |

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check (uso en orquestadores/monitorización) |
| GET | `/api-docs` | Swagger UI (documentación interactiva OpenAPI) |

Errores comunes: `400` datos de negocio inválidos, `401` sin token / token inválido, `403` sin permiso, `404` recurso no encontrado, `409` conflicto (email duplicado, mesa ya reservada), `422` validación de entrada fallida.

## Puesta en marcha

### Opción A: Docker Compose (recomendado)

Levanta la API y PostgreSQL juntos, con el esquema aplicado automáticamente:

```bash
docker compose up --build
```

La API queda disponible en `http://localhost:3000` (health check en `/health`, docs en `/api-docs`).

### Opción B: entorno local

Requiere Node.js 20+ y una instancia de PostgreSQL accesible.

```bash
cp .env.example .env   # ajusta las variables si es necesario
npm install
npm run dev             # servidor con recarga en caliente (tsx watch)
```

Variables de entorno (`.env.example`):

```env
# Servidor
PORT=3000

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT — cambia esto por un secreto aleatorio en producción
JWT_SECRET=change_this_to_a_long_random_secret
```

Otros scripts:

```bash
npm run build      # compila TypeScript a dist/
npm start           # ejecuta el build compilado
npm run lint        # ESLint sobre src/
```

## Testing

```bash
npm test               # suite completa (Jest + Supertest)
npm run test:coverage  # con reporte de cobertura
```

La suite usa un mock del pool de PostgreSQL (sin base de datos real), y se centra en la **lógica de negocio** más que en CRUDs triviales:

- Validación de capacidad de mesa al crear una reserva.
- Detección de conflictos de disponibilidad (doble reserva en la misma mesa/fecha/hora).
- Control de acceso por ownership (un cliente no puede ver/modificar reservas ajenas) y por rol (`admin`).
- Reglas de reseñas: solo sobre reservas propias confirmadas, sin duplicados.
- Validación de entrada (formatos de fecha/hora, rangos, campos requeridos).

CI (`.github/workflows/ci.yml`) ejecuta `lint`, `build` (typecheck) y `test` en cada push y pull request.

## Documentación OpenAPI

Especificación completa en [`swagger.yaml`](./swagger.yaml), servida de forma interactiva en `/api-docs` (Swagger UI) al levantar el servidor. Incluye esquemas de request/response, autenticación Bearer y ejemplos por endpoint.
