-- =============================================================================
-- LAUNDROQR — MIGRATION 0001: INITIAL MULTI-TENANT SCHEMA
-- =============================================================================
-- Entities:
--   1. organizations
--   2. buildings
--   3. laundry_rooms
--   4. machines
--   5. memberships
--   6. machine_sessions
--   7. maintenance_tickets
--   8. machine_state_events
--   9. audit_logs
--  10. notification_preferences & device_tokens (Phase 8)
--  11. machine_reservations (Phase 9)
--  12. telemetry_events (Phase 10)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.organization_type AS ENUM ('university', 'kyk', 'private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_role AS ENUM (
    'platform_admin',
    'organization_admin',
    'laundry_staff',
    'resident'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('active', 'suspended', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.machine_type AS ENUM ('washer', 'dryer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.machine_status AS ENUM (
    'available',
    'in_use',
    'cycle_complete',
    'out_of_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_source_type AS ENUM (
    'software',
    'user_report',
    'sensor',
    'admin',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM (
    'active',
    'completed',
    'cancelled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. UPDATED_AT TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. CORE TABLES
-- -----------------------------------------------------------------------------

-- 3.1 organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  slug          TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  type          public.organization_type NOT NULL DEFAULT 'university',
  contact_email TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.2 buildings
CREATE TABLE IF NOT EXISTS public.buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  code            TEXT NOT NULL,
  address         TEXT,
  floor_count     INT CHECK (floor_count IS NULL OR floor_count > 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_buildings_org ON public.buildings(organization_id);

CREATE TRIGGER trg_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.3 laundry_rooms
CREATE TABLE IF NOT EXISTS public.laundry_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  building_id     UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  floor           INT NOT NULL DEFAULT 0,
  operating_hours TEXT NOT NULL DEFAULT '07:00 - 23:00',
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laundry_rooms_org ON public.laundry_rooms(organization_id);
CREATE INDEX IF NOT EXISTS idx_laundry_rooms_building ON public.laundry_rooms(building_id);

CREATE TRIGGER trg_laundry_rooms_updated_at
  BEFORE UPDATE ON public.laundry_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.4 machines
CREATE TABLE IF NOT EXISTS public.machines (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  laundry_room_id          UUID NOT NULL REFERENCES public.laundry_rooms(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  machine_number           INT NOT NULL CHECK (machine_number > 0),
  machine_type             public.machine_type NOT NULL DEFAULT 'washer',
  brand                    TEXT,
  model                    TEXT,
  status                   public.machine_status NOT NULL DEFAULT 'available',
  status_source            public.status_source_type NOT NULL DEFAULT 'software',
  default_duration_minutes INT NOT NULL DEFAULT 45 CHECK (default_duration_minutes BETWEEN 10 AND 240),
  qr_code_id               UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  qr_rotated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active                BOOLEAN NOT NULL DEFAULT true,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (laundry_room_id, machine_number)
);

CREATE INDEX IF NOT EXISTS idx_machines_org ON public.machines(organization_id);
CREATE INDEX IF NOT EXISTS idx_machines_room ON public.machines(laundry_room_id);
CREATE INDEX IF NOT EXISTS idx_machines_qr ON public.machines(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(organization_id, status);

CREATE TRIGGER trg_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.5 memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  building_id     UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  email           TEXT NOT NULL,
  room_number     TEXT,
  role            public.membership_role NOT NULL DEFAULT 'resident',
  status          public.membership_status NOT NULL DEFAULT 'active',
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON public.memberships(organization_id, role);

CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.6 machine_sessions
CREATE TABLE IF NOT EXISTS public.machine_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  laundry_room_id     UUID NOT NULL REFERENCES public.laundry_rooms(id) ON DELETE CASCADE,
  machine_id          UUID NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  program_name        TEXT NOT NULL DEFAULT 'Standart Yıkama (40°C)',
  status              public.session_status NOT NULL DEFAULT 'active',
  estimated_duration  INT NOT NULL CHECK (estimated_duration BETWEEN 10 AND 240),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_end_at    TIMESTAMPTZ NOT NULL,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (estimated_end_at > started_at)
);

-- Critical concurrency guard: at most ONE active session per machine at any time
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_session_per_machine
  ON public.machine_sessions (machine_id)
  WHERE status = 'active';

-- Optional resident fairness guard: at most 2 concurrent active sessions per resident
CREATE INDEX IF NOT EXISTS idx_sessions_org ON public.machine_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_machine ON public.machine_sessions(machine_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.machine_sessions(user_id);

-- 3.7 maintenance_tickets
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  reported_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title           TEXT NOT NULL CHECK (char_length(trim(title)) >= 4),
  description     TEXT NOT NULL CHECK (char_length(trim(description)) >= 5),
  priority        public.ticket_priority NOT NULL DEFAULT 'medium',
  status          public.ticket_status NOT NULL DEFAULT 'open',
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_org ON public.maintenance_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_machine ON public.maintenance_tickets(machine_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.maintenance_tickets(organization_id, status);

CREATE TRIGGER trg_maintenance_tickets_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.8 machine_state_events
CREATE TABLE IF NOT EXISTS public.machine_state_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES public.machine_sessions(id) ON DELETE SET NULL,
  from_status     public.machine_status,
  to_status       public.machine_status NOT NULL,
  source          public.status_source_type NOT NULL,
  actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_events_machine ON public.machine_state_events(machine_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_events_org ON public.machine_state_events(organization_id, occurred_at DESC);

-- 3.9 audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role      TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- 4. PHASE 8 SUPPORT: NOTIFICATION PREFERENCES & DEVICE TOKENS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_before_end_mins   INT NOT NULL DEFAULT 5 CHECK (notify_before_end_mins BETWEEN 1 AND 30),
  notify_on_cycle_complete BOOLEAN NOT NULL DEFAULT true,
  notify_on_maintenance    BOOLEAN NOT NULL DEFAULT true,
  push_enabled             BOOLEAN NOT NULL DEFAULT true,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  fcm_token   TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);

-- -----------------------------------------------------------------------------
-- 5. PHASE 9 SUPPORT: QUEUES & RESERVATIONS (NON-OVERLAPPING)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.machine_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reserved_from   TIMESTAMPTZ NOT NULL,
  reserved_until  TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'claimed', 'cancelled', 'no_show')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reserved_until > reserved_from),
  EXCLUDE USING gist (
    machine_id WITH =,
    tstzrange(reserved_from, reserved_until, '[)') WITH &&
  ) WHERE (status = 'scheduled')
);

-- -----------------------------------------------------------------------------
-- 6. PHASE 10 SUPPORT: HARDWARE-READY TELEMETRY INTERFACE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,
  reading_type    TEXT NOT NULL CHECK (reading_type IN ('current_draw_watts', 'vibration_rms', 'door_lock', 'heartbeat')),
  reading_value   NUMERIC NOT NULL,
  nonce           TEXT NOT NULL,
  quality         TEXT NOT NULL DEFAULT 'valid' CHECK (quality IN ('valid', 'stale', 'suspect')),
  measured_at     TIMESTAMPTZ NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, nonce)
);
