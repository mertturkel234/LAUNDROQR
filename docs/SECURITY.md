# LaundroQR — Güvenlik Modeli

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## 1. Güvenlik Prensipleri

1. **Varsayılan olarak erişim reddi:** RLS politikaları olmayan tablolara erişim mümkün değildir.
2. **Sunucu taraflı yetkilendirme:** UI kontrolü tek güvenlik katmanı değildir.
3. **En az ayrıcalık:** Her rol yalnızca gereken izinlere sahiptir.
4. **Derinlemesine savunma:** Birden fazla güvenlik katmanı kullanılır.
5. **Gizli bilgi sıfır:** Kod veya repoda kimlik bilgisi bulunmaz.
6. **Denetlenebilirlik:** Kritik işlemler `audit_logs` tablosuna kaydedilir.

---

## 2. Kimlik Doğrulama

### 2.1 Supabase Auth

- E-posta + şifre tabanlı (Supabase Auth)
- JWT token, istemci tarafında güvenli depolanır (Supabase SDK yönetir)
- Token süresi: 1 saat (erişim), 7 gün (yenileme) — Supabase varsayılanı
- Şifre sıfırlama: Supabase e-posta akışı

### 2.2 Oturum Güvenliği

```
İstemci                    Supabase Auth
   │                            │
   ├─ POST /auth/v1/token ──────►│
   │◄─ access_token + 
   │   refresh_token ───────────┤
   │                            │
   │   (Her API çağrısında)     │
   ├─ Bearer access_token ──────►│
   │◄─ RLS + kullanıcı context ─┤
```

### 2.3 Genel Kayıt Yasağı

Genel kullanıcı kaydı **devre dışıdır**. Sakinler yalnızca yetkili davet akışı veya yönetici atamasıyla erişim kazanır. Bu kontrol hem Supabase Auth ayarlarında hem de uygulama mantığında zorlanır.

---

## 3. Yetkilendirme ve Roller

### 3.1 Rol Tanımları

| Rol | Erişim Kapsamı |
|---|---|
| `platform_admin` | Tüm organizasyonlar; yalnızca platform sahibi |
| `org_admin` | Kendi organizasyonu; tüm yönetim işlemleri |
| `laundry_staff` | Kendi organizasyonu; makine + bilet yönetimi, üye ekleme yok |
| `resident` | Kendi organizasyonu; yalnızca okuma + seans + arıza bildirimi |

### 3.2 Rol Güvenliği

- Kullanıcılar kendi rollerini değiştiremez veya ayrıcalıklı rol atayamaz
- Rol ataması yalnızca `org_admin` veya `platform_admin` yetkisiyle mümkün
- Roller `memberships.role` alanında saklanır ve RLS politikaları bu alanı okur
- JWT claim'de rol yoktur; rol her sorguda `memberships` tablosundan doğrulanır

---

## 4. Row Level Security (RLS)

### 4.1 Genel Kural

```sql
-- Tüm tablolarda RLS varsayılan olarak açıktır
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- Varsayılan: hiçbir satıra erişim yok (deny-by-default)
```

### 4.2 Kiracı İzolasyonu

Her tablo, kullanıcının yalnızca kendi organizasyonunun verilerini görmesini sağlayan bir politikaya sahiptir:

```sql
-- Örnek: machines tablosu için resident okuma politikası
CREATE POLICY "resident_select_machines"
  ON machines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM laundry_rooms lr
      JOIN buildings b ON b.id = lr.building_id
      JOIN memberships m ON m.organization_id = b.organization_id
      WHERE lr.id = machines.laundry_room_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );
```

### 4.3 Seans Politikaları

```sql
-- Sakin yalnızca kendi seanslarını görebilir
CREATE POLICY "resident_select_own_sessions"
  ON machine_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Org admin tüm seansları görebilir
CREATE POLICY "org_admin_select_all_sessions"
  ON machine_sessions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'laundry_staff')
        AND status = 'active'
    )
  );
```

---

## 5. Gizli Bilgi Yönetimi

### 5.1 Kesinlikle Yasak

- `SUPABASE_SERVICE_ROLE_KEY` → Mobil uygulama paketine **asla** eklenmez
- `SUPABASE_SERVICE_ROLE_KEY` → Git reposuna **asla** eklenmez
- Gerçek API anahtarları → `.env.example` dosyasına **asla** eklenmez

### 5.2 İzin Verilen

- `SUPABASE_URL` → Mobil + Admin (herkese açık endpoint)
- `SUPABASE_ANON_KEY` → Mobil + Admin (RLS ile korunur)
- `SUPABASE_SERVICE_ROLE_KEY` → Yalnızca sunucu tarafı Route Handlers (Next.js API)

### 5.3 Ortam Değişkeni Katmanları

```
.env.example          # Şablon, sadece yer tutucular, repoda
.env.local            # Geliştirme değerleri, repoda değil (.gitignore)
.env.production       # Üretim değerleri, CI/CD secrets, repoda değil
```

---

## 6. QR Kod Güvenliği

- Her makine için benzersiz `qr_code_id` (UUID v4) kullanılır
- QR tarandığında, backend `qr_code_id` doğrular; URL manipülasyonu reddedilir
- QR ID değiştirme (rotation) yalnızca yetkili admin işlemi olarak kayıt altına alınır
- Eski QR ID'ler geçersiz kılınır; seanslar aktif QR ID'ye bağlı değildir

---

## 7. Seans Güvenliği

### 7.1 Yarış Koşulu Önleme

```sql
-- Partial unique index: bir makinede yalnızca bir aktif seans
CREATE UNIQUE INDEX uq_one_active_session_per_machine
  ON machine_sessions (machine_id)
  WHERE status = 'active';
```

Bu index, eş zamanlı iki seans başlatma denemesini veritabanı katmanında engeller.

### 7.2 Zaman Damgası Güvenliği

- `started_at` ve `completed_at` sunucu tarafında `now()` ile belirlenir
- İstemci tarafından gönderilen zaman damgaları kritik alanlarda **kabul edilmez**
- `estimated_end_at` hesaplanan (generated) bir alan olup değiştirilemez

---

## 8. Veri Minimizasyonu

- Kullanıcı profili: yalnızca e-posta ve opsiyonel görünen ad
- Audit log: eylem meta verisi kaydedilir, şifre veya token kaydedilmez
- Bildirim: payload'da gereksiz kişisel veri gönderilmez

---

## 9. Bilinen Sınırlamalar

| Sınırlama | Etki | Hafifletme |
|---|---|---|
| QR kod fiziksel doğrulama yok | Makine durumu tahmine dayalı | Açık etiketleme; `status_source` alanı |
| Yazılım timer'ı gerçek döngüyü garanti etmez | Yanlış "cycle_complete" olası | Kullanıcı onayı gerektirilir |
| Tek veritabanı | Tüm kiracı verisi bir yerde | RLS ile zorlanan izolasyon |
| Mobil QR manipülasyonu | Sahte QR ID denenebilir | Backend doğrulama zorunludur |

---

## 10. Güvenlik Test Gereksinimleri

- [ ] Her tabloda RLS etkin — doğrulanacak
- [ ] Çapraz kiracı erişim deneyi reddedilir — test edilecek
- [ ] Sakin admin endpoint'i çağıramaz — test edilecek
- [ ] Geçersiz QR ID seansı reddedilir — test edilecek
- [ ] Eş zamanlı seans başlatma tek seansla sonuçlanır — test edilecek
- [ ] Service-role key tarayıcıya iletilmez — derleme kontrolü
- [ ] Gizli bilgi repoda yoktur — CI secret scan
