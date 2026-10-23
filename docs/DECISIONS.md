# LaundroQR — Mimari Karar Kayıtları (ADR / DECISIONS)

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

Bu belge, LaundroQR geliştirilirken alınan önemli teknik ve mimari kararları, alternatiflerini ve gerekçelerini Türkçe olarak açıklar.

---

## ADR-001: Monorepo Yapısı ve Ayrı API Sunucusu Kullanmama Kararı

- **Durum:** Kabul Edildi
- **Bağlam:** Kurucu tek başına çalışan bir 1. sınıf Bilgisayar Mühendisliği öğrencisidir. Sistemin hem mobil (Flutter) hem web yönetim paneli (Next.js) hem de güçlü bir çok kiracılı veritabanına ihtiyacı vardır.
- **Karar:** Tüm kod tabanı tek bir depoda (`apps/admin`, `apps/mobile`, `supabase/`, `docs/`) tutulacak; ayrı bir Node.js/Go/Python mikroservis katmanı yazılmayacak, doğrudan Supabase (PostgreSQL + RLS + RPC + Next.js Server Actions/Route Handlers) kullanılacaktır.
- **Gerekçe:** Ayrı bir backend sunucusu eklemek, hem dağıtım maliyetini hem de bakım yükünü ikiye katlar. PostgreSQL Row Level Security (RLS) ve `SECURITY DEFINER` / `SECURITY INVOKER` SQL RPC fonksiyonları ile tüm iş kuralları atomik olarak doğrudan veritabanı katmanında uygulanabilir.

---

## ADR-002: Fiziksel Durum Doğrulaması ve Dürüst Etiketleme (`status_source`)

- **Durum:** Kabul Edildi
- **Bağlam:** İlk aşamada makinelerde donanım sensörü (akım/titreşim ölçer) bulunmamaktadır; sistem QR kod ve yazılım zamanlayıcısı ile çalışacaktır.
- **Karar:** Veritabanında `machines` tablosuna `status_source` (`software`, `user_report`, `sensor`) alanı eklendi ve arayüzde her makine durumu kaynağını açıkça belirten rozetlerle ("Tahmini Süre", "Kullanıcı Bildirimi", "Sensör Doğrulamalı") gösterilecek. Ayrıca `cycle_complete` durumu makinenin fiziksel olarak boşaltıldığını varsaymayacak; makinenin tekrar `available` olması için sakin veya personel onayı ("Çamaşırları Aldım / Makine Boş") gerekecek.
- **Gerekçe:** Öğrencilerin çamaşırhaneye indiğinde makineyi dolu bulması güven kaybı yaratır. Yazılımın neyi bilip neyi tahmin ettiğini dürüstçe göstermek hem kullanıcı deneyimini iyileştirir hem de Faz 10'daki IoT sensör entegrasyonuna kesintisiz geçiş sağlar.

---

## ADR-003: Eşzamanlı Seans Başlatma Yarış Koşullarının (Race Condition) Önlenmesi

- **Durum:** Kabul Edildi
- **Bağlam:** İki öğrenci aynı anda aynı makinenin QR kodunu okutup "Başlat" butonuna basabilir. İstemci tarafı kontroller (`if (machine.status == 'available')`) yarış koşulunu engelleyemez.
- **Karar:**
  1. `machine_sessions` tablosuna `CREATE UNIQUE INDEX uq_one_active_session_per_machine ON machine_sessions (machine_id) WHERE status = 'active';` kısmi benzersiz indeksi eklendi.
  2. Seans başlatma işlemi istemciden doğrudan `INSERT` ile değil, makine satırını `FOR UPDATE` ile kilitleyen atomik bir PostgreSQL RPC fonksiyonu (`start_machine_session`) üzerinden yapılacak.
- **Gerekçe:** Veritabanı seviyesinde kilit ve benzersiz indeks kullanmak, eşzamanlı isteklerde %100 veri bütünlüğü sağlar ve ikinci isteği güvenli bir hata mesajıyla reddeder.

---

## ADR-004: Zaman Damgası Otoritesi (Server-Authoritative Timestamps)

- **Durum:** Kabul Edildi
- **Bağlam:** Mobil cihazların sistem saatleri yanlış veya manipüle edilmiş olabilir.
- **Karar:** Seans başlangıç (`started_at`) ve tahmini bitiş (`estimated_end_at`) zamanları yalnızca PostgreSQL sunucusu (`now()`) tarafından üretilir. Mobil ve web istemcileri kalan süreyi sunucudan gelen `estimated_end_at` ve sunucu saati farkına göre hesaplar.
- **Gerekçe:** İstemci saatine güvenmek seans sürelerinin bozulmasına ve suistimale yol açar.

---

## ADR-005: Çevrimdışı/Önizleme Modu ile Canlı Supabase Modunun Ayrılması

- **Durum:** Kabul Edildi
- **Bağlam:** Geliştirici veya değerlendirici projeyi ilk klonladığında henüz canlı Supabase kimlik bilgilerini girmemiş olabilir, ancak uygulamanın derlenmesi, test edilmesi ve arayüz akışlarının incelenebilmesi gerekir.
- **Karar:** Uygulama katmanında gerçek Supabase istemcisi birincil kaynak olarak kodlanacak; ortam değişkenleri tanımlanmadığında ise kullanıcıya açıkça **"Demo / Önizleme Modu (Canlı Veritabanı Bağlı Değil)"** uyarısı gösteren deterministik bir bellek içi (in-memory) adaptör devreye girecek.
- **Gerekçe:** Master direktifteki "Mock veriler açıkça tanımlanmış tasarım önizlemeleri ve izole testler için kabul edilebilir, ancak asla canlı üretim verisi olarak sunulmamalıdır" kuralına tam uyum sağlar ve her fazda uygulamanın çalışır/test edilebilir kalmasını garanti eder.
