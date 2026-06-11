ALTER VIEW public.public_doctors SET (security_invoker = false);
GRANT SELECT ON public.public_doctors TO anon, authenticated;