# LaundroQR — Test Planı ve Doğrulama Stratejisi

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## 1. Test Felsefesi

1. **Kanıtsız başarı iddiası yasaktır:** Çalıştırılmayan hiçbir test "geçti" olarak raporlanamaz.
2. **Güvenlik testleri vazgeçilmezdir:** RLS politikaları ve rol kontrolleri her şema değişikliğinde doğrulanır.
3. **Gerçekçi sınır testleri:** Eşzamanlı seans başlatma, süresi dolmuş oturumlar, geçersiz QR kodları ve çapraz kiracı (cross-tenant) erişim denemeleri test edilir.
4. **Üretim verisi kullanılmaz:** Tüm testler izole test/seed verileriyle çalışır.

---

## 2. Test Katmanları

### 2.1 Veritabanı ve RLS Testleri (`supabase/tests/`)
- **Araç:** pgTAP / SQL doğrulama betikleri
- **Kapsam:**
  - `T-DB-01`: Tüm korumalı tablolarda RLS'nin etkin (`rowsecurity = true`) olduğunun doğrulanması.
  - `T-DB-02`: Kiracı İzolasyonu — Yurt A'daki bir `resident`, Yurt B'deki binaları, makineleri veya seansları okuyamaz.
  - `T-DB-03`: Rol Kısıtlaması — `resident` rolündeki kullanıcı kendi rolünü `org_admin` yapamaz, makine ekleyemez veya QR kod döndüremez.
  - `T-DB-04`: Eşzamanlılık — Aynı makinede (`status = 'available'`) iki aktif seans oluşturulması `uq_one_active_session_per_machine` indeksi ve `start_machine_session` RPC'si tarafından reddedilir.
  - `T-DB-05`: Zaman Damgası Bütünlüğü — `estimated_end_at` alanının sunucu tarafında `started_at + estimated_duration` olarak doğru hesaplanması.

### 2.2 Web Yönetim Paneli Testleri (`apps/admin/`)
- **Araçlar:** Vitest / React Testing Library, TypeScript (`tsc --noEmit`), ESLint
- **Kapsam:**
  - `T-WEB-01`: Kimlik doğrulama ve yetki koruma (Middleware / Server Guard testleri).
  - `T-WEB-02`: Makine durumu ve doğrulama kaynağı (`software`, `user_report`, `sensor`) etiketlerinin doğru ve dürüst gösterimi.
  - `T-WEB-03`: Form doğrulama şemaları (Zod) — geçersiz makine adı, negatif süre, geçersiz rol ataması reddi.
  - `T-WEB-04`: QR kod oluşturma ve rotasyon onay akışı.
  - `T-WEB-05`: Arıza bileti durum güncelleme ve makineyi `out_of_service` / `available` durumuna geçirme.

### 2.3 Mobil Uygulama Testleri (`apps/mobile/`)
- **Araçlar:** `flutter test` (Unit & Widget Tests), `flutter analyze`
- **Kapsam:**
  - `T-MOB-01`: Durum makinesi ve geri sayım hesaplayıcısı birim testleri (sunucu zaman farkı / saat dilimi uyumu).
  - `T-MOB-02`: QR kod ayrıştırma ve doğrulama mantığı (geçersiz UUID, boş string, farklı organizasyon QR'ı reddi).
  - `T-MOB-03`: Çift tıklama (idempotency) koruması — seans başlat butonuna art arda basıldığında tek istek gönderilmesi.
  - `T-MOB-04`: Makine kartı widget testi — `Tahmini` ve `Kullanıcı Bildirimi` uyarılarının görünürlüğü.

### 2.4 Statik Analiz ve Güvenlik Taraması
- **Komutlar:**
  - Web: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
  - Mobil: `flutter analyze`, `flutter test`
  - Gizli Bilgi Kontrolü: Depoda `.env` dosyası veya gerçek `service_role` anahtarı bulunmadığının kontrolü.

---

## 3. Faz Sonu Test Raporlama Şablonu

Her fazın sonunda aşağıdaki şablonla gerçek sonuçlar raporlanır:

1. **Çalıştırılan Komutlar:** Tam terminal komutları
2. **Başarılı Testler:** Geçen test sayısı ve kapsamı
3. **Başarısız Testler:** Varsa hata çıktıları ve yapılan düzeltmeler
4. **Çalıştırılamayan Testler ve Nedenleri:** Eksik çalışma zamanı, harici servis veya fiziksel cihaz gereksinimi (örn. Flutter SDK PATH'te değilse veya canlı Supabase bağlantısı henüz yapılandırılmadıysa açıkça belirtilir).
