CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE table_location AS ENUM ('interior', 'terraza');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  location table_location DEFAULT 'interior',
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  guests INTEGER NOT NULL,
  status reservation_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlap UNIQUE (table_id, date, time)
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: mesas del restaurante
INSERT INTO tables (number, capacity, location) VALUES
  (1, 2, 'interior'),
  (2, 2, 'interior'),
  (3, 4, 'interior'),
  (4, 4, 'interior'),
  (5, 6, 'interior'),
  (6, 2, 'terraza'),
  (7, 4, 'terraza'),
  (8, 4, 'terraza'),
  (9, 6, 'terraza'),
  (10, 8, 'terraza');

-- Seed: usuario admin
INSERT INTO users (name, email, password, role) VALUES
  ('Admin', 'admin@restaurant.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- password: password
