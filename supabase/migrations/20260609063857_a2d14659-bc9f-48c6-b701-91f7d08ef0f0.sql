
-- ai_handoffs: scope to authenticated only
DROP POLICY IF EXISTS "Users view their own handoffs" ON public.ai_handoffs;
CREATE POLICY "Users view their own handoffs"
ON public.ai_handoffs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ai_conversations c
  WHERE c.id = ai_handoffs.conversation_id AND c.user_id = auth.uid()
));

-- expense_categories: admin only
DROP POLICY IF EXISTS "Authenticated can view expense categories" ON public.expense_categories;

-- founding_doctor_program: admin only (public counter uses get_founding_slots RPC)
DROP POLICY IF EXISTS "Authenticated can view founding program" ON public.founding_doctor_program;

-- referral_program_settings: admin only
DROP POLICY IF EXISTS "Auth read program settings" ON public.referral_program_settings;

-- referral_reward_settings: admin only
DROP POLICY IF EXISTS "Auth read reward settings" ON public.referral_reward_settings;

-- reviews: drop public/anon policy. Public reads go through get_public_reviews RPC which omits patient_id.
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Patients view own reviews"
ON public.reviews FOR SELECT TO authenticated
USING (patient_id = auth.uid());
