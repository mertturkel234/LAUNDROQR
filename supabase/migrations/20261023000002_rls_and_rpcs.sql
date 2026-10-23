-- =============================================================================
-- LAUNDROQR — MIGRATION 0002: ROW LEVEL SECURITY & ATOMIC LIFECYCLE RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES (DENY BY DEFAULT)
-- -----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_state_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. SECURITY HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Check if current authenticated user is a platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND status = 'active'
  );
$$;

-- Check if current authenticated user has an active membership in the organization
-- with one of the specified roles.
CREATE OR REPLACE FUNCTION public.has_org_role(
  p_org_id UUID,
  p_roles public.membership_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND organization_id = p_org_id
      AND status = 'active'
      AND role = ANY(p_roles)
  );
$$;

-- Check if current authenticated user belongs to the organization (any active role)
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_org_role(
    p_org_id,
    ARRAY['platform_admin', 'organization_admin', 'laundry_staff', 'resident']::public.membership_role[]
  );
$$;

-- -----------------------------------------------------------------------------
-- 3. RLS POLICIES PER TABLE
-- -----------------------------------------------------------------------------

-- 3.1 organizations
CREATE POLICY "org_select_member"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "org_modify_platform_admin"
  ON public.organizations FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 3.2 buildings
CREATE POLICY "buildings_select_member"
  ON public.buildings FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "buildings_modify_admin"
  ON public.buildings FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[]));

-- 3.3 laundry_rooms
CREATE POLICY "rooms_select_member"
  ON public.laundry_rooms FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "rooms_modify_admin_or_staff"
  ON public.laundry_rooms FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]));

-- 3.4 machines
CREATE POLICY "machines_select_member"
  ON public.machines FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "machines_modify_admin_or_staff"
  ON public.machines FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]));

-- 3.5 memberships (Prevent privilege escalation!)
CREATE POLICY "memberships_select_own_or_admin"
  ON public.memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[])
  );

-- Only organization_admin or platform_admin can insert/update/delete memberships.
-- Additionally, organization_admin cannot grant platform_admin.
CREATE POLICY "memberships_insert_admin_only"
  ON public.memberships FOR INSERT
  WITH CHECK (
    public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[])
    AND (role <> 'platform_admin' OR public.is_platform_admin())
  );

CREATE POLICY "memberships_update_admin_only"
  ON public.memberships FOR UPDATE
  USING (
    public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[])
  )
  WITH CHECK (
    public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[])
    AND (role <> 'platform_admin' OR public.is_platform_admin())
  );

CREATE POLICY "memberships_delete_admin_only"
  ON public.memberships FOR DELETE
  USING (
    public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[])
  );

-- 3.6 machine_sessions
-- Members of the organization can view sessions in their organization
CREATE POLICY "sessions_select_org_member"
  ON public.machine_sessions FOR SELECT
  USING (public.is_org_member(organization_id));

-- Direct INSERT/UPDATE by residents is blocked in favor of server-authoritative RPCs;
-- Admin/staff can manage via policy if needed.
CREATE POLICY "sessions_modify_admin_or_staff"
  ON public.machine_sessions FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]));

-- 3.7 maintenance_tickets
CREATE POLICY "tickets_select_org_member"
  ON public.maintenance_tickets FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "tickets_insert_org_member"
  ON public.maintenance_tickets FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND reported_by = auth.uid()
  );

CREATE POLICY "tickets_update_staff_or_admin"
  ON public.maintenance_tickets FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]));

-- 3.8 machine_state_events
CREATE POLICY "state_events_select_org_member"
  ON public.machine_state_events FOR SELECT
  USING (public.is_org_member(organization_id));

-- 3.9 audit_logs
CREATE POLICY "audit_logs_select_admin_only"
  ON public.audit_logs FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[])
  );

-- 3.10 notification_preferences & device_tokens
CREATE POLICY "notif_prefs_own_user"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_tokens_own_user"
  ON public.device_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3.11 machine_reservations
CREATE POLICY "reservations_select_org_member"
  ON public.machine_reservations FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "reservations_insert_own"
  ON public.machine_reservations FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND user_id = auth.uid()
  );

-- 3.12 telemetry_events
CREATE POLICY "telemetry_select_staff_or_admin"
  ON public.telemetry_events FOR SELECT
  USING (public.has_org_role(organization_id, ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]));

-- -----------------------------------------------------------------------------
-- 4. ATOMIC SERVER-SIDE RPC FUNCTIONS (SESSION & MACHINE LIFECYCLE)
-- -----------------------------------------------------------------------------

