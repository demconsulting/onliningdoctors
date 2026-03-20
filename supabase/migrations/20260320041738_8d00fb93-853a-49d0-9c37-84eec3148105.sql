-- Add new columns to reviews for anonymous review system
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS doctor_clear_helpful boolean,
  ADD COLUMN IF NOT EXISTS doctor_professional boolean,
  ADD COLUMN IF NOT EXISTS would_recommend boolean,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS flagged_reason text;

-- Add comment length constraint
ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_max_length CHECK (length(comment) <= 250);

-- Create consultation_outcomes table for doctor-side private form
CREATE TABLE IF NOT EXISTS public.consultation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  outcome text,
  conduct_flag text,
  admin_attention_required boolean NOT NULL DEFAULT false,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

ALTER TABLE public.consultation_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS for consultation_outcomes
CREATE POLICY "Doctors can insert own outcomes" ON public.consultation_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND has_role(auth.uid(), 'doctor'));

CREATE POLICY "Doctors can update own outcomes" ON public.consultation_outcomes
  FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can view own outcomes" ON public.consultation_outcomes
  FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Admins can view all outcomes" ON public.consultation_outcomes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update outcomes" ON public.consultation_outcomes
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Update reviews RLS: replace public view policy to also check moderation_status
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
CREATE POLICY "Anyone can view approved visible reviews" ON public.reviews
  FOR SELECT TO public
  USING (is_visible = true AND moderation_status = 'approved');

-- Trigger function for keyword flagging on reviews
CREATE OR REPLACE FUNCTION public.flag_review_keywords()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  flagged_words text[] := ARRAY[
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
    'kill', 'murder', 'threat', 'die', 'attack',
    'sue', 'lawsuit', 'lawyer', 'court', 'legal action',
    'idiot', 'stupid', 'moron', 'retard',
    'harassment', 'harass', 'abuse', 'abusive',
    'nigger', 'faggot', 'slut', 'whore'
  ];
  word text;
  lower_comment text;
BEGIN
  IF NEW.comment IS NOT NULL AND length(trim(NEW.comment)) > 0 THEN
    lower_comment := lower(NEW.comment);
    FOREACH word IN ARRAY flagged_words LOOP
      IF lower_comment LIKE '%' || word || '%' THEN
        NEW.moderation_status := 'pending';
        NEW.flagged_reason := 'Contains flagged keyword: ' || word;
        NEW.is_visible := false;
        RETURN NEW;
      END IF;
    END LOOP;
  END IF;
  NEW.moderation_status := 'approved';
  NEW.is_visible := true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER review_keyword_flag
  BEFORE INSERT OR UPDATE OF comment ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.flag_review_keywords();

-- Updated_at trigger for consultation_outcomes
CREATE TRIGGER update_consultation_outcomes_updated_at
  BEFORE UPDATE ON public.consultation_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for consultation_outcomes
CREATE TRIGGER audit_consultation_outcomes
  AFTER INSERT OR UPDATE OR DELETE ON public.consultation_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_change();