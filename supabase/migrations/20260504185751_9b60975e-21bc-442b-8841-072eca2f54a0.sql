CREATE POLICY "Authenticated users read own notifications topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() ~ ('^notifications-' || (auth.uid())::text || '$')
);