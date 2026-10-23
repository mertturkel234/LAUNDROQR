# LaundroQR — Geliştirici Kurulum Kılavuzu (SETUP)

**Sürüm:** 0.1.0  
**Tarih:** 2026-10-23  

---

## 1. Mevcut Çalışma Ortamı Durumu (Keşif Sonucu)

Çalışma alanında yapılan otomatik inceleme sonucunda tespit edilen araçlar:

| Araç | Durum | Tespit Edilen Sürüm / Konum |
|---|---|---|
| **Git** | ✅ Kurulu | `git version 2.54.0.windows.1` |
| **Node.js** | ✅ Kurulu | `v24.18.0` |
| **npm** | ✅ Kurulu | `11.16.0` |
| **Flutter SDK** | ⚠️ İndirilmiş, PATH'te değil | `C:\Users\ASUS\Downloads\flutter_windows_3.44.0-stable.zip` (Arşivden çıkarılıp PATH'e eklenmeli) |
| **Supabase CLI** | ⚠️ Harici / Opsiyonel | `npx supabase` üzerinden veya doğrudan kurulabilir |

---

## 2. Flutter SDK Kurulumu (Manuel veya Komut İle)

İndirilen `flutter_windows_3.44.0-stable.zip` dosyasını kullanılabilir hale getirmek için:

1. Arşivi `C:\src\flutter` (veya tercih ettiğiniz boş bir klasöre) çıkartın:
   ```powershell
   Expand-Archive -Path "$env:USERPROFILE\Downloads\flutter_windows_3.44.0-stable.zip" -DestinationPath "C:\src" -Force
   ```
   *(Not: `C:\flutter` dizininde şu an Flutter kaynak deposu bulunduğu için karışıklık olmaması adına `C:\src\flutter` önerilir.)*
2. `C:\src\flutter\bin` yolunu Windows **Ortam Değişkenleri (PATH)** listesine ekleyin:
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
   ```
3. Yeni bir terminal açıp doğrulayın:
   ```powershell
   flutter doctor
   ```

---

## 3. Supabase Projesi ve Ortam Değişkenleri

### 3.1 Supabase Kurulumu
1. [database.new](https://database.new) adresinden yeni bir Supabase projesi oluşturun (veya yerel geliştirme için Docker Desktop + `npx supabase start` kullanın).
2. Supabase Dashboard → **Authentication → Providers → Email** bölümünden:
   - Açık kaydı sınırlandırmak veya davetli akışı kullanmak için ayarları yapılandırın.
3. `supabase/migrations/` altındaki SQL dosyalarını sırasıyla Supabase SQL Editor üzerinden veya CLI ile uygulayın:
   ```powershell
   npx supabase db push
   ```
4. Demo verisi yüklemek isterseniz (yalnızca test/geliştirme ortamında):
   - `supabase/seed.sql` dosyasını çalıştırın.

### 3.2 Ortam Değişkenleri
1. Kök dizindeki `.env.example` dosyasını `apps/admin/.env.local` olarak kopyalayın:
   ```powershell
   Copy-Item .env.example apps\admin\.env.local
   ```
2. Supabase Dashboard → **Project Settings → API** bölümünden şu değerleri doldurun:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(Dikkat: Yalnızca `apps/admin/.env.local` içinde sunucu tarafında kullanılır, asla `NEXT_PUBLIC_` öneki almaz ve mobil uygulamaya eklenmez!)*

---

## 4. Web Yönetim Panelini Çalıştırma (`apps/admin`)

```powershell
cd apps\admin
npm install
npm run dev
```
Tarayıcıda `http://localhost:3000` adresini açın.

### Web Kontrolleri
```powershell
npm run lint        # ESLint kontrolü
npm run typecheck   # TypeScript tip kontrolü
npm test            # Vitest birim testleri
npm run build       # Üretim derlemesi testi
```

---

## 5. Mobil Uygulamayı Çalıştırma (`apps/mobile`)

```powershell
cd apps\mobile
flutter pub get
flutter run --dart-define=SUPABASE_URL=https://PROJE_ID.supabase.co --dart-define=SUPABASE_ANON_KEY=ANON_KEY_DEGERI
```

### Mobil Kontrolleri
```powershell
flutter analyze
flutter test
```
