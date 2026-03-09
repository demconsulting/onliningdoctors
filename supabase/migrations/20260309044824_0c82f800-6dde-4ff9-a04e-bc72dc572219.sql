
-- =============================================
-- FIX: Recreate ALL RLS policies as PERMISSIVE
-- =============================================

-- APPOINTMENTS
DROP POLICY IF EXISTS "Doctors can update appointment status" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can cancel own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;

CREATE POLICY "Doctors can update appointment status" ON public.appointments FOR UPDATE TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Doctors can view their appointments" ON public.appointments FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Patients can cancel own appointments" ON public.appointments FOR UPDATE TO authenticated USING (patient_id = auth.uid() AND status = ANY(ARRAY['pending','confirmed']));
CREATE POLICY "Patients can create appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can view own appointments" ON public.appointments FOR SELECT TO authenticated USING (patient_id = auth.uid());

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CONSULTATION_NOTES
DROP POLICY IF EXISTS "Admins can view all consultation notes" ON public.consultation_notes;
DROP POLICY IF EXISTS "Doctors can create notes for their appointments" ON public.consultation_notes;
DROP POLICY IF EXISTS "Doctors can update own consultation notes" ON public.consultation_notes;
DROP POLICY IF EXISTS "Doctors can view own consultation notes" ON public.consultation_notes;
DROP POLICY IF EXISTS "Patients can view notes for their appointments" ON public.consultation_notes;

CREATE POLICY "Admins can view all consultation notes" ON public.consultation_notes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can create notes for their appointments" ON public.consultation_notes FOR INSERT TO authenticated WITH CHECK (doctor_id = auth.uid() AND EXISTS (SELECT 1 FROM appointments a WHERE a.id = consultation_notes.appointment_id AND a.doctor_id = auth.uid()));
CREATE POLICY "Doctors can update own consultation notes" ON public.consultation_notes FOR UPDATE TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Doctors can view own consultation notes" ON public.consultation_notes FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Patients can view notes for their appointments" ON public.consultation_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM appointments a WHERE a.id = consultation_notes.appointment_id AND a.patient_id = auth.uid()));

-- CONTACT_SUBMISSIONS
DROP POLICY IF EXISTS "Admins can delete contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

CREATE POLICY "Admins can delete contact submissions" ON public.contact_submissions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions FOR INSERT TO public WITH CHECK (length(email) > 0 AND length(message) > 0);

-- DOCTOR_PRICING_TIERS
DROP POLICY IF EXISTS "Anyone can view pricing tiers" ON public.doctor_pricing_tiers;
DROP POLICY IF EXISTS "Doctors can manage own pricing" ON public.doctor_pricing_tiers;

CREATE POLICY "Anyone can view pricing tiers" ON public.doctor_pricing_tiers FOR SELECT TO public USING (true);
CREATE POLICY "Doctors can manage own pricing" ON public.doctor_pricing_tiers FOR ALL TO authenticated USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());

-- DOCTORS
DROP POLICY IF EXISTS "Admins can update doctors" ON public.doctors;
DROP POLICY IF EXISTS "Anyone can view doctors" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can insert own profile" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctors;

CREATE POLICY "Admins can update doctors" ON public.doctors FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view doctors" ON public.doctors FOR SELECT TO public USING (true);
CREATE POLICY "Doctors can insert own profile" ON public.doctors FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid() AND has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Doctors can update own profile" ON public.doctors FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- DOCUMENT_SHARING
DROP POLICY IF EXISTS "Doctors can view sharing granted to them" ON public.document_sharing;
DROP POLICY IF EXISTS "Patients can create sharing" ON public.document_sharing;
DROP POLICY IF EXISTS "Patients can delete own sharing" ON public.document_sharing;
DROP POLICY IF EXISTS "Patients can update own sharing" ON public.document_sharing;
DROP POLICY IF EXISTS "Patients can view own sharing" ON public.document_sharing;

CREATE POLICY "Doctors can view sharing granted to them" ON public.document_sharing FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Patients can create sharing" ON public.document_sharing FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can delete own sharing" ON public.document_sharing FOR DELETE TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Patients can update own sharing" ON public.document_sharing FOR UPDATE TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Patients can view own sharing" ON public.document_sharing FOR SELECT TO authenticated USING (patient_id = auth.uid());

-- FAQS
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
DROP POLICY IF EXISTS "Anyone can view faqs" ON public.faqs;

CREATE POLICY "Admins can manage faqs" ON public.faqs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view faqs" ON public.faqs FOR SELECT TO public USING (true);

