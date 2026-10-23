# LaundroQR — Ürün Gereksinimleri Belgesi (PRD)

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  
**Yazar:** Mert Türkel  

---

## 1. Ürün Vizyonu

LaundroQR, üniversite yurdu sakinlerinin çamaşır makinesi bulmalarını, QR kod ile bağlanmalarını ve yazılım tabanlı kullanım seansları yönetmelerini sağlayan bir platformdur.

Başlangıç hedef pazarı:
- Üniversite yurtları
- KYK yurtları (kurumsal onay alındıktan sonra)
- Özel öğrenci yurtları

---

## 2. Paydaşlar

| Paydaş | Tanım |
|---|---|
| Yurt Sakini (Resident) | Çamaşır makinesi kullanan öğrenci |
| Organizasyon Yöneticisi (Org Admin) | Yurt veya kurumu yöneten yetkili |
| Çamaşırhane Personeli (Laundry Staff) | Bakım ve operasyon sorumlusu |
| Platform Yöneticisi (Platform Admin) | LaundroQR platform süper yöneticisi |

---

## 3. Önemli Kısıtlama ve Dürüstlük İlkesi

> QR kod ve yazılım zamanlayıcısı, fiziksel bir çamaşır makinenin çalışıp çalışmadığını, boş olup olmadığını veya döngüsünü tamamlayıp tamamlamadığını **doğrulayamaz**.

Uygulama şu etiketleme standartlarına uyar:
- **Tahmini** — Yazılım zamanlayıcısından hesaplanan süre
- **Kullanıcı Bildirimi** — Bir sakin veya personelin el ile bildirdiği durum
- **Sensör Doğrulamalı** — Güvenilir donanım sensöründen gelen veri (Faz 10 sonrası)

Bu kısıtlama hiçbir zaman gizlenmez; kullanıcı arayüzünde açıkça gösterilir.

---

## 4. Kullanıcı Hikayeleri

### 4.1 Yurt Sakini (Resident)

| ID | Hikaye | Öncelik |
|---|---|---|
| R-01 | Hesabıma giriş yapabilmeliyim | Kritik |
| R-02 | Yetkili olduğum yurdun çamaşırhanesini görebilmeliyim | Kritik |
| R-03 | Makine listesini ve durumlarını görebilmeliyim | Kritik |
| R-04 | QR kodu okutarak makineyi tanımlayabilmeliyim | Kritik |
| R-05 | Uygun makinede seans başlatabilmeliyim | Kritik |
| R-06 | Kalan tahmini süreyi görebilmeliyim | Kritik |
| R-07 | Seansımı bitirebilmeliyim | Kritik |
| R-08 | Geçmiş seanslarımı görebilmeliyim | Yüksek |
| R-09 | Makine arızası bildirebilmeliyim | Yüksek |
| R-10 | Bildirim tercihlerimi ayarlayabilmeliyim | Orta |
| R-11 | Seansım bittiğinde bildirim alabilmeliyim (Faz 8) | Orta |

### 4.2 Organizasyon Yöneticisi (Org Admin)

| ID | Hikaye | Öncelik |
|---|---|---|
| A-01 | Güvenli giriş yapabilmeliyim | Kritik |
| A-02 | Organizasyonuma ait özet dashboard görebilmeliyim | Kritik |
| A-03 | Bina ve çamaşırhane ekleyip düzenleyebilmeliyim | Kritik |
| A-04 | Makine ekleyip düzenleyebilmeliyim | Kritik |
| A-05 | Makine QR kodlarını oluşturup görüntüleyebilmeliyim | Kritik |
| A-06 | Aktif ve geçmiş seansları görebilmeliyim | Yüksek |
| A-07 | Bakım biletlerini yönetebilmeliyim | Yüksek |
| A-08 | Üyelikleri ve rolleri yönetebilmeliyim | Yüksek |
| A-09 | Operasyonel istatistikleri görebilmeliyim | Orta |

---

## 5. Fonksiyonel Gereksinimler

### 5.1 Kimlik Doğrulama ve Yetkilendirme
- E-posta/şifre tabanlı giriş (Supabase Auth)
- Oturum kalıcılığı ve süre dolumu yönetimi
- Şifre sıfırlama akışı
- Rol tabanlı erişim kontrolü (RBAC)
- Organizasyon sınırları backend'de zorlanır; yalnızca UI'da değil

### 5.2 Organizasyon Yönetimi
- Çok kiracılı (multi-tenant) mimari
- Organizasyon → Bina → Çamaşırhane → Makine hiyerarşisi
- Her organizasyon yalnızca kendi verilerine erişir

### 5.3 Makine Yönetimi
- Makine durumları: `available`, `in_use`, `cycle_complete`, `out_of_service`
- Durum geçişleri belgelenmiş ve sunucu tarafında doğrulanır
- QR kod benzersiz makine tanımlayıcısı içerir; güvenli yenileme desteklenir

### 5.4 Seans Yönetimi
- Bir makinede aynı anda yalnızca bir aktif seans olabilir
- Seans başlatma atomik işlem ile gerçekleşir (yarış koşulu önlenir)
- Sunucu tarafı zaman damgaları kullanılır; istemci saatine güvenilmez
- Seans durumları: `active`, `completed`, `cancelled`, `expired`

### 5.5 Bakım ve Arıza
- Sakin veya personel arıza bildirebilir
- Yönetici biletleri günceller ve kapatır
- Arızalı makine `out_of_service` durumuna geçer

---

## 6. Fonksiyonel Olmayan Gereksinimler

| Gereksinim | Hedef |
|---|---|
| Güvenlik | RLS ile her tabloda kiracı izolasyonu |
| Performans | Sayfa yükü < 2 saniye (nominal koşul) |
| Erişilebilirlik | WCAG 2.1 AA kontrast oranı |
| Yerelleştirme | Türkçe önce; i18n altyapısı hazır |
| Ölçeklenebilirlik | Tek geliştirici tarafından anlaşılabilir mimari |
| Güvenilirlik | Bağlantı kesilmesi durumunda seans tutarlılığı |

---

## 7. Kapsam Dışı (MVP)

Aşağıdakiler MVP kapsamında **değildir**:

- Ödeme veya abonelik sistemi
- Gerçek zamanlı donanım sensörü entegrasyonu
- Rezervasyon/kuyruk sistemi
- iOS App Store / Google Play dağıtımı
- SMS bildirimleri
- Birden fazla dil (yalnızca Türkçe MVP'de)

---

## 8. Başarı Kriterleri (Pilot)

- Bir pilot yurt sakinleri uygulamayı günlük kullanıyor
- Yönetici makine durumlarını web panelden takip edebiliyor
- 0 kritik güvenlik açığı (kendi değerlendirme)
- Kullanıcı geri bildirimi toplanıyor
