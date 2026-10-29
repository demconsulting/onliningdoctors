import { supabase } from "@/integrations/supabase/client";

/**
 * True if the user is a doctor — either verified (has the doctor role) or a
 * pending applicant (has a doctors record awaiting admin verification).
 * The doctor role itself is only granted by the database on verification.
 */
export async function hasDoctorAccount(
  userId: string,
  roles?: { role: string }[] | null,
): Promise<boolean> {
  if (roles?.some((r) => r.role === "doctor")) return true;
  const { data } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  return !!data;
}
