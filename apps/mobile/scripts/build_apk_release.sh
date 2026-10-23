#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# LAUNDROQR — ANDROID PRODUCTION APK BUILD SCRIPT (Phase 10)
# =============================================================================

cd "$(dirname "$0")/.."

echo "[LaundroQR] Ensuring Android platform project files exist..."
if [ ! -d "android" ]; then
  flutter create . --platforms=android --org=com.laundroqr
fi

echo "[LaundroQR] Resolving Flutter dependencies..."
flutter pub get

echo "[LaundroQR] Building production release APK..."
flutter build apk --release \
  --dart-define=SUPABASE_URL="${SUPABASE_URL:-https://usuykunpnzkyiphfygys.supabase.co}" \
  --dart-define=SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

echo "[LaundroQR] APK successfully built at: build/app/outputs/flutter-apk/app-release.apk"
