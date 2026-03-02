
-- Table for doctor consultation notes (per appointment)
CREATE TABLE public.consultation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one note per appointment
ALTER TABLE public.consultation_notes ADD CONSTRAINT consultation_notes_appointment_unique UNIQUE (appointment_id);

-- Enable RLS
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;

-- Only the doctor of the appointment can insert
CREATE POLICY "Doctors can create notes for their appointments"
ON public.consultation_notes FOR INSERT
WITH CHECK (
  doctor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = consultation_notes.appointment_id
    AND a.doctor_id = auth.uid()
  )
);

-- Only the doctor can view their own notes
CREATE POLICY "Doctors can view own consultation notes"
ON public.consultation_notes FOR SELECT
USING (doctor_id = auth.uid());

-- Only the doctor can update their own notes
CREATE POLICY "Doctors can update own consultation notes"
ON public.consultation_notes FOR UPDATE
USING (doctor_id = auth.uid());

-- Patients can view notes for their appointments (transparency)
CREATE POLICY "Patients can view notes for their appointments"
ON public.consultation_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = consultation_notes.appointment_id
    AND a.patient_id = auth.uid()
  )
);

-- Admins can view all notes
CREATE POLICY "Admins can view all consultation notes"
ON public.consultation_notes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_consultation_notes_updated_at
BEFORE UPDATE ON public.consultation_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
