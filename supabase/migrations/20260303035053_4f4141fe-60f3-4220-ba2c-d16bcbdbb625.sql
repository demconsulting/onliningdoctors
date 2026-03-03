
-- Add license document path to doctors table
ALTER TABLE public.doctors ADD COLUMN license_document_path text;

-- Create storage bucket for doctor license documents
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-licenses', 'doctor-licenses', false);

-- Doctors can upload their own license
CREATE POLICY "Doctors can upload own license"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'doctor-licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Doctors can view their own license
CREATE POLICY "Doctors can view own license"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'doctor-licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Doctors can update/replace their own license
CREATE POLICY "Doctors can update own license"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'doctor-licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all licenses
CREATE POLICY "Admins can view all doctor licenses"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'doctor-licenses'
  AND public.has_role(auth.uid(), 'admin')
);

-- Doctors can delete own license
CREATE POLICY "Doctors can delete own license"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'doctor-licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
