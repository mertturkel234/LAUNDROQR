<p align="center">
  <img src="docs/logo.png" alt="LaundroQR Official Logo" width="220" />
</p>

# LaundroQR 🧺

[![CI Status](https://img.shields.io/github/actions/workflow/status/mertturkel234/LAUNDROQR/ci.yml?branch=main&label=LaundroQR%20CI)](https://github.com/mertturkel234/LAUNDROQR/actions)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.44-02569B?logo=flutter)](https://flutter.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Akıllı Çamaşırhane Yönetim Platformu** — Üniversite yurtları, KYK yurtları ve özel öğrenci rezidansları için çok kiracılı (multi-tenant), QR kod tabanlı çamaşır ve kurutma makinesi takip sistemi.

---

## 🌐 Live Demo (Canlı Sistem Bağlantıları)

Sistem **Supabase Cloud (PostgreSQL + RLS)** veritabanı altyapısıyla uçtan uca entegre ve canlı olarak çalışmaktadır:

- 🖥️ **Kurumsal Yönetim Paneli (Next.js Admin on Vercel):** [https://admin-beta-navy.vercel.app](https://admin-beta-navy.vercel.app)
- 📱 **Yurt Sakini Mobil Uygulaması (Flutter Web on Netlify):** [https://dashing-capybara-ac1036.netlify.app](https://dashing-capybara-ac1036.netlify.app)

---

## 📊 Investor Relations & Pitch Deck (Yatırımcı Sunumu)

LaundroQR'ın pazar vizyonu, gelir modeli, çok kiracılı SaaS mimarisi ve üniversite/KYK yurtları ölçeklenme stratejisini içeren resmi yatırımcı sunumuna aşağıdan ulaşabilirsiniz:

- 📄 **[LaundroQR Official Pitch Deck (PDF)](docs/LaundroQR_Pitch_Deck.pdf)**

---

## 📌 Project Status (Proje Durumu)

| Faz | Modül | Durum | Doğrulama |
|---|---|---|---|
| **Phase 0** | Mimari Tasarım, PRD & Güvenlik Planı | ✅ Tamamlandı | `docs/` |
| **Phase 1** | PostgreSQL Şeması, RLS Politikaları, Atomik RPC'ler & CI | ✅ Tamamlandı | `supabase/` + GitHub Actions |
| **Phase 2** | Next.js 15 Yönetim Paneli & Flutter Mobil Temeli | ✅ Tamamlandı | Vitest (6/6) & Flutter Test (3/3) |
| **Phase 3–6** | Canlı Supabase Cloud, Vercel & Netlify Üretim Dağıtımı | ✅ Tamamlandı | Canlı Bulut Entegrasyonu |
| **Phase 7–10** | IoT Röle Webhook, FCM Bildirimler, Cüzdan & APK Otomasyonu | ✅ Tamamlandı | Tam Otonom Paket |

> **Şeffaflık ve Dürüstlük İlkesi:** QR kod ve yazılım zamanlayıcısı tek başına fiziksel bir çamaşır makinesinin çalışıp çalışmadığını veya boşaltıldığını doğrulayamaz. LaundroQR, tüm makine durumlarını doğrulama kaynağına göre (**Tahmini / Yazılım Zamanlayıcısı**, **Kullanıcı Bildirimi**, **Donanım Sensörü Doğrulamalı**) açıkça etiketler.

---

## 🏗️ Architecture Overview (Mimari Genel Bakış)

LaundroQR, tek bir geliştiricinin uçtan uca yönetebileceği, gereksiz mikroservis karmaşasından arındırılmış güvenli bir monorepo mimarisine sahiptir:

```
laundroqr/
├── apps/
│   ├── admin/           # Next.js 15 (App Router) + TypeScript Kurumsal Yönetim Paneli
│   └── mobile/          # Flutter 3.x Yurt Sakini (Öğrenci) Mobil Uygulaması
├── supabase/
│   ├── config.toml      # Supabase CLI & Auth yapılandırması
│   ├── migrations/      # Sıralı SQL şema, RLS ve atomik RPC migration dosyaları
│   ├── seed.sql         # İzole çok kiracılı (multi-tenant) demo/test verisi
│   └── tests/           # RLS kiracı izolasyonu ve eşzamanlılık (race condition) testleri
├── docs/                # PRD, Mimari, Veritabanı, Güvenlik, Yol Haritası, ADR ve Pitch Deck
├── .github/             # GitHub Actions CI/CD, APK Release ve Issue/PR şablonları
├── .editorconfig        # IDE arası kod biçimlendirme standardı
└── LICENSE              # MIT Lisansı
```

### Temel Güvenlik ve Mühendislik Özellikleri
- **Çok Kiracılı İzolasyon (Multi-Tenant RLS):** Tüm veritabanı tablolarında PostgreSQL Row Level Security (RLS) zorunludur. Bir yurdun sakini veya yöneticisi başka bir yurdun verilerine erişemez.
- **Atomik Seans Başlatma:** `uq_one_active_session_per_machine` kısmi benzersiz indeksi ve `FOR UPDATE` satır kilidi kullanan `start_machine_session` RPC fonksiyonu, aynı makineye aynı anda iki kişinin seans başlatmasını veritabanı seviyesinde engeller.
- **Güvenli QR Kod Rotasyonu:** Yıpranan veya kopyalanan QR etiketleri yönetici tarafından tek tıkla (`rotate_machine_qr`) yenilenir ve işlem `audit_logs` tablosuna kaydedilir.

---

## 🚀 Local Setup (Yerel Kurulum)

Detaylı kurulum kılavuzu için [docs/SETUP.md](docs/SETUP.md) belgesini inceleyebilirsiniz.

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/mertturkel234/LAUNDROQR.git
cd LAUNDROQR
```

### 2. Ortam Değişkenlerini Yapılandırın
`.env.example` şablonunu kullanarak `apps/admin/.env.local` ve `apps/mobile/.env.local` dosyalarını oluşturun (`.gitignore` tarafından otomatik korunur):

```env
# apps/admin/.env.local
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_PUBLIC_KEY"
```

### 3. Next.js Kurumsal Yönetim Panelini Çalıştırın (`apps/admin`)
```bash
cd apps/admin
npm install
npm run dev
```
Tarayıcıda `http://localhost:3000` adresini açın.

### 4. Flutter Mobil Uygulamasını Çalıştırın (`apps/mobile`)
```bash
cd apps/mobile
flutter pub get
flutter run -d chrome
```

---

## 📚 Teknik Dokümantasyon

| Belge | Açıklama |
|---|---|
| [docs/LaundroQR_Pitch_Deck.pdf](docs/LaundroQR_Pitch_Deck.pdf) | Yatırımcı Sunumu (Pitch Deck) |
| [docs/PRD.md](docs/PRD.md) | Ürün gereksinimleri, kullanıcı hikayeleri ve kabul kriterleri |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Sistem mimarisi, veri akışı ve durum makinesi diyagramları |
| [docs/DATABASE.md](docs/DATABASE.md) | Veritabanı tabloları, indeksler ve silme politikaları |
| [docs/SECURITY.md](docs/SECURITY.md) | RLS politikaları, RBAC matrisi ve gizli bilgi güvenliği |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Faz bazlı geliştirme yol haritası |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Birim, entegrasyon, RLS ve eşzamanlılık test stratejisi |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Mimari karar kayıtları (ADR) |
| [docs/PILOT_AND_DEPLOYMENT.md](docs/PILOT_AND_DEPLOYMENT.md) | Kurumsal pilot hazırlığı, KVKK ve dağıtım rehberi |

---

## 🤝 Katkıda Bulunma ve Lisans

Katkı kuralları için [CONTRIBUTING.md](CONTRIBUTING.md) ve topluluk kuralları için [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) dosyalarını inceleyebilirsiniz. Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
