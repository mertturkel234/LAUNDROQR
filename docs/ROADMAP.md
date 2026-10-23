# LaundroQR — Geliştirme Yol Haritası (Roadmap)

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## Faz Özeti ve İlerleme Durumu

| Faz | Başlık | Durum | Bağımlılıklar |
|---|---|---|---|
| **Faz 0** | Depo Keşfi ve Master Plan | ✅ Tamamlandı | Yok |
| **Faz 1** | Proje Temeli (Foundation) | 🔄 Devam Ediyor | Faz 0 |
| **Faz 2** | Ürün ve UX Tasarım Sistemi | ⏳ Bekliyor | Faz 1 |
| **Faz 3** | Veritabanı ve Çok Kiracılı Güvenlik (RLS) | ⏳ Bekliyor | Faz 1 |
| **Faz 4** | Kimlik Doğrulama ve Yetkilendirme | ⏳ Bekliyor | Faz 2, Faz 3 |
| **Faz 5** | Web Yönetim Paneli (Next.js Admin) | ⏳ Bekliyor | Faz 3, Faz 4 |
| **Faz 6** | Mobil Sakin Uygulaması (Flutter) | ⏳ Bekliyor | Faz 3, Faz 4 |
| **Faz 7** | Seans Yaşam Döngüsü ve Canlı Güncellemeler | ⏳ Bekliyor | Faz 5, Faz 6 |
| **Faz 8** | Bildirim Altyapısı (FCM) | ⏳ Bekliyor | Faz 7 |
| **Faz 9** | Sıra ve Rezervasyon Sistemi (Post-MVP) | ⏳ Bekliyor | Faz 7 |
| **Faz 10** | Donanıma Hazır Mimari (IoT Telemetry) | ⏳ Bekliyor | Faz 3, Faz 7 |
| **Faz 11** | Test ve Güvenlik Sıkılaştırma | ⏳ Bekliyor | Faz 5, Faz 6, Faz 7 |
| **Faz 12** | Dağıtım ve Pilot Hazırlığı | ⏳ Bekliyor | Faz 11 |
| **Faz 13** | MVP Sonrası İyileştirmeler | ⏳ Bekliyor | Faz 12 |

---

## Faz Detayları ve Kabul Kriterleri

