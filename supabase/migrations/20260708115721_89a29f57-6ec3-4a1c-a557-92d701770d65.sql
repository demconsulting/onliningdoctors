-- Drop any client-facing INSERT policies on public.payments.
-- Payment rows must be created only by the paystack-payment edge function
-- (which uses the service role and bypasses RLS), never directly from the client.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', pol.policyname);
  END LOOP;
END $$;