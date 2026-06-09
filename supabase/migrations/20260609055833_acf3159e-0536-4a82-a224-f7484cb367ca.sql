
DROP POLICY IF EXISTS "Anyone records a click" ON public.referral_clicks;

CREATE POLICY "Anyone records a click for a valid code"
ON public.referral_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  code IS NOT NULL
  AND length(code) BETWEEN 4 AND 32
  AND EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.code = referral_clicks.code)
);
