
-- Function to create notifications on appointment events
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  doctor_name TEXT;
  patient_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_user_id UUID;
BEGIN
  -- Get names
  SELECT full_name INTO patient_name FROM profiles WHERE id = NEW.patient_id;
  SELECT full_name INTO doctor_name FROM profiles WHERE id = NEW.doctor_id;

  patient_name := COALESCE(patient_name, 'Patient');
  doctor_name := COALESCE(doctor_name, 'Doctor');

  -- New appointment booked
  IF TG_OP = 'INSERT' THEN
    -- Notify doctor
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.doctor_id,
      'New Appointment Request',
      patient_name || ' has booked an appointment on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM'),
      'appointment',
      '/doctor'
    );
    RETURN NEW;
  END IF;

  -- Status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      -- Notify patient
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.patient_id,
        'Appointment Confirmed',
        'Dr. ' || doctor_name || ' confirmed your appointment on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM'),
        'appointment',
        '/dashboard'
      );
    ELSIF NEW.status = 'cancelled' THEN
      -- Notify the other party
      IF OLD.status IN ('pending', 'confirmed') THEN
        -- Notify patient
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          NEW.patient_id,
          'Appointment Cancelled',
          'Your appointment with Dr. ' || doctor_name || ' on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM') || ' has been cancelled.',
          'appointment',
          '/dashboard'
        );
        -- Notify doctor
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          NEW.doctor_id,
          'Appointment Cancelled',
          patient_name || '''s appointment on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM') || ' has been cancelled.',
          'appointment',
          '/doctor'
        );
      END IF;
    ELSIF NEW.status = 'completed' THEN
      -- Notify patient
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.patient_id,
        'Appointment Completed',
        'Your appointment with Dr. ' || doctor_name || ' is complete. You can now leave a review.',
        'appointment',
        '/dashboard'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on appointments table
CREATE TRIGGER trg_notify_appointment_change
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION notify_appointment_change();
