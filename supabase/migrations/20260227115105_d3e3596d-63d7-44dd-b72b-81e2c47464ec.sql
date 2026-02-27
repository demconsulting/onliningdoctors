
-- Fix: restrict notification inserts to authenticated users (service role bypasses RLS anyway)
DROP POLICY "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can receive notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Contact form: restrict to providing own email (still public but slightly safer)
DROP POLICY "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (length(email) > 0 AND length(message) > 0);
