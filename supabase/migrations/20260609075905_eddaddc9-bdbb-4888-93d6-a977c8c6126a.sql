
-- 1) Add verification columns to patient_documents
ALTER TABLE public.patient_documents
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS expiry_date date;

ALTER TABLE public.patient_documents
  DROP CONSTRAINT IF EXISTS patient_documents_verification_status_check;
ALTER TABLE public.patient_documents
  ADD CONSTRAINT patient_documents_verification_status_check
  CHECK (verification_status IN ('pending','verified','rejected'));

-- 2) Add phone_verified to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- 3) Admin update policy for verification fields
DROP POLICY IF EXISTS "Admins can update patient document verification" ON public.patient_documents;
CREATE POLICY "Admins can update patient document verification"
  ON public.patient_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Admins can read all patient documents (for review)
DROP POLICY IF EXISTS "Admins can read all patient documents" ON public.patient_documents;
CREATE POLICY "Admins can read all patient documents"
  ON public.patient_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- 4) RPC: ID verification status for a user
CREATE OR REPLACE FUNCTION public.get_patient_id_verification_status(_user uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status FROM public.patient_documents
      WHERE patient_id = _user
        AND document_type IN ('id_document','passport')
      ORDER BY
        CASE verification_status WHEN 'verified' THEN 0 WHEN 'pending' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 1),
    'not_uploaded'
  );
$$;

-- 5) RPC: full identity verification check
CREATE OR REPLACE FUNCTION public.is_identity_verified(_user uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_ok boolean;
  v_phone_ok boolean;
  v_email_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.patient_documents
     WHERE patient_id = _user
       AND document_type IN ('id_document','passport')
       AND verification_status = 'verified'
  ) INTO v_id_ok;

  SELECT COALESCE(phone_verified,false) INTO v_phone_ok FROM public.profiles WHERE id = _user;
  SELECT (email_confirmed_at IS NOT NULL) INTO v_email_ok FROM auth.users WHERE id = _user;

  RETURN COALESCE(v_id_ok,false) AND COALESCE(v_phone_ok,false) AND COALESCE(v_email_ok,false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_id_verification_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_identity_verified(uuid) TO authenticated;

-- 6) Admin RPCs: approve / reject patient document
CREATE OR REPLACE FUNCTION public.admin_approve_patient_document(_doc_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_patient uuid; v_type text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Only admins'; END IF;
  UPDATE public.patient_documents
     SET verification_status='verified', verified_by=auth.uid(), verified_at=now(), rejection_reason=NULL
   WHERE id=_doc_id
  RETURNING patient_id, document_type INTO v_patient, v_type;
  IF v_patient IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_patient, 'Identity Verified', 'Your ' || v_type || ' has been verified.', 'success', '/dashboard?tab=documents');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_patient_document(_doc_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_patient uuid; v_type text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Only admins'; END IF;
  IF _reason IS NULL OR length(trim(_reason))=0 THEN RAISE EXCEPTION 'Reason required'; END IF;
  UPDATE public.patient_documents
     SET verification_status='rejected', verified_by=auth.uid(), verified_at=now(), rejection_reason=_reason
   WHERE id=_doc_id
  RETURNING patient_id, document_type INTO v_patient, v_type;
  IF v_patient IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_patient, 'Document Rejected', 'Your ' || v_type || ' was rejected: ' || _reason, 'warning', '/dashboard?tab=documents');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_patient_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_patient_document(uuid,text) TO authenticated;
