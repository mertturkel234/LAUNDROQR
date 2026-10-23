# Contributing to LaundroQR

Thank you for your interest in contributing to **LaundroQR**! This document provides guidelines and engineering standards for contributing to the platform.

---

## 1. Engineering Principles

1. **Security First:** Never bypass PostgreSQL Row Level Security (RLS), never commit `.env` or `.env.local` files, and never expose `SUPABASE_SERVICE_ROLE_KEY` to browser or mobile clients.
2. **Honest State Labeling:** Software timers and QR scans cannot physically prove a washing machine is running or empty. Always preserve the distinction between `software` (Estimated), `user_report` (User Reported), and `sensor` (Hardware Verified) states.
3. **Database Migrations:** All schema, RLS, or RPC changes must be authored as ordered SQL migrations under `supabase/migrations/`.

---

## 2. Development Workflow

1. Fork or branch from `main` using a descriptive branch name:
   - `feat/short-description`
   - `fix/short-description`
   - `docs/short-description`
   - `chore/short-description`
2. Ensure all local quality checks pass before opening a Pull Request:

### Web Admin (`apps/admin`)
```bash
cd apps/admin
npm run typecheck
npm run lint
npm test
npm run build
```

### Mobile App (`apps/mobile`)
```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```

---

## 3. Commit Message Convention

We follow the **Conventional Commits** specification:

- `feat:` A new feature or capability
- `fix:` A bug fix or security patch
- `docs:` Documentation-only changes
- `chore:` Repository maintenance, tooling, or templates
- `build:` Build system, CI/CD, or editor configuration changes
- `test:` Adding or updating automated tests
