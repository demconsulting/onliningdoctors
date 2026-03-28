
-- 1. ai_conversations: Restrict UPDATE so users can only update their own conversations
DROP POLICY IF EXISTS "Anyone can update ai conversations" ON public.ai_conversations;

CREATE POLICY "Users can update own ai conversations"
ON public.ai_conversations
FOR UPDATE
TO public
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- 2. ai_conversations: Add basic validation on INSERT
DROP POLICY IF EXISTS "Anyone can insert ai conversations" ON public.ai_conversations;

CREATE POLICY "Anyone can insert ai conversations"
ON public.ai_conversations
FOR INSERT
TO public
WITH CHECK (
  length(session_id) > 0
  AND (auth.uid() IS NULL OR user_id = auth.uid())
);

-- 3. ai_messages: Validate insert belongs to a conversation
DROP POLICY IF EXISTS "Anyone can insert ai messages" ON public.ai_messages;

CREATE POLICY "Anyone can insert ai messages"
ON public.ai_messages
FOR INSERT
TO public
WITH CHECK (
  length(content) >= 0
  AND length(role) > 0
  AND EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = conversation_id)
);

-- 4. ai_audit_logs: Validate insert has an action
DROP POLICY IF EXISTS "Anyone can insert ai audit logs" ON public.ai_audit_logs;

CREATE POLICY "Anyone can insert ai audit logs"
ON public.ai_audit_logs
FOR INSERT
TO public
WITH CHECK (
  length(action) > 0
);

-- 5. ai_handoffs: Validate insert references a conversation
DROP POLICY IF EXISTS "Anyone can insert ai handoffs" ON public.ai_handoffs;

CREATE POLICY "Anyone can insert ai handoffs"
ON public.ai_handoffs
FOR INSERT
TO public
WITH CHECK (
  length(reason) > 0
  AND EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = conversation_id)
);

-- 6. support_tickets: Validate insert has required fields
DROP POLICY IF EXISTS "Anyone can insert support tickets" ON public.support_tickets;

CREATE POLICY "Anyone can insert support tickets"
ON public.support_tickets
FOR INSERT
TO public
WITH CHECK (
  length(email) > 0
  AND length(name) > 0
  AND length(message) > 0
);
