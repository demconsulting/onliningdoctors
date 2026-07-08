-- expense_categories: admin-only reads/writes
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='expense_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.expense_categories', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage expense categories"
  ON public.expense_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- recruitment_source_catalog: admin-only reads/writes
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='recruitment_source_catalog'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.recruitment_source_catalog', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage recruitment sources"
  ON public.recruitment_source_catalog FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- webrtc_signaling_messages: allow both sender and receiver to read their own messages
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='webrtc_signaling_messages' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.webrtc_signaling_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Participants can read their signaling messages"
  ON public.webrtc_signaling_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);