
-- Enum for practice member roles
CREATE TYPE public.practice_role AS ENUM ('owner', 'doctor', 'nurse', 'receptionist', 'practice_admin');
CREATE TYPE public.practice_member_status AS ENUM ('invited', 'active', 'suspended');

-- Practices table
CREATE TABLE public.practices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_name TEXT NOT NULL CHECK (length(practice_name) BETWEEN 2 AND 200),
  practice_number TEXT NOT NULL UNIQUE CHECK (length(practice_number) BETWEEN 3 AND 50),
  owner_id UUID NOT NULL,
  owner_doctor_name TEXT NOT NULL CHECK (length(owner_doctor_name) BETWEEN 2 AND 200),
  owner_hpcsa_number TEXT NOT NULL CHECK (length(owner_hpcsa_number) BETWEEN 2 AND 50),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 255),
  phone TEXT NOT NULL CHECK (length(phone) BETWEEN 3 AND 50),
  address TEXT NOT NULL CHECK (length(address) BETWEEN 3 AND 500),
  nurses_can_support_consultations BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_practices_owner_id ON public.practices(owner_id);

-- Practice members table
CREATE TABLE public.practice_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 200),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 255),
  phone TEXT CHECK (phone IS NULL OR length(phone) BETWEEN 3 AND 50),
  role public.practice_role NOT NULL,
  hpcsa_number TEXT,
  status public.practice_member_status NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practice_id, email),
  CHECK (role <> 'doctor' OR (hpcsa_number IS NOT NULL AND length(hpcsa_number) BETWEEN 2 AND 50))
);

CREATE INDEX idx_practice_members_practice_id ON public.practice_members(practice_id);
CREATE INDEX idx_practice_members_user_id ON public.practice_members(user_id);
CREATE INDEX idx_practice_members_email ON public.practice_members(lower(email));

-- Add practice_id to doctors table
ALTER TABLE public.doctors ADD COLUMN practice_id UUID REFERENCES public.practices(id) ON DELETE SET NULL;
CREATE INDEX idx_doctors_practice_id ON public.doctors(practice_id);

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_practice_member(_practice_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.practice_members
    WHERE practice_id = _practice_id
      AND user_id = _user_id
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.practices WHERE id = _practice_id AND owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_practice_manager(_practice_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.practices WHERE id = _practice_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.practice_members
    WHERE practice_id = _practice_id
      AND user_id = _user_id
      AND status = 'active'
      AND role IN ('owner', 'practice_admin')
  )
$$;

-- Enable RLS
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_members ENABLE ROW LEVEL SECURITY;

-- Practices RLS
CREATE POLICY "Verified doctors can create practices"
ON public.practices FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND has_role(auth.uid(), 'doctor'::app_role)
  AND EXISTS (SELECT 1 FROM public.doctors d WHERE d.profile_id = auth.uid() AND d.is_verified = true)
);

CREATE POLICY "Members can view their practice"
ON public.practices FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_practice_member(id, auth.uid()));

CREATE POLICY "Admins can view all practices"
ON public.practices FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or practice admin can update practice"
ON public.practices FOR UPDATE TO authenticated
USING (public.is_practice_manager(id, auth.uid()))
WITH CHECK (public.is_practice_manager(id, auth.uid()));

CREATE POLICY "Owner can delete practice"
ON public.practices FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- Practice members RLS
CREATE POLICY "Members can view team in their practice"
ON public.practice_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_practice_member(practice_id, auth.uid())
);

CREATE POLICY "Admins can view all practice members"
ON public.practice_members FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can add practice members"
ON public.practice_members FOR INSERT TO authenticated
WITH CHECK (public.is_practice_manager(practice_id, auth.uid()));

CREATE POLICY "Managers can update practice members"
ON public.practice_members FOR UPDATE TO authenticated
USING (public.is_practice_manager(practice_id, auth.uid()))
WITH CHECK (public.is_practice_manager(practice_id, auth.uid()));

CREATE POLICY "Managers can remove practice members"
ON public.practice_members FOR DELETE TO authenticated
USING (public.is_practice_manager(practice_id, auth.uid()));

-- updated_at triggers
CREATE TRIGGER update_practices_updated_at
BEFORE UPDATE ON public.practices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_members_updated_at
BEFORE UPDATE ON public.practice_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create owner as active member on practice creation
CREATE OR REPLACE FUNCTION public.handle_new_practice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.practice_members (practice_id, user_id, full_name, email, phone, role, hpcsa_number, status)
  VALUES (NEW.id, NEW.owner_id, NEW.owner_doctor_name, NEW.email, NEW.phone, 'owner', NEW.owner_hpcsa_number, 'active')
  ON CONFLICT (practice_id, email) DO NOTHING;

  -- Link the owner's doctor record to the new practice
  UPDATE public.doctors SET practice_id = NEW.id WHERE profile_id = NEW.owner_id AND practice_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_practice_created
AFTER INSERT ON public.practices
FOR EACH ROW EXECUTE FUNCTION public.handle_new_practice();
