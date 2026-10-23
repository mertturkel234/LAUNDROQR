# LaundroQR — Sistem Mimarisi

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## 1. Genel Bakış

LaundroQR, üç ana bileşenden oluşan bir monorepo yapısındadır:

```
┌─────────────────────────────────────────────────────┐
│                    LaundroQR                        │
│                                                     │
│  ┌──────────────┐    ┌──────────────┐               │
│  │  Flutter App │    │  Next.js     │               │
│  │  (Mobile)    │    │  Admin Panel │               │
│  │  Sakinler    │    │  Yöneticiler │               │
│  └──────┬───────┘    └──────┬───────┘               │
│         │                  │                        │
│         └──────────┬────────┘                       │
│                    │                                │
│           ┌────────▼────────┐                       │
│           │   Supabase      │                       │
│           │  ┌───────────┐  │                       │
│           │  │ Auth      │  │                       │
│           │  │ PostgREST │  │                       │
│           │  │ Realtime  │  │                       │
│           │  │ Storage   │  │                       │
│           │  └───────────┘  │                       │
│           │  ┌───────────┐  │                       │
│           │  │ PostgreSQL│  │                       │
│           │  │ + RLS     │  │                       │
│           │  └───────────┘  │                       │
│           └─────────────────┘                       │
└─────────────────────────────────────────────────────┘
```

---

## 2. Bileşenler

### 2.1 Flutter Mobil Uygulaması (`apps/mobile/`)

- **Platform:** Android ve iOS
- **Mimari:** Feature-first klasör yapısı, BLoC veya Riverpod state management
- **İletişim:** Supabase Flutter SDK (PostgREST + Auth + Realtime)
- **QR Tarama:** `mobile_scanner` paketi
- **Yerel Depolama:** Minimal; oturum token'ı Supabase SDK tarafından yönetilir

**Önemli Kısıt:** Uygulama paketine hiçbir gizli bilgi (service-role key, private key) eklenmez. Yalnızca `SUPABASE_URL` ve `SUPABASE_ANON_KEY` kullanılır; bunlar anon key olup RLS ile korunur.

### 2.2 Next.js Admin Paneli (`apps/admin/`)

- **Framework:** Next.js 15 (App Router), TypeScript
- **Supabase İstemcisi:** `@supabase/ssr` ile sunucu tarafı cookie yönetimi
- **Yetkilendirme:** Server Components + Route Handlers; client-side check tek güvenlik katmanı değildir
- **UI:** Shadcn/ui bileşenleri (Radix UI + Tailwind CSS)

**Önemli Kısıt:** `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu tarafı Route Handlers'da kullanılır; tarayıcıya hiçbir zaman iletilmez.

### 2.3 Supabase Backend

- **Veritabanı:** PostgreSQL 15+
- **Kimlik Doğrulama:** Supabase Auth (JWT tabanlı)
- **Yetkilendirme:** Row Level Security (RLS) — tüm korumalı tablolarda etkin
- **API:** PostgREST (otomatik REST API)
- **Gerçek Zamanlı:** Supabase Realtime (makine durumu değişiklikleri)
- **Dosya Depolama:** Supabase Storage (QR kod görselleri, varsa)

---

## 3. Veri Akışı

### 3.1 Seans Başlatma Akışı

```
Sakin                   Flutter App              Supabase
  │                         │                       │
  ├─ QR Tarat ──────────────►│                       │
  │                         ├─ QR ID doğrula ───────►│
  │                         │◄─ Makine bilgisi ──────┤
  │                         │  + durum: available    │
  │                         │                        │
  ├─ "Seans Başlat" ────────►│                       │
  │                         ├─ RPC: start_session() ►│
  │                         │                        ├─ BEGIN TRANSACTION
  │                         │                        ├─ LOCK makine kaydı
  │                         │                        ├─ Durum: in_use
  │                         │                        ├─ Seans kaydı oluştur
  │                         │                        ├─ COMMIT
  │                         │◄─ Seans detayları ─────┤
  │◄─ Seans başladı ────────┤                       │
  │   (tahmini bitiş saati) │                        │
```

### 3.2 Gerçek Zamanlı Durum Güncellemesi

```
Makine durumu değişir
        │
        ▼
  Supabase Realtime ──► Flutter App (ilgili seans)
                    └──► Admin Panel (yönetici görünümü)
```

---

## 4. Güvenlik Katmanları

| Katman | Mekanizma | Açıklama |
|---|---|---|
| Ağ | HTTPS/TLS | Tüm trafikte |
| Kimlik Doğrulama | Supabase Auth JWT | Her istek için token doğrulama |
| Yetkilendirme | PostgreSQL RLS | Her tabloda, sunucu tarafı |
| Organizasyon İzolasyonu | RLS politikaları | `org_id` kontrolü her sorguda |
| Rol Kontrolü | JWT claims + RLS | `platform_admin`, `org_admin`, `laundry_staff`, `resident` |
| Gizli Bilgi | Ortam değişkenleri | Asla kod veya repoya eklenmez |

---

## 5. Çoklu Kiracı (Multi-Tenant) Mimarisi

Tüm kiracı verisi tek PostgreSQL veritabanında tutulur; RLS ile izole edilir.

```sql
-- Örnek RLS politikası
CREATE POLICY "resident_sees_own_org_machines"
  ON machines FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );
```

Her sorgu `auth.uid()` üzerinden çalıştığı için bir kullanıcı başka organizasyonun verilerine erişemez.

---

## 6. Makine Durum Makinesi

```
         ┌─────────────────────────────────────┐
         │                                     │
         ▼                                     │
    [available] ──── seans başlat ────► [in_use]
         ▲                                     │
         │                                     ▼
    [cycle_complete] ◄─── tahmini süre doldu ──┤
         │                                     │
    personel/sakin                        iptal/hata
    "boşalttım" bildir                        │
         │                                     ▼
         └────────────── ◄─────────── [cancelled/expired]
         
    [out_of_service] ◄── arıza bildirimi (herhangi durumdan)
    [out_of_service] ──── onarım tamamlandı ──► [available]
```

**Önemli Not:** `cycle_complete` durumu makinenin fiziksel olarak boş olduğunu **garanti etmez**. Bu yalnızca tahmini sürenin dolduğunu gösterir.

---

## 7. Donanım Entegrasyonu için Genişletilebilirlik (Faz 10)

Mimari, ileride gerçek sensör verisi almak için bir `telemetry_events` tablosu ve webhook/MQTT entegrasyonu için alan bırakır. Sensör verisi geldiğinde `estimated` etiketli durumların yerini `sensor_confirmed` alacak.

---

## 8. Monorepo Yapısı

```
laundroqr/
├── apps/
│   ├── mobile/              # Flutter projesi
│   │   ├── lib/
│   │   │   ├── core/        # Paylaşılan yardımcılar, sabitler
│   │   │   ├── features/    # Feature-first modüller
│   │   │   │   ├── auth/
│   │   │   │   ├── machines/
│   │   │   │   ├── sessions/
│   │   │   │   └── maintenance/
│   │   │   └── main.dart
│   │   └── pubspec.yaml
│   └── admin/               # Next.js projesi
│       ├── app/             # App Router
│       │   ├── (auth)/
│       │   ├── (dashboard)/
│       │   └── api/
│       ├── components/
│       ├── lib/
│       └── package.json
├── supabase/
│   ├── migrations/          # 0001_xxx.sql, 0002_xxx.sql ...
│   ├── seed.sql             # Demo verisi
│   └── tests/              # pgTAP RLS testleri
├── docs/
├── .github/
│   └── workflows/
├── .env.example
└── README.md
```
