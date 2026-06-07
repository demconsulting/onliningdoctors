import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, CheckCircle2 } from "lucide-react";
import { useFoundingSlots } from "@/hooks/useFoundingSlots";

const TARGET = 10;

export default function FoundingCohortDashboard() {
  const { slots } = useFoundingSlots();
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, verified: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recruitment_prospects" as any)
        .select("stage");
      const rows = (data as any[]) || [];
      const verified = rows.filter((r) => r.stage === "founding_doctor").length;
      const pending = rows.filter((r) => ["interested", "meeting_scheduled", "demo_completed", "invited", "registered", "pending_verification"].includes(r.stage)).length;
      const approved = rows.filter((r) => ["verified", "founding_doctor"].includes(r.stage)).length;
      const rejected = rows.filter((r) => r.stage === "declined").length;
      setStats({ pending, approved, rejected, verified });
    })();
  }, []);

  const filled = stats.verified;
  const remaining = Math.max(0, TARGET - filled);
  const pct = Math.round((filled / TARGET) * 100);
  const complete = filled >= TARGET;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Founding Doctor Cohort</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">{filled}<span className="text-base text-muted-foreground"> / {TARGET}</span></p>
            {complete ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Founding Cohort Complete</Badge>
            ) : (
              <Badge variant="outline">{remaining} remaining</Badge>
            )}
          </div>
          <Progress value={pct} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <Stat label="Target" value={TARGET} />
            <Stat label="Verified Founding" value={filled} />
            <Stat label="Applications Pending" value={stats.pending} />
            <Stat label="Applications Rejected" value={stats.rejected} />
          </div>
          {slots && (
            <p className="text-xs text-muted-foreground">Live slots: {slots.approved_count}/{slots.max_slots} (open: {slots.remaining})</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
