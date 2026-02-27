
-- Signaling messages for WebRTC (ephemeral, cleaned up after calls)
CREATE TABLE public.webrtc_signaling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'hang-up'
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webrtc_signaling_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read messages addressed to them
CREATE POLICY "Users can read own signaling messages"
  ON public.webrtc_signaling_messages FOR SELECT
  USING (receiver_id = auth.uid());

-- Participants can send signaling messages
CREATE POLICY "Users can send signaling messages"
  ON public.webrtc_signaling_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Participants can delete their messages (cleanup)
CREATE POLICY "Users can delete own signaling messages"
  ON public.webrtc_signaling_messages FOR DELETE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signaling_messages;

-- Index for fast lookups
CREATE INDEX idx_signaling_receiver ON public.webrtc_signaling_messages(receiver_id, appointment_id);
