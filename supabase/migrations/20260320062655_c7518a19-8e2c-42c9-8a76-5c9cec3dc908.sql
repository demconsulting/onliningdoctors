-- Add slug and keywords columns to faq_articles
ALTER TABLE public.faq_articles 
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS question text,
  ADD COLUMN IF NOT EXISTS answer text,
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'web_form',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage support tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert support tickets" ON public.support_tickets
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add channel column to ai_conversations
ALTER TABLE public.ai_conversations 
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'visitor';

-- Add user_id to ai_audit_logs
ALTER TABLE public.ai_audit_logs 
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add tool_used column to ai_messages  
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS tool_used text;

-- Create updated_at trigger for support_tickets
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();