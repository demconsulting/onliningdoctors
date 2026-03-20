
-- FAQ Articles for AI Assistant knowledge base
CREATE TABLE public.faq_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published faq articles" ON public.faq_articles
  FOR SELECT TO public USING (is_published = true);

CREATE POLICY "Admins can manage faq articles" ON public.faq_articles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_faq_articles_updated_at BEFORE UPDATE ON public.faq_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI Conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai conversations" ON public.ai_conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all ai conversations" ON public.ai_conversations
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert ai conversations" ON public.ai_conversations
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update ai conversations" ON public.ai_conversations
  FOR UPDATE TO public USING (true);

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI Messages
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  tool_calls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai messages" ON public.ai_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all ai messages" ON public.ai_messages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert ai messages" ON public.ai_messages
  FOR INSERT TO public WITH CHECK (true);

-- AI Handoffs
CREATE TABLE public.ai_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.ai_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai handoffs" ON public.ai_handoffs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert ai handoffs" ON public.ai_handoffs
  FOR INSERT TO public WITH CHECK (true);

-- AI Audit Logs
CREATE TABLE public.ai_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai audit logs" ON public.ai_audit_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert ai audit logs" ON public.ai_audit_logs
  FOR INSERT TO public WITH CHECK (true);

-- Seed FAQ Articles
INSERT INTO public.faq_articles (title, content, category, sort_order) VALUES
('How do I book an appointment?', 'To book an appointment: 1) Browse our doctors or search by specialty on the Doctors page. 2) Select a doctor and choose an available time slot. 3) Complete payment to confirm your booking. Important: Your appointment is only confirmed after successful payment.', 'booking', 0),
('When is my appointment confirmed?', 'Your appointment is confirmed ONLY after successful payment. Appointments with unpaid, pending, failed, or cancelled payments are NOT confirmed bookings. You will receive a notification once payment is successful and your appointment is confirmed.', 'booking', 1),
('What payment methods are accepted?', 'We accept payments through Paystack, which supports card payments, bank transfers, and mobile money. Payment is required before your appointment is confirmed.', 'payment', 2),
('What if my payment fails?', 'If your payment fails, your appointment will remain in "awaiting payment" status and is NOT confirmed. You can retry the payment from your dashboard. If you have an unresolved awaiting-payment appointment, you cannot book a new one until it is resolved. Contact support if issues persist.', 'payment', 3),
('How do online consultations work?', 'Online consultations happen via our built-in video call system. Once your appointment is confirmed (after successful payment), you will see a "Join Call" button on your patient dashboard at the scheduled time. The doctor will join the same video call. You can also share medical documents with your doctor during the consultation.', 'consultation', 4),
('How do I join my consultation?', 'Go to your patient dashboard at the scheduled appointment time. Click the "Join Call" button next to your confirmed appointment. Make sure your camera and microphone permissions are enabled in your browser. The session will automatically transition to past status 30 minutes after the scheduled end time.', 'consultation', 5),
('Can I cancel or reschedule my appointment?', 'You can cancel a pending or confirmed appointment from your patient dashboard. To reschedule, cancel the existing appointment and book a new one at your preferred time. Note that cancellation policies may apply.', 'cancellation', 6),
('How do I upload medical documents?', 'Go to your patient dashboard and navigate to the Documents section. You can upload medical records, test results, prescriptions, and other relevant documents. During a consultation, you can grant your doctor access to view your documents using the document sharing toggle.', 'technical', 7),
('Is my data private and secure?', 'Yes. We take your privacy very seriously. Your medical information, documents, and consultation details are stored securely with encryption and access controls. Only you and your authorized healthcare provider can access your medical data.', 'privacy', 8),
('What if I have technical issues?', 'If you experience technical issues: 1) Refresh your browser page. 2) Check your internet connection. 3) Ensure camera and microphone permissions are granted in browser settings. 4) Try using a different browser (Chrome recommended). 5) Clear your browser cache. If issues persist, contact our support team.', 'technical', 9),
('Medical Emergency Disclaimer', 'IMPORTANT: This platform is NOT for medical emergencies. If you are experiencing a medical emergency such as chest pain, difficulty breathing, severe bleeding, loss of consciousness, or thoughts of self-harm, call your local emergency number IMMEDIATELY (e.g., 911, 112, 999) or go to the nearest emergency room. Do not use online consultations for emergency situations.', 'emergency', 10);
