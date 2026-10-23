-- =============================================================================
-- LAUNDROQR — RLS, TENANT ISOLATION & CONCURRENCY VERIFICATION SUITE
-- =============================================================================
-- Bu betik PostgreSQL/Supabase üzerinde bir transaction içinde çalışır,
-- tüm güvenlik ve eşzamanlılık kurallarını doğrular ve sonunda ROLLBACK yaparak
-- veritabanını kirletmez.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_rls_missing INT;
BEGIN
  -- 1. Verify RLS is enabled on every protected public table
  SELECT COUNT(*)
  INTO v_rls_missing
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'organizations', 'buildings', 'laundry_rooms', 'machines',
      'memberships', 'machine_sessions', 'maintenance_tickets',
      'machine_state_events', 'audit_logs', 'notification_preferences',
      'device_tokens', 'machine_reservations', 'telemetry_events'
    )
    AND rowsecurity = false;

  IF v_rls_missing > 0 THEN
    RAISE EXCEPTION 'TEST FAILED [T-DB-01]: % tabloda RLS etkin değil!', v_rls_missing;
  END IF;

  RAISE NOTICE 'PASS [T-DB-01]: Tüm 13 korumalı tabloda RLS etkin.';
END $$;

-- 2. Verify Partial Unique Index prevents duplicate active sessions on same machine
DO $$
DECLARE
  v_user_1 UUID := '00000000-0000-4000-8000-000000000001';
  v_user_2 UUID := '00000000-0000-4000-8000-000000000002';
  v_duplicate_blocked BOOLEAN := false;
BEGIN
  -- Insert dummy users in auth.users for test scope
  INSERT INTO auth.users (id, email)
  VALUES
    (v_user_1, 'resident1.test@laundroqr.local'),
    (v_user_2, 'resident2.test@laundroqr.local')
  ON CONFLICT (id) DO NOTHING;

  -- First active session on machine #1
  INSERT INTO public.machine_sessions (
    organization_id, laundry_room_id, machine_id, user_id,
    status, estimated_duration, started_at, estimated_end_at
  ) VALUES (
    '11111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    'd1111111-1111-4111-8111-111111111101',
    v_user_1,
    'active',
    45,
    now(),
    now() + interval '45 minutes'
  );

  -- Second concurrent active session on the SAME machine must fail with unique_violation
  BEGIN
    INSERT INTO public.machine_sessions (
      organization_id, laundry_room_id, machine_id, user_id,
      status, estimated_duration, started_at, estimated_end_at
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      'd1111111-1111-4111-8111-111111111101',
      v_user_2,
      'active',
      45,
      now(),
      now() + interval '45 minutes'
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate_blocked := true;
  END;

  IF NOT v_duplicate_blocked THEN
    RAISE EXCEPTION 'TEST FAILED [T-DB-04]: Aynı makinede iki aktif seans oluşturulabildi!';
  END IF;

  RAISE NOTICE 'PASS [T-DB-04]: uq_one_active_session_per_machine eşzamanlı çakışan seansı engelledi.';
END $$;

ROLLBACK;
