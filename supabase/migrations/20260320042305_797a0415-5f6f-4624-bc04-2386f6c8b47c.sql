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
  admin_id uuid;
BEGIN
  IF NEW.comment IS NOT NULL AND length(trim(NEW.comment)) > 0 THEN
    lower_comment := lower(NEW.comment);
    FOREACH word IN ARRAY flagged_words LOOP
      IF lower_comment LIKE '%' || word || '%' THEN
        NEW.moderation_status := 'pending';
        NEW.flagged_reason := 'Contains flagged keyword: ' || word;
        NEW.is_visible := false;

        -- Notify all admins
        FOR admin_id IN
          SELECT user_id FROM public.user_roles WHERE role = 'admin'
        LOOP
          INSERT INTO public.notifications (user_id, title, message, type, link)
          VALUES (
            admin_id,
            'Review Flagged for Moderation',
            'A patient review was auto-flagged (' || word || '). Please review it in the admin panel.',
            'moderation',
            '/admin'
          );
        END LOOP;

        RETURN NEW;
      END IF;
    END LOOP;
  END IF;
  NEW.moderation_status := 'approved';
  NEW.is_visible := true;
  RETURN NEW;
END;
$$;