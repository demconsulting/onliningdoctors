CREATE OR REPLACE FUNCTION public.guard_direct_settlement_payout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = ANY(NEW.payment_ids)
      AND (p.metadata->>'settlement_mode' = 'paystack_split'
           OR p.metadata->'metadata'->>'settlement_mode' = 'paystack_split')
  ) THEN
    RAISE EXCEPTION 'Payments split directly by Paystack cannot be included in a manual payout';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_direct_settlement_payout() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_direct_settlement_payout
BEFORE INSERT OR UPDATE OF payment_ids, status ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_direct_settlement_payout();