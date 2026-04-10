
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email events"
  ON public.email_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_email_events_message_id ON public.email_events (message_id);
CREATE INDEX idx_email_events_event_type ON public.email_events (event_type);
CREATE INDEX idx_email_events_email ON public.email_events (email);
