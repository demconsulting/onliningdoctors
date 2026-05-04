-- Tighten realtime.messages policies to prevent topic spoofing.
-- Only allow exact signaling channel pattern: signaling-<uuid>-<auth.uid()>
DROP POLICY IF EXISTS "Authenticated users read own topic" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users write own topic" ON realtime.messages;

CREATE POLICY "Authenticated users read own signaling topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() ~ ('^signaling-[0-9a-fA-F-]{36}-' || (auth.uid())::text || '$')
);

CREATE POLICY "Authenticated users write own signaling topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() ~ ('^signaling-[0-9a-fA-F-]{36}-' || (auth.uid())::text || '$')
);