-- 4.1 Start a machine session atomically via QR Code ID
CREATE OR REPLACE FUNCTION public.start_machine_session(
  p_qr_code_id UUID,
  p_estimated_duration INT DEFAULT NULL,
  p_program_name TEXT DEFAULT 'Standart Yıkama (40°C)'
)
RETURNS public.machine_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_machine public.machines%ROWTYPE;
  v_duration INT;
  v_now TIMESTAMPTZ := now();
  v_session public.machine_sessions%ROWTYPE;
  v_active_user_sessions INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum açmanız gerekiyor (UNAUTHENTICATED).';
  END IF;

  -- Lock the target machine row to prevent concurrent race conditions
  SELECT *
  INTO v_machine
  FROM public.machines
  WHERE qr_code_id = p_qr_code_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz veya süresi dolmuş QR kodu (INVALID_QR_CODE).';
  END IF;

  -- Verify organization membership
  IF NOT public.is_org_member(v_machine.organization_id) THEN
    RAISE EXCEPTION 'Bu organizasyondaki makineleri kullanma yetkiniz yok (FORBIDDEN_ORG).';
  END IF;

  IF NOT v_machine.is_active OR v_machine.status = 'out_of_service' THEN
    RAISE EXCEPTION 'Bu makine şu anda kullanım dışı veya bakımda (MACHINE_OUT_OF_SERVICE).';
  END IF;

  IF v_machine.status <> 'available' THEN
    RAISE EXCEPTION 'Makine şu anda müsait değil (Mevcut durum: %). Lütfen önce makinenin boşaltıldığından emin olun.', v_machine.status;
  END IF;

  -- Check fair use: maximum 2 active sessions per resident in the same org
  SELECT COUNT(*)
  INTO v_active_user_sessions
  FROM public.machine_sessions
  WHERE user_id = v_user_id
    AND organization_id = v_machine.organization_id
    AND status = 'active';

  IF v_active_user_sessions >= 2 THEN
    RAISE EXCEPTION 'Aynı anda en fazla 2 aktif çamaşır/kurutma seansı başlatabilirsiniz (LIMIT_EXCEEDED).';
  END IF;

  v_duration := COALESCE(p_estimated_duration, v_machine.default_duration_minutes);
  IF v_duration < 10 OR v_duration > 240 THEN
    RAISE EXCEPTION 'Tahmini süre 10 ile 240 dakika arasında olmalıdır (INVALID_DURATION).';
  END IF;

  -- Insert active session (uq_one_active_session_per_machine also enforces uniqueness)
  INSERT INTO public.machine_sessions (
    organization_id,
    laundry_room_id,
    machine_id,
    user_id,
    program_name,
    status,
    estimated_duration,
    started_at,
    estimated_end_at
  ) VALUES (
    v_machine.organization_id,
    v_machine.laundry_room_id,
    v_machine.id,
    v_user_id,
    COALESCE(NULLIF(trim(p_program_name), ''), 'Standart Yıkama (40°C)'),
    'active',
    v_duration,
    v_now,
    v_now + make_interval(mins => v_duration)
  )
  RETURNING * INTO v_session;

  -- Transition machine state to in_use (software timer estimate)
  UPDATE public.machines
  SET status = 'in_use',
      status_source = 'software',
      updated_at = v_now
  WHERE id = v_machine.id;

  -- Log machine state transition
  INSERT INTO public.machine_state_events (
    organization_id, machine_id, session_id, from_status, to_status, source, actor_id, notes
  ) VALUES (
    v_machine.organization_id, v_machine.id, v_session.id,
    v_machine.status, 'in_use', 'software', v_user_id,
    'QR kod ile yazılım tabanlı seans başlatıldı'
  );

  -- Audit log
  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_machine.organization_id, v_user_id, 'session.started', 'machine_session', v_session.id,
    jsonb_build_object('machine_id', v_machine.id, 'estimated_duration', v_duration)
  );

  RETURN v_session;
END;
$$;

