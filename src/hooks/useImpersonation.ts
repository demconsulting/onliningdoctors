import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ActiveImpersonation,
  clearActive,
  clearBackup,
  getActive,
  getBackup,
  setActive,
  setBackup,
} from "@/lib/impersonation";

export function useImpersonation() {
  const [active, setActiveState] = useState<ActiveImpersonation | null>(() => getActive());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setActiveState(getActive());
    window.addEventListener("impersonation:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("impersonation:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const startImpersonation = useCallback(
    async (opts: { targetUserId: string; reason: string; adminName?: string | null }) => {
      const { targetUserId, reason, adminName } = opts;
      if (!reason || reason.trim().length < 5) {
        throw new Error("A reason of at least 5 characters is required.");
      }
      setBusy(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("You must be signed in.");

        // Snapshot admin credentials BEFORE swapping the session.
        setBackup({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          admin_user_id: session.user.id,
          admin_name: adminName ?? session.user.user_metadata?.full_name ?? session.user.email ?? null,
          saved_at: new Date().toISOString(),
        });

        const { data, error } = await supabase.functions.invoke("impersonate-user", {
          body: { target_user_id: targetUserId, reason: reason.trim() },
        });
        if (error) {
          clearBackup();
          throw new Error(error.message || "Impersonation failed");
        }
        const payload = data as {
          log_id: string;
          access_token: string;
          refresh_token: string;
          target: { id: string; email: string; full_name: string };
        };

        const { error: setErr } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });
        if (setErr) {
          clearBackup();
          throw setErr;
        }

        setActive({
          log_id: payload.log_id,
          target_user_id: payload.target.id,
          target_name: payload.target.full_name,
          target_email: payload.target.email,
          started_at: new Date().toISOString(),
        });

        window.location.assign("/dashboard");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const endImpersonation = useCallback(async () => {
    setBusy(true);
    try {
      const current = getActive();
      const backup = getBackup();

      if (current?.log_id) {
        try {
          await supabase.functions.invoke("end-impersonation", {
            body: { log_id: current.log_id },
          });
        } catch (e) {
          console.warn("Failed to mark impersonation ended:", e);
        }
      }

      clearActive();

      if (backup?.access_token && backup?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: backup.access_token,
          refresh_token: backup.refresh_token,
        });
        if (error) {
          // Token may have rotated; force re-login.
          console.warn("Restoring admin session failed, signing out:", error);
          await supabase.auth.signOut();
          clearBackup();
          window.location.assign("/login");
          return;
        }
      } else {
        await supabase.auth.signOut();
        window.location.assign("/login");
        return;
      }

      clearBackup();
      window.location.assign("/admin");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    isImpersonating: !!active,
    active,
    busy,
    startImpersonation,
    endImpersonation,
  };
}
