
INSERT INTO public.specialties (name, description, icon) VALUES
('General Medicine', 'Primary care for common illnesses and preventive health', 'Stethoscope'),
('Cardiology', 'Heart and cardiovascular system specialists', 'Heart'),
('Dermatology', 'Skin, hair, and nail conditions', 'Scan'),
('Pediatrics', 'Medical care for infants, children, and adolescents', 'Baby'),
('Orthopedics', 'Bone, joint, and muscle disorders', 'Bone'),
('Neurology', 'Brain and nervous system disorders', 'Brain'),
('Psychiatry', 'Mental health and behavioral disorders', 'BrainCircuit'),
('Ophthalmology', 'Eye care and vision disorders', 'Eye'),
('ENT', 'Ear, nose, and throat specialists', 'Ear'),
('Gynecology', 'Women''s reproductive health', 'HeartPulse'),
('Urology', 'Urinary tract and male reproductive system', 'Activity'),
('Endocrinology', 'Hormonal and metabolic disorders', 'Pill');

INSERT INTO public.faqs (question, answer, category, sort_order) VALUES
('How do I book an appointment?', 'Simply search for a doctor by specialty, view their profile, and click "Book Appointment" to select a time slot that works for you.', 'booking', 1),
('Is the video consultation secure?', 'Yes, all video consultations use end-to-end encrypted WebRTC connections. Your privacy is our top priority.', 'security', 2),
('How do I pay for a consultation?', 'Payment is processed securely at the time of booking. We accept major credit cards and digital payment methods.', 'billing', 3),
('Can I upload medical documents?', 'Yes, you can securely upload and share medical documents with your doctor through your patient dashboard.', 'features', 4),
('How do I cancel or reschedule?', 'You can cancel or reschedule from your dashboard up to 2 hours before the appointment time.', 'booking', 5),
('What if I have a technical issue during the call?', 'Our support team is available 24/7. You can also rejoin the call from your dashboard if disconnected.', 'support', 6);

INSERT INTO public.hero_stats (label, value, icon, sort_order) VALUES
('Active Doctors', '500+', 'UserCheck', 1),
('Consultations', '50,000+', 'Video', 2),
('Specialties', '30+', 'Stethoscope', 3),
('Patient Rating', '4.9/5', 'Star', 4);