-- 4.2 Finish or cancel an active session
CREATE OR REPLACE FUNCTION public.finish_machine_session(
  p_session_id UUID,
  p_action TEXT, -- 'complete' | 'cancel' | 'complete_and_unload'
  p_reason TEXT DEFAULT NULL
)
RETURNS public.machine_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session public.machine_sessions%ROWTYPE;
  v_is_staff BOOLEAN;
  v_now TIMESTAMPTZ := now();
  v_next_machine_status public.machine_status;
  v_next_source public.status_source_type;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum açmanız gerekiyor (UNAUTHENTICATED).';
  END IF;

  SELECT *
  INTO v_session
  FROM public.machine_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seans bulunamadı (SESSION_NOT_FOUND).';
  END IF;

  v_is_staff := public.has_org_role(
    v_session.organization_id,
    ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]
  );

  IF v_session.user_id <> v_user_id AND NOT v_is_staff THEN
    RAISE EXCEPTION 'Başka bir kullanıcıya ait seansı sonlandıramazsınız (FORBIDDEN).';
  END IF;

  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Bu seans zaten sonlandırılmış (Mevcut durum: %).', v_session.status;
  END IF;

  IF p_action = 'cancel' THEN
    UPDATE public.machine_sessions
    SET status = 'cancelled',
        cancelled_at = v_now,
        cancellation_reason = COALESCE(p_reason, 'Kullanıcı tarafından iptal edildi')
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    v_next_machine_status := 'available';
    v_next_source := 'user_report';
  ELSIF p_action = 'complete_and_unload' THEN
    UPDATE public.machine_sessions
    SET status = 'completed',
        completed_at = v_now
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    v_next_machine_status := 'available';
    v_next_source := 'user_report';
  ELSIF p_action = 'complete' THEN
    UPDATE public.machine_sessions
    SET status = 'completed',
        completed_at = v_now
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    -- Honest state modeling: cycle_complete does NOT mean physically empty!
    v_next_machine_status := 'cycle_complete';
    v_next_source := 'software';
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem türü: %', p_action;
  END IF;

  UPDATE public.machines
  SET status = v_next_machine_status,
      status_source = v_next_source,
      updated_at = v_now
  WHERE id = v_session.machine_id
    AND status <> 'out_of_service';

  INSERT INTO public.machine_state_events (
    organization_id, machine_id, session_id, from_status, to_status, source, actor_id, notes
  ) VALUES (
    v_session.organization_id, v_session.machine_id, v_session.id,
    'in_use', v_next_machine_status, v_next_source, v_user_id,
    COALESCE(p_reason, 'Seans durumu güncellendi: ' || p_action)
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_session.organization_id, v_user_id, 'session.' || p_action, 'machine_session', v_session.id,
    jsonb_build_object('machine_id', v_session.machine_id, 'next_machine_status', v_next_machine_status)
  );

  RETURN v_session;
END;
$$;

-- 4.3 Confirm a cycle_complete machine has been unloaded -> available
CREATE OR REPLACE FUNCTION public.confirm_machine_unloaded(
  p_machine_id UUID,
  p_notes TEXT DEFAULT 'Makine boşaltıldı olarak bildirildi'
)
RETURNS public.machines
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_machine public.machines%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum açmanız gerekiyor (UNAUTHENTICATED).';
  END IF;

  SELECT *
  INTO v_machine
  FROM public.machines
  WHERE id = p_machine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Makine bulunamadı (MACHINE_NOT_FOUND).';
  END IF;

  IF NOT public.is_org_member(v_machine.organization_id) THEN
    RAISE EXCEPTION 'Yetkisiz organizasyon erişimi (FORBIDDEN_ORG).';
  END IF;

  IF v_machine.status <> 'cycle_complete' THEN
    RAISE EXCEPTION 'Yalnızca döngüsü tamamlanmış (cycle_complete) makineler boşaltıldı olarak işaretlenebilir.';
  END IF;

  UPDATE public.machines
  SET status = 'available',
      status_source = 'user_report',
      updated_at = now()
  WHERE id = v_machine.id
  RETURNING * INTO v_machine;

  INSERT INTO public.machine_state_events (
    organization_id, machine_id, from_status, to_status, source, actor_id, notes
  ) VALUES (
    v_machine.organization_id, v_machine.id, 'cycle_complete', 'available', 'user_report', v_user_id, p_notes
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_machine.organization_id, v_user_id, 'machine.unloaded', 'machine', v_machine.id,
    jsonb_build_object('notes', p_notes)
  );

  RETURN v_machine;
END;
$$;

-- 4.4 Rotate machine QR Code ID safely (Staff/Admin only)
CREATE OR REPLACE FUNCTION public.rotate_machine_qr(
  p_machine_id UUID,
  p_reason TEXT DEFAULT 'Yönetici tarafından güvenlik amaçlı QR kod yenilendi'
)
RETURNS public.machines
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_machine public.machines%ROWTYPE;
  v_old_qr UUID;
BEGIN
  SELECT *
  INTO v_machine
  FROM public.machines
  WHERE id = p_machine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Makine bulunamadı (MACHINE_NOT_FOUND).';
  END IF;

  IF NOT public.has_org_role(
    v_machine.organization_id,
    ARRAY['organization_admin', 'laundry_staff']::public.membership_role[]
  ) THEN
    RAISE EXCEPTION 'QR kod yenileme işlemi için yönetici veya personel yetkisi gereklidir (FORBIDDEN).';
  END IF;

  v_old_qr := v_machine.qr_code_id;

  UPDATE public.machines
  SET qr_code_id = gen_random_uuid(),
      qr_rotated_at = now(),
      updated_at = now()
  WHERE id = v_machine.id
  RETURNING * INTO v_machine;

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_machine.organization_id, v_user_id, 'machine.qr_rotated', 'machine', v_machine.id,
    jsonb_build_object('previous_qr_code_id', v_old_qr, 'new_qr_code_id', v_machine.qr_code_id, 'reason', p_reason)
  );

  RETURN v_machine;
END;
$$;
