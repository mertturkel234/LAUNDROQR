# LaundroQR — Dağıtım, Kurumsal Pilot Hazırlığı ve Olay Müdahale Kılavuzu

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## 1. Kurumsal Pilot Öncesi Zorunlu Kontrol Listesi

Bir üniversite yurdu, KYK yurdu veya özel öğrenci yurdunda gerçek kullanıcılarla pilot başlatmadan önce aşağıdaki idari ve teknik adımlar tamamlanmalıdır:

1. **Kurumsal İzin ve Sorumluluk:**
   - Yurt yönetimi ile yazılı pilot protokolü imzalanmalıdır.
   - KYK yurtları için Gençlik ve Spor Bakanlığı / İl Müdürlüğü resmi onayı olmadan saha kurulumu yapılmamalıdır.
2. **KVKK ve Veri Koruma Yükümlülükleri:**
   - Öğrencilerden yalnızca hizmet için zorunlu minimum veri (kurumsal e-posta, ad/soyad veya oda numarası) toplanmalıdır.
   - Açık rıza ve aydınlatma metni giriş ekranında sunulmalıdır.
   - Yurt ilişiği kesilen öğrencilerin üyelikleri (`memberships`) iptal edilmeli ve kişisel verileri saklama politikası sonunda anonimleştirilmelidir.
3. **Yazılım Tabanlı Takibin Bilinen Sınırlamaları:**
   - QR etiketlerinin yanına ve uygulama içine *"Bu sistem yazılım zamanlayıcısı ile çalışır; makinenin fiziksel olarak boş veya çalışır olduğunu sensörsüz doğrulayamaz"* uyarısı yerleştirilmelidir.

---

## 2. Veritabanı Migration ve Yedekleme Prosedürü

### 2.1 Migration Uygulama Sırası
1. `supabase/migrations/20261023000001_initial_schema.sql`
2. `supabase/migrations/20261023000002_rls_and_rpcs.sql`
3. Doğrulama: `supabase/tests/rls_and_concurrency_test.sql` betiğini çalıştırarak tüm 13 tabloda RLS'nin açık olduğunu ve eşzamanlı seans engelinin çalıştığını doğrulayın.
4. *(Yalnızca Test/Demo Ortamında)*: `supabase/seed.sql`

### 2.2 Yedekleme ve Geri Dönüş (Backup & Rollback)
- Supabase Pro / kurumsal ortamda günlük otomatik Point-in-Time Recovery (PITR) etkinleştirilmelidir.
- Her şema değişikliği öncesinde `pg_dump` ile şema ve veri yedeği alınmalıdır.
- Hatalı bir dağıtımda Next.js uygulaması önceki Vercel/Docker imajına geri alınır; veritabanında yıkıcı (destructive) `DROP COLUMN` işlemleri iki aşamalı (önce koddan kaldırma, sonra migration) uygulanır.

---

## 3. Makine Durumu Düzeltme ve Destek Prosedürü

1. **Asılı Kalan Seans (`cycle_complete` veya `in_use`):**
   - Bir öğrenci çamaşırlarını aldığı halde uygulamadan onay vermeyi unutursa, sıradaki öğrenci veya çamaşırhane görevlisi **"Makine Boşaltıldı Onayla"** aksiyonu ile makineyi `available` durumuna geçirebilir.
2. **Yıpranmış veya Kopyalanmış QR Etiketi:**
   - Çamaşırhane görevlisi yönetim panelinden **3. Makine Envanteri & QR Kodlar → QR Kodu Güvenli Yenile (Rotate)** butonunu kullanarak eski QR UUID'yi anında geçersiz kılar ve yeni etiketi basar.

---

## 4. Donanım (IoT Sensör) Entegrasyonuna Hazırlık (Faz 10)

- Veritabanında `public.telemetry_events` tablosu (`device_id`, `reading_type`, `reading_value`, `nonce`, `quality`, `measured_at`) hazırdır.
- Onaylı bir elektrik/güvenlik planı olmadan fiziksel çamaşır makinelerinin elektrik tesisatına müdahale edilmemeli; yalnızca dışarıdan temassız titreşim sensörü veya sertifikalı endüstriyel akıllı priz telemetrisi kullanılmalıdır.
