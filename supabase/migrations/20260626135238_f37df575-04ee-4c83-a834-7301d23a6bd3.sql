
-- 1. expense-receipts: allow doctor (creator) to read their own receipts
CREATE POLICY "Doctors read own expense receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.receipt_path = storage.objects.name
      AND e.created_by = auth.uid()
  )
);

-- 2. site_content: replace denylist with allowlist of explicitly public keys
DROP POLICY IF EXISTS "Public can view non-sensitive site content" ON public.site_content;

CREATE POLICY "Public can view safe site content keys"
ON public.site_content
FOR SELECT
TO anon, authenticated
USING (key IN ('hero', 'branding', 'appointment_reminder_minutes'));
