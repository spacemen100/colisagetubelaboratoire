-- Suppression des tables existantes (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS tubes;
DROP TABLE IF EXISTS boxes;
DROP TABLE IF EXISTS laboratories;
DROP TABLE IF EXISTS users;

-- Recréation des tables avec UUID

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Laboratories table
CREATE TABLE laboratories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

-- Boxes table (créée avant tubes car tubes référence boxes)
CREATE TABLE boxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  temperature_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  source_lab_id UUID NOT NULL REFERENCES laboratories(id),
  destination_lab_id UUID REFERENCES laboratories(id),
  tube_count INTEGER NOT NULL DEFAULT 0,
  pickup_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  transporter_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Tubes table
CREATE TABLE tubes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  collection_date TIMESTAMPTZ NOT NULL,
  temperature_requirement TEXT NOT NULL,
  box_id UUID REFERENCES boxes(id),
  status TEXT NOT NULL DEFAULT 'pending',
  lab_id UUID NOT NULL REFERENCES laboratories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  tube_id UUID REFERENCES tubes(id),
  box_id UUID REFERENCES boxes(id),
  lab_id UUID NOT NULL REFERENCES laboratories(id),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  details JSONB,
  user_id UUID NOT NULL REFERENCES users(id),
  lab_id UUID NOT NULL REFERENCES laboratories(id),
  tube_id UUID REFERENCES tubes(id),
  box_id UUID REFERENCES boxes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);