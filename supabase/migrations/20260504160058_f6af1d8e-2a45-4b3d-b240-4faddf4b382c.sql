-- Remove the duplicate "Demo Dcotor" account (typo). It has no bookings, payments,
-- prescriptions, notes, or pricing tiers — only stale availability rows.
DELETE FROM public.doctor_availability WHERE doctor_id = '997a4ba9-ad4c-4d09-af97-74f5ba298c90';
DELETE FROM public.doctors WHERE id = '8d06ecc6-1b0f-44aa-bda4-0a809e81359d';
DELETE FROM public.user_roles WHERE user_id = '997a4ba9-ad4c-4d09-af97-74f5ba298c90';
DELETE FROM public.profiles WHERE id = '997a4ba9-ad4c-4d09-af97-74f5ba298c90';
DELETE FROM auth.users WHERE id = '997a4ba9-ad4c-4d09-af97-74f5ba298c90';