import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Clock, XCircle, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type Status = "not_uploaded" | "pending" | "verified" | "rejected";

interface Props {
  user: User;
  onGoToDocuments?: () => void;
}

const IdentityVerificationCard = ({ user, onGoToDocuments }: Props) => {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_patient_id_verification_status", { _user: user.id });
      if (!cancelled) setStatus((data as Status) || "not_uploaded");
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  if (status === null) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking identity verification…
        </CardContent>
      </Card>
    );
  }

  const cfg: Record<Status, { icon: any; label: string; tone: string; help: string; cta?: string }> = {
    verified:     { icon: ShieldCheck, label: "Verified",            tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10", help: "Your identity is verified. Referral payouts are enabled." },
    pending:      { icon: Clock,       label: "Pending verification", tone: "text-amber-700 dark:text-amber-400 bg-amber-500/10",        help: "We're reviewing your document. This usually takes 1–2 business days.", cta: "View documents" },
    rejected:     { icon: XCircle,     label: "Rejected",             tone: "text-destructive bg-destructive/10",                        help: "Your document was rejected. Please upload a clearer ID or passport.",   cta: "Re-upload" },
    not_uploaded: { icon: ShieldAlert, label: "Required",             tone: "text-destructive bg-destructive/10",                        help: "Upload your South African ID or passport to enable payouts and full access.", cta: "Upload ID" },
  };
  const c = cfg[status];
  const Icon = c.icon;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.tone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-foreground">Identity Verification</p>
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-medium text-foreground">{c.label}</span> — {c.help}
            </p>
          </div>
        </div>
        {c.cta && onGoToDocuments && (
          <Button size="sm" variant={status === "verified" ? "outline" : "default"} onClick={onGoToDocuments}>
            {c.cta}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default IdentityVerificationCard;
