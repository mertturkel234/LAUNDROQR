# LaundroQR 🧺

**Akıllı Çamaşırhane Yönetim Platformu** — Üniversite ve KYK yurtları için QR kod tabanlı çamaşır makinesi takip sistemi.

---

## Proje Hakkında

LaundroQR, yurt sakinlerinin çamaşır makinelerini kolayca bulmasını, QR kod ile makineye bağlanmasını ve yazılım tabanlı kullanım seansları başlatıp takip etmesini sağlar. Kurumsal yöneticiler, web paneli üzerinden tüm operasyonu yönetir.

> **Önemli Sınırlama:** QR kod ve yazılım zamanlayıcısı fiziksel bir makinenin çalışıp çalışmadığını doğrulayamaz. Uygulama, makine durumlarını **tahmini** veya **kullanıcı bildirimi** olarak açıkça etiketler; sensör doğrulamalı veri olarak sunmaz.

---

## Teknoloji Yığını

| Bileşen | Teknoloji |
|---|---|
| Mobil Uygulama | Flutter 3.44 / Dart 3.x |
| Web Admin Paneli | Next.js 15 / TypeScript |
| Veritabanı & Backend | Supabase / PostgreSQL |
| Kimlik Doğrulama | Supabase Auth |
| Yetkilendirme | PostgreSQL Row Level Security (RLS) |
| Gerçek Zamanlı Güncellemeler | Supabase Realtime |
| Push Bildirimler (Faz 8) | Firebase Cloud Messaging |
| CI/CD | GitHub Actions |
| Versiyon Kontrolü | Git / GitHub |

---

## Proje Yapısı

```
laundroqr/
├── apps/
│   ├── mobile/          # Flutter uygulaması (yurt sakinleri)
│   └── admin/           # Next.js admin paneli (yöneticiler)
├── supabase/
│   ├── migrations/      # Sıralı SQL migration dosyaları
│   ├── seed.sql         # Demo/test verisi (üretim verisi değil)
│   └── tests/           # RLS ve entegrasyon testleri
├── docs/                # Tüm teknik dokümantasyon
├── .github/
│   └── workflows/       # CI/CD iş akışları
├── .env.example         # Ortam değişkeni şablonu (gerçek değer içermez)
└── README.md
```

---

## Hızlı Başlangıç

Kurulum talimatları için: [docs/SETUP.md](docs/SETUP.md)

### Ön Gereksinimler

- Flutter SDK 3.44+ ([flutter.dev](https://flutter.dev))
- Node.js 20+ ve npm
- Supabase CLI ([supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))
- Git 2.40+

### Kurulum

```bash
# 1. Repoyu klonla
git clone https://github.com/mertturkel234/laundroqr.git
cd laundroqr

# 2. Ortam değişkenlerini ayarla
cp .env.example .env.local
# .env.local dosyasını kendi değerlerinle doldur

# 3. Admin panelini başlat
cd apps/admin
npm install
npm run dev

# 4. Flutter uygulamasını başlat (ayrı terminal)
cd apps/mobile
flutter pub get
flutter run
```

---

## Dokümantasyon

| Dosya | İçerik |
|---|---|
| [PRD.md](docs/PRD.md) | Ürün gereksinimleri ve kullanıcı hikayeleri |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Sistem mimarisi ve bileşen diyagramları |
| [DATABASE.md](docs/DATABASE.md) | Veritabanı şeması ve ilişkiler |
| [SECURITY.md](docs/SECURITY.md) | Güvenlik modeli ve RLS politikaları |
| [ROADMAP.md](docs/ROADMAP.md) | Faz bazlı geliştirme planı |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | Test stratejisi ve kabul kriterleri |
| [SETUP.md](docs/SETUP.md) | Geliştirici kurulum kılavuzu |
| [DECISIONS.md](docs/DECISIONS.md) | Mimari kararlar ve gerekçeleri |

---

## Katkı Standartları

- Commit mesajları İngilizce, Conventional Commits formatında
- Her faz kendi branch'inde geliştirilir: `phase/N-description`
- Gizli bilgi (API anahtarı, şifre) asla commit edilmez
- Migration dosyaları `supabase/migrations/` altında sıralı tutulur

---

## Lisans

Özel kullanım — kurumsal pilot için lisans şartları ayrıca tanımlanacaktır.

---

*LaundroQR — Mert Türkel tarafından geliştirilmektedir.*