-- HERO_STATS
DROP POLICY IF EXISTS "Admins can manage hero_stats" ON public.hero_stats;
DROP POLICY IF EXISTS "Anyone can view hero_stats" ON public.hero_stats;

CREATE POLICY "Admins can manage hero_stats" ON public.hero_stats FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view hero_stats" ON public.hero_stats FOR SELECT TO public USING (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

-- PATIENT_DOCUMENTS
DROP POLICY IF EXISTS "Doctors can view shared documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Patients can delete own documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Patients can upload documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Patients can view own documents" ON public.patient_documents;

CREATE POLICY "Doctors can view shared documents" ON public.patient_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM document_sharing ds WHERE ds.patient_id = patient_documents.patient_id AND ds.doctor_id = auth.uid() AND ds.is_active = true));
CREATE POLICY "Patients can delete own documents" ON public.patient_documents FOR DELETE TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Patients can upload documents" ON public.patient_documents FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can view own documents" ON public.patient_documents FOR SELECT TO authenticated USING (patient_id = auth.uid());

-- PATIENT_MEDICAL_INFO
DROP POLICY IF EXISTS "Patients can update own medical info" ON public.patient_medical_info;
DROP POLICY IF EXISTS "Patients can upsert own medical info" ON public.patient_medical_info;
DROP POLICY IF EXISTS "Patients can view own medical info" ON public.patient_medical_info;

CREATE POLICY "Patients can update own medical info" ON public.patient_medical_info FOR UPDATE TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Patients can upsert own medical info" ON public.patient_medical_info FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can view own medical info" ON public.patient_medical_info FOR SELECT TO authenticated USING (patient_id = auth.uid());

-- PAYMENTS
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Doctors can view payments for their appointments" ON public.payments;
DROP POLICY IF EXISTS "Patients can view own payments" ON public.payments;
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;

CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can view payments for their appointments" ON public.payments FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Patients can view own payments" ON public.payments FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "System can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());

-- PAYOUT_REQUESTS
DROP POLICY IF EXISTS "Admins can manage payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Doctors can view own payout requests" ON public.payout_requests;

CREATE POLICY "Admins can manage payout requests" ON public.payout_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can view own payout requests" ON public.payout_requests FOR SELECT TO authenticated USING (doctor_id = auth.uid());

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles of doctors" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view profiles of doctors" ON public.profiles FOR SELECT TO public USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.profile_id = profiles.id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- REVIEWS
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
DROP POLICY IF EXISTS "Patients can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Patients can update own reviews" ON public.reviews;

CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can moderate reviews" ON public.reviews FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all reviews" ON public.reviews FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view visible reviews" ON public.reviews FOR SELECT TO public USING (is_visible = true);
CREATE POLICY "Patients can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid() AND EXISTS (SELECT 1 FROM appointments WHERE appointments.id = reviews.appointment_id AND appointments.patient_id = auth.uid() AND appointments.status = 'completed'));
CREATE POLICY "Patients can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (patient_id = auth.uid());

-- SITE_CONTENT
DROP POLICY IF EXISTS "Admins can manage site content" ON public.site_content;
DROP POLICY IF EXISTS "Anyone can view site content" ON public.site_content;

CREATE POLICY "Admins can manage site content" ON public.site_content FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view site content" ON public.site_content FOR SELECT TO public USING (true);

-- SPECIALTIES
DROP POLICY IF EXISTS "Admins can manage specialties" ON public.specialties;
DROP POLICY IF EXISTS "Anyone can view specialties" ON public.specialties;

CREATE POLICY "Admins can manage specialties" ON public.specialties FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view specialties" ON public.specialties FOR SELECT TO public USING (true);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- WEBRTC_SIGNALING_MESSAGES
DROP POLICY IF EXISTS "Users can delete own signaling messages" ON public.webrtc_signaling_messages;
DROP POLICY IF EXISTS "Users can read own signaling messages" ON public.webrtc_signaling_messages;
DROP POLICY IF EXISTS "Users can send signaling for their appointments" ON public.webrtc_signaling_messages;

CREATE POLICY "Users can delete own signaling messages" ON public.webrtc_signaling_messages FOR DELETE TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can read own signaling messages" ON public.webrtc_signaling_messages FOR SELECT TO authenticated USING (receiver_id = auth.uid());
CREATE POLICY "Users can send signaling for their appointments" ON public.webrtc_signaling_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM appointments WHERE appointments.id = webrtc_signaling_messages.appointment_id AND (appointments.patient_id = auth.uid() OR appointments.doctor_id = auth.uid()) AND appointments.status = ANY(ARRAY['confirmed','completed'])));
