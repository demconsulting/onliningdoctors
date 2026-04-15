
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doctor_name TEXT;
  patient_name TEXT;
  admin_id UUID;
BEGIN
  SELECT full_name INTO patient_name FROM profiles WHERE id = NEW.patient_id;
  SELECT full_name INTO doctor_name FROM profiles WHERE id = NEW.doctor_id;

  patient_name := COALESCE(patient_name, 'Patient');
  doctor_name := COALESCE(doctor_name, 'Doctor');

  -- New appointment booked
  IF TG_OP = 'INSERT' THEN
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
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.patient_id,
        'Appointment Confirmed',
        'Dr. ' || doctor_name || ' confirmed your appointment on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM'),
        'appointment',
        '/dashboard'
      );
    ELSIF NEW.status = 'cancelled' THEN
      IF OLD.status IN ('pending', 'confirmed') THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          NEW.patient_id,
          'Appointment Cancelled',
          'Your appointment with Dr. ' || doctor_name || ' on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM') || ' has been cancelled.',
          'appointment',
          '/dashboard'
        );
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
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.patient_id,
        'Appointment Completed',
        'Your appointment with Dr. ' || doctor_name || ' is complete. You can now leave a review.',
        'appointment',
        '/dashboard'
      );
    ELSIF NEW.status = 'no_show' THEN
      -- Notify all admins about no-show
      FOR admin_id IN
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          admin_id,
          'Appointment No-Show',
          'No-show reported: ' || patient_name || ' with Dr. ' || doctor_name || ' on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM') || '.',
          'alert',
          '/admin'
        );
      END LOOP;
      -- Also notify the patient
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.patient_id,
        'Missed Appointment',
        'You missed your appointment with Dr. ' || doctor_name || ' on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM') || '.',
        'appointment',
        '/dashboard'
      );
      -- Also notify the doctor
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.doctor_id,
        'Patient No-Show',
        patient_name || ' did not attend the appointment on ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH12:MI AM') || '.',
        'appointment',
        '/doctor'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
