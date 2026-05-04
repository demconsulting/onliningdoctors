import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PracticeRole = "owner" | "doctor" | "nurse" | "receptionist" | "practice_admin";
export type PracticeMemberStatus = "invited" | "active" | "suspended";

export interface Practice {
  id: string;
  practice_name: string;
  practice_number: string;
  owner_id: string;
  owner_doctor_name: string;
  owner_hpcsa_number: string;
  email: string;
  phone: string;
  address: string;
  nurses_can_support_consultations: boolean;
  is_active: boolean;
}

export interface PracticeMember {
  id: string;
  practice_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: PracticeRole;
  hpcsa_number: string | null;
  status: PracticeMemberStatus;
  created_at: string;
}

export const usePractice = (userId: string | null | undefined) => {
  const [practice, setPractice] = useState<Practice | null>(null);
  const [myMember, setMyMember] = useState<PracticeMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    // Try as owner first
    const { data: owned } = await supabase
      .from("practices")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    let p: Practice | null = (owned as Practice | null) ?? null;
    let me: PracticeMember | null = null;

    if (!p) {
      const { data: memberRow } = await supabase
        .from("practice_members")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (memberRow) {
        me = memberRow as PracticeMember;
        const { data: pr } = await supabase
          .from("practices").select("*").eq("id", memberRow.practice_id).maybeSingle();
        p = (pr as Practice | null) ?? null;
      }
    } else {
      const { data: ownerMember } = await supabase
        .from("practice_members")
        .select("*")
        .eq("practice_id", p.id)
        .eq("user_id", userId)
        .maybeSingle();
      me = (ownerMember as PracticeMember | null) ?? null;
    }

    setPractice(p);
    setMyMember(me);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const isManager = !!myMember && (myMember.role === "owner" || myMember.role === "practice_admin");

  return { practice, myMember, isManager, loading, refresh };
};
