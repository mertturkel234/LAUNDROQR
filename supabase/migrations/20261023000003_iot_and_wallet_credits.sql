-- =============================================================================
-- LAUNDROQR — MIGRATION 0003: IOT HARDWARE COLUMNS & WALLET CREDITS SYSTEM
-- =============================================================================

-- 1. Phase 7: Add IoT hardware addressing columns to machines
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS machine_ip INET,
  ADD COLUMN IF NOT EXISTS mac_address TEXT CHECK (
    mac_address IS NULL OR mac_address ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
  );

-- 2. Phase 9: User Wallet / Credits Table
CREATE TABLE IF NOT EXISTS public.credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance_try     NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance_try >= 0),
  currency        TEXT NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR')),
  last_topup_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_credits_user ON public.credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_org ON public.credits(organization_id);

CREATE TRIGGER trg_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS on credits
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credits_select_own_or_admin"
  ON public.credits FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[])
  );

CREATE POLICY "credits_modify_admin"
  ON public.credits FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['organization_admin']::public.membership_role[]));

-- Atomic Wallet Top-Up RPC (Sandbox / Payment Gateway Callback Simulation)
CREATE OR REPLACE FUNCTION public.add_wallet_funds(
  p_org_id UUID,
  p_amount NUMERIC(10, 2),
  p_provider TEXT DEFAULT 'iyzico_sandbox'
)
RETURNS public.credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_credit public.credits%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum açmanız gerekiyor (UNAUTHENTICATED).';
  END IF;

  IF p_amount <= 0 OR p_amount > 5000 THEN
    RAISE EXCEPTION 'Yüklenecek tutar 1 TL ile 5000 TL arasında olmalıdır (INVALID_AMOUNT).';
  END IF;

  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Bu organizasyonda cüzdan işleminiz bulunmamaktadır (FORBIDDEN_ORG).';
  END IF;

  INSERT INTO public.credits (user_id, organization_id, balance_try, last_topup_at)
  VALUES (v_user_id, p_org_id, p_amount, now())
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET
    balance_try = public.credits.balance_try + EXCLUDED.balance_try,
    last_topup_at = now(),
    updated_at = now()
  RETURNING * INTO v_credit;

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    p_org_id, v_user_id, 'wallet.topup', 'credits', v_credit.id,
    jsonb_build_object('amount_try', p_amount, 'provider', p_provider, 'new_balance', v_credit.balance_try)
  );

  RETURN v_credit;
END;
$$;
