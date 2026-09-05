CREATE OR REPLACE FUNCTION public.sync_request_on_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.doctor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Plan activated on Nalavation: close out any still-open requests for this doctor.
  IF lower(COALESCE(NEW.status, '')) IN ('active', 'trialing') THEN
    UPDATE public.nalavation_service_requests
    SET status = 'converted',
        updated_at = now()
    WHERE requester_user_id = NEW.doctor_id
      AND status IN ('new', 'quoted');
  ELSIF lower(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled') THEN
    UPDATE public.nalavation_service_requests
    SET status = 'declined',
        updated_at = now()
    WHERE requester_user_id = NEW.doctor_id
      AND status = 'converted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_on_subscription ON public.service_subscriptions;
CREATE TRIGGER trg_sync_request_on_subscription
AFTER INSERT OR UPDATE OF status ON public.service_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_request_on_subscription();