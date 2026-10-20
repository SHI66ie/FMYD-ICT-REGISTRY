-- ============================================================
--  FMYD ICT Department File Registry — PostgreSQL Schema
--  Run this file against your PostgreSQL instance:
--    psql -U postgres -f schema.sql
-- ============================================================

-- NOTE: Create the database manually first, then connect to it:
--   CREATE DATABASE fmyd_registry;
--   \c fmyd_registry

-- Enable UUID generation (built-in in PG 13+; also available via pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
--  TABLE: users
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'staff'
                                CHECK (role IN ('admin', 'staff')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
--  TABLE: files
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    file_number      VARCHAR(100)  NOT NULL UNIQUE,
    title            VARCHAR(500)  NOT NULL,
    date_logged      DATE          NOT NULL,
    reference_number VARCHAR(200),
    type             VARCHAR(20)   NOT NULL
                                   CHECK (type IN ('incoming', 'outgoing')),
    origin           VARCHAR(300),
    destination      VARCHAR(300),
    action_officer   VARCHAR(300),
    status           VARCHAR(50)   NOT NULL DEFAULT 'Pending'
                                   CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Returned')),
    remarks          TEXT,
    scan_path        VARCHAR(500),
    created_by       UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
--  INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_files_type        ON files(type);
CREATE INDEX IF NOT EXISTS idx_files_status      ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_date_logged ON files(date_logged);
CREATE INDEX IF NOT EXISTS idx_files_created_at  ON files(created_at DESC);

-- ────────────────────────────────────────────────────────────
--  TRIGGER: auto-update updated_at on files
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_files_updated_at ON files;
CREATE TRIGGER trg_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
--  SEED: Default admin user
--  username : admin
--  password : admin123  (bcrypt hash, cost 10)
-- ────────────────────────────────────────────────────────────
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
    'admin',
    '$2a$10$.4h4GonB27Ajqa2iAhTJ..h7G7.le.8dC91IgiRyu2bTBcMh9gA7u', -- "admin123"
    'System Administrator',
    'admin'
)
ON CONFLICT (username) DO NOTHING;