### Faz 0 — Depo Keşfi ve Master Plan
- **Hedef:** Çalışma alanını, kurulu çalışma zamanlarını (Node, Git, Flutter) tespit etmek ve tüm temel mimari/ürün belgelerini oluşturmak.
- **Kabul Kriterleri:**
  - [x] Çalışma alanı ve çalışma zamanları doğrulandı.
  - [x] `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `ROADMAP.md`, `TEST_PLAN.md`, `SETUP.md`, `DECISIONS.md` oluşturuldu.

### Faz 1 — Proje Temeli (Project Foundation)
- **Hedef:** Monorepo yapısını, Next.js TypeScript admin uygulamasını, Flutter mobil proje iskeletini, ortam şablonlarını (`.env.example`), `.gitignore` ve GitHub Actions CI kontrollerini kurmak.
- **Kabul Kriterleri:**
  - [ ] Proje dizin yapısı oluşturuldu ve belgelendi.
  - [ ] Next.js (`apps/admin`) ve Flutter (`apps/mobile`) iskeletleri hazırlandı ve derlendi/doğrulandı.
  - [ ] Hiçbir gizli anahtar (secret) commit edilmedi.
  - [ ] Linting ve tip kontrolü yapılandırıldı.
  - [ ] GitHub Actions CI iş akışı eklendi.

### Faz 2 — Ürün ve UX Tasarım Sistemi
- **Hedef:** Türkçe odaklı, erişilebilir, tahmini/kullanıcı bildirimi/sensör durumlarını dürüstçe ayıran ortak tasarım jetonları (design tokens), durum rozetleri (status badges) ve temel UI bileşenlerini oluşturmak.
- **Kabul Kriterleri:**
  - [ ] Yükleniyor, boş, hata, çevrimdışı ve yetkisiz durum bileşenleri hazır.
  - [ ] Makine durumu ve doğrulama kaynağı (`Tahmini`, `Kullanıcı Bildirimi`, `Sensör Doğrulamalı`) rozetleri hem web hem mobil için tanımlandı.

### Faz 3 — Veritabanı ve Çok Kiracılı Güvenlik (RLS)
- **Hedef:** PostgreSQL/Supabase şemasını, atomik seans başlatma/bitirme RPC fonksiyonlarını, RLS politikalarını, denetim kayıtlarını (`audit_logs`) ve test verilerini (`seed.sql`) oluşturmak.
- **Kabul Kriterleri:**
  - [ ] SQL migration dosyaları sıralı ve hatasız.
  - [ ] Tüm tablolarda RLS aktif ve varsayılan olarak erişim kapalı.
  - [ ] Eşzamanlı çakışan aktif seansları engelleyen kısmi benzersiz indeks (`uq_one_active_session_per_machine`) ve atomik RPC fonksiyonları tanımlandı.
  - [ ] RLS ve kiracı izolasyonu test senaryoları (`supabase/tests/`) yazıldı.

### Faz 4 — Kimlik Doğrulama ve Yetkilendirme
- **Hedef:** Supabase Auth ile güvenli giriş/çıkış, şifre sıfırlama, oturum yenileme, organizasyon üyeliği doğrulama ve rol tabanlı erişim kontrolünü (RBAC) hem web hem mobilde uygulamak.
- **Kabul Kriterleri:**
  - [ ] Yetkisiz kullanıcılar korumalı sayfalara erişemez.
  - [ ] Sakin (`resident`) rolü yönetim paneline veya admin aksiyonlarına erişemez.
  - [ ] Açık kayıt (public sign-up) ile otomatik yetki kazanımı engellendi.

### Faz 5 — Web Yönetim Paneli (`apps/admin`)
- **Hedef:** Kurum yöneticileri ve personel için bina, çamaşırhane, makine envanteri, güvenli QR kod üretimi/rotasyonu, aktif/geçmiş seans izleme, arıza bileti yönetimi, üye/rol yönetimi ve operasyonel istatistik ekranlarını geliştirmek.
- **Kabul Kriterleri:**
  - [ ] Tüm yönetim akışları gerçek veritabanı şeması ve sunucu doğrulamalarıyla çalışır.
  - [ ] Yıkıcı işlemler (QR rotasyonu, makine devre dışı bırakma, rol değiştirme) onay gerektirir ve denetim kaydı üretir.
  - [ ] Yetkisiz roller sunucu aksiyonlarını tetikleyemez.

### Faz 6 — Mobil Sakin Uygulaması (`apps/mobile`)
- **Hedef:** Yurt sakinleri için giriş, çamaşırhane seçimi, makine listesi, makine detayları, QR kod tarama, seans başlatma onayı, sunucu zaman damgalı geri sayım, seans geçmişi, arıza bildirimi ve profil/bildirim tercihleri ekranlarını geliştirmek.
- **Kabul Kriterleri:**
  - [ ] QR doğrulama ve seans başlatma akışı uçtan uca çalışır.
  - [ ] Kamera izni reddi, geçersiz QR, çevrimdışı durum ve dolu makine hataları kullanıcı dostu şekilde ele alınır.
  - [ ] Geri sayım sunucu bitiş zamanına (`estimated_end_at`) göre hesaplanır; uygulama yeniden başlatıldığında durum korunur.

### Faz 7 — Seans Yaşam Döngüsü ve Canlı Güncellemeler
- **Hedef:** Seans durum makinesini (`active`, `completed`, `cancelled`, `expired`) ve makine durum makinesini (`available`, `in_use`, `cycle_complete`, `out_of_service`) Supabase Realtime ve atomik RPC'lerle senkronize etmek.
- **Kabul Kriterleri:**
  - [ ] Aynı makineye aynı anda iki kullanıcı seans başlatamaz.
  - [ ] Süresi dolan seansların `cycle_complete` durumuna geçişi ve makinenin boşaltılması ("Boşalttım" / personel onayı) akışı çalışır.
  - [ ] Bağlantı kopup geldiğinde veritabanı ile tam mutabakat sağlanır.

### Faz 8 — Bildirimler
- **Hedef:** Firebase Cloud Messaging (FCM) cihaz token yönetimi, bildirim tercihleri ve tahmini döngü bitiş bildirimleri için sunucu tarafı arayüz ve zamanlayıcı altyapısını kurmak.
- **Kabul Kriterleri:**
  - [ ] Cihaz token tablosu ve RLS politikaları hazır.
  - [ ] Kullanıcı bildirim tercihlerini açıp kapatabilir.
  - [ ] Mükerrer bildirim önleme (idempotency) mekanizması tanımlandı.

### Faz 9 — Sıra ve Rezervasyon (Post-MVP Hazırlığı)
- **Hedef:** Adil kullanım ve çakışmasız sıra/rezervasyon veri modelini ve kurallarını tasarlamak.

### Faz 10 — Donanıma Hazır Mimari (IoT Telemetry)
- **Hedef:** İleride akıllı priz veya titreşim/akım sensörü eklendiğinde güvenli telemetri verisi alacak `telemetry_events` şemasını ve doğrulama arayüzünü oluşturmak.

### Faz 11 — Test ve Güvenlik Sıkılaştırma
- **Hedef:** Birim testleri, bileşen testleri, RLS güvenlik testleri, eşzamanlılık testleri, lint/tip kontrolleri ve gizli bilgi taramalarını çalıştırmak.

### Faz 12 — Dağıtım ve Pilot Hazırlığı
- **Hedef:** Kurumsal pilot kurulum kılavuzu, KVKK/gizlilik kontrol listesi, yedekleme/geri dönüş (rollback) prosedürleri ve demo seed verilerini tamamlamak.
