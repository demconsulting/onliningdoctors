ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS bhf_number text,
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';
