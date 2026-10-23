# LaundroQR — Veritabanı Şeması

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## 1. Varlık İlişki Özeti

```
organizations
    │
    ├── memberships (users ↔ organizations)
    │
    ├── buildings
    │       └── laundry_rooms
    │               └── machines
    │                       ├── machine_sessions
    │                       ├── machine_state_events
    │                       └── maintenance_tickets
    │
    └── audit_logs
```

---

## 2. Tablolar

### 2.1 `organizations`

```sql
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,        -- URL-safe kısa isim
  type          TEXT NOT NULL CHECK (type IN ('university', 'kyk', 'private')),
  contact_email TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 `buildings`

```sql
CREATE TABLE buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  floor_count     INT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_buildings_org ON buildings(organization_id);
```

### 2.3 `laundry_rooms`

```sql
CREATE TABLE laundry_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,             -- örn. "Bodrum Çamaşırhane"
  floor       INT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_laundry_rooms_building ON laundry_rooms(building_id);
```

### 2.4 `machines`

```sql
CREATE TYPE machine_status AS ENUM (
  'available',
  'in_use',
  'cycle_complete',
  'out_of_service'
);

CREATE TABLE machines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_room_id UUID NOT NULL REFERENCES laundry_rooms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,          -- örn. "Makine 3"
  brand           TEXT,
  model           TEXT,
  status          machine_status NOT NULL DEFAULT 'available',
  status_source   TEXT NOT NULL DEFAULT 'software'
                  CHECK (status_source IN ('software', 'user_report', 'sensor')),
  qr_code_id      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  qr_rotated_at   TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_machines_laundry_room ON machines(laundry_room_id);
CREATE INDEX idx_machines_qr_code ON machines(qr_code_id);
```

**Önemli:** `status_source = 'software'` durumunda makine durumu fiziksel gerçekliği **garanti etmez**.

### 2.5 `memberships`

```sql
CREATE TYPE membership_role AS ENUM (
  'platform_admin',
  'org_admin',
  'laundry_staff',
  'resident'
);

CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            membership_role NOT NULL DEFAULT 'resident',
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'revoked')),
  invited_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);
```

**Güvenlik:** Kullanıcılar kendi rollerini değiştiremez. Rol ataması yalnızca `org_admin` veya `platform_admin` tarafından yapılır.

### 2.6 `machine_sessions`

```sql
CREATE TYPE session_status AS ENUM (
  'active',
  'completed',
  'cancelled',
  'expired'
);

CREATE TABLE machine_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id          UUID NOT NULL REFERENCES machines(id),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  organization_id     UUID NOT NULL,    -- denormalize, RLS için
  status              session_status NOT NULL DEFAULT 'active',
  estimated_duration  INT NOT NULL,     -- dakika
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_end_at    TIMESTAMPTZ NOT NULL
                      GENERATED ALWAYS AS (started_at + (estimated_duration || ' minutes')::INTERVAL) STORED,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_machine ON machine_sessions(machine_id);
CREATE INDEX idx_sessions_user ON machine_sessions(user_id);
CREATE INDEX idx_sessions_org ON machine_sessions(organization_id);
CREATE INDEX idx_sessions_active ON machine_sessions(machine_id) WHERE status = 'active';
```

**Kısıt:** Bir makinede aynı anda yalnızca bir `active` seans olabilir. Bu kısıt DB transaction + advisory lock ile zorlanır; `UNIQUE INDEX` ile değil (çünkü bu optimistic locking güvenli değildir).

### 2.7 `maintenance_tickets`

```sql
CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TABLE maintenance_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID NOT NULL REFERENCES machines(id),
  reported_by     UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          ticket_status NOT NULL DEFAULT 'open',
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_machine ON maintenance_tickets(machine_id);
CREATE INDEX idx_tickets_org ON maintenance_tickets(organization_id);
```

### 2.8 `machine_state_events`

```sql
CREATE TABLE machine_state_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  UUID NOT NULL REFERENCES machines(id),
  session_id  UUID REFERENCES machine_sessions(id),
  from_status machine_status,
  to_status   machine_status NOT NULL,
  source      TEXT NOT NULL
              CHECK (source IN ('software', 'user_report', 'sensor', 'admin', 'system')),
  actor_id    UUID REFERENCES auth.users(id),
  notes       TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_state_events_machine ON machine_state_events(machine_id);
```

### 2.9 `audit_logs`

```sql
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,             -- örn. 'machine.qr_rotated'
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  org_id      UUID,
  ip_address  INET,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

**Not:** `audit_logs` gizli bilgi içermez; yalnızca eylem meta verisi kaydedilir.

---

## 3. Makine Durum Geçişleri

| Kaynak Durum | Hedef Durum | Yetkili | Tetikleyici |
|---|---|---|---|
| `available` | `in_use` | Resident | Seans başlatma |
| `in_use` | `cycle_complete` | Sistem | Tahmini süre dolumu |
| `in_use` | `available` | Sistem | Seans iptali |
| `cycle_complete` | `available` | Resident / Staff | "Boşalttım" bildirimi |
| `*` | `out_of_service` | Resident / Staff / Admin | Arıza bildirimi |
| `out_of_service` | `available` | Staff / Admin | Onarım tamamlandı |

---

## 4. Önemli İndeksler

```sql
-- Aktif seans varlığı kontrolü için (seans başlatma critical path)
CREATE UNIQUE INDEX uq_one_active_session_per_machine
  ON machine_sessions (machine_id)
  WHERE status = 'active';
```

Bu `UNIQUE PARTIAL INDEX`, bir makinede birden fazla aktif seans oluşturulmasını **veritabanı katmanında** engeller.

---

## 5. Silme Davranışı

| İşlem | Davranış |
|---|---|
| Organizasyon silme | Cascade: binalar, odalar, makineler silinir |
| Kullanıcı silme | Memberships silindi, session/audit kayıtları korunur |
| Makine silme | Geçmiş seanslar ve biletler korunur |

**Veri Saklama:** Kişisel verilerin tutulma süresi, KVKK kapsamında ileri aşamada belgelenecektir.

---

## 6. Migration Stratejisi

- Her migration `supabase/migrations/YYYYMMDDHHMMSS_description.sql` formatında
- Migration'lar sıralı uygulanır; geri alınamaz değişiklikler dikkatli planlanır
- Üretimde `supabase db push` veya CI/CD pipeline ile uygulanır
- Hiçbir migration dosyasında gerçek üretim verisi bulunmaz
