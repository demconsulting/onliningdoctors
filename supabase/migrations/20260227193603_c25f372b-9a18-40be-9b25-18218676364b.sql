
-- Allow admins to view all user roles (needed for AdminUsers component)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add length constraints to contact_submissions to prevent abuse
ALTER TABLE public.contact_submissions
ADD CONSTRAINT contact_name_length CHECK (length(name) <= 100),
ADD CONSTRAINT contact_email_length CHECK (length(email) <= 255),
ADD CONSTRAINT contact_subject_length CHECK (length(subject) <= 200),
ADD CONSTRAINT contact_message_length CHECK (length(message) <= 5000);
