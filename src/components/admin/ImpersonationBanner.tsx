import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

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
      className="fixed inset-x-0 top-0 z-[100] border-b border-amber-500/40 bg-gradient-to-r from-amber-500/95 via-amber-500/90 to-orange-500/95 text-amber-50 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-amber-500/85"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50/20 ring-1 ring-amber-50/40">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          </span>
          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-amber-50/40">
            <AvatarFallback className="bg-amber-50/20 text-amber-50 text-xs font-semibold">
              {initials(active.target_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
              Impersonation active
            </div>
            <div className="text-sm font-medium truncate">
              Signed in as {active.target_name}
              {active.target_email ? (
                <span className="ml-1 font-normal opacity-80">({active.target_email})</span>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={endImpersonation}
          disabled={busy}
          className="gap-1.5 bg-amber-50 text-amber-900 hover:bg-amber-50/90 shadow-sm border-0"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="h-4 w-4" aria-hidden="true" />
          )}
          Return to Admin
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
