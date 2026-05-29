import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

/**
 * Sticky top banner shown whenever the current session is an impersonated user.
 * Rendered at the root of <App /> so it sits above every page including
 * fallbacks and route boundaries.
 */
const ImpersonationBanner = () => {
  const { isImpersonating, active, endImpersonation, busy } = useImpersonation();

  if (!isImpersonating || !active) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-destructive/40 bg-destructive px-4 py-2 text-destructive-foreground shadow-md"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          You are impersonating <strong>{active.target_name}</strong>
          {active.target_email ? (
            <span className="ml-1 opacity-80">({active.target_email})</span>
          ) : null}
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={endImpersonation}
        disabled={busy}
        className="gap-1.5"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        )}
        Return to Admin
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
