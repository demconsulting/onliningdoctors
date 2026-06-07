import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import ExportMenu from "./ExportMenu";

const STAGE_LABELS: Record<string, string> = {
  lead: "Prospects",
  contacted: "Contacted",
  interested: "Interested",
  meeting_scheduled: "Meetings Scheduled",
  demo_completed: "Meetings Completed",
  invited: "Invited",
  registered: "Registered",
  pending_verification: "Pending Verification",
  verified: "Verified",
  founding_doctor: "Founding Doctors",
  activated: "Activated",
  first_consultation_completed: "First Consultation",
};

export default function FunnelAnalytics() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_recruitment_funnel" as any);
      setRows((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const total = rows.find((r) => r.stage === "lead")?.current_count || 0;

  const enriched = rows.map((r) => {
    const conv = total > 0 ? Math.round((Number(r.current_count) / Number(total)) * 100) : 0;
    const delta = Number(r.current_count) - Number(r.prior_count);
    return { ...r, conversion: conv, delta };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu
          filename="recruitment-funnel"
          columns={[
            { key: "stage", label: "Stage" },
            { key: "current_count", label: "Count" },
            { key: "conversion", label: "Conversion %" },
            { key: "delta", label: "30d Δ" },
          ]}
          rows={enriched.map((r) => ({ ...r, stage: STAGE_LABELS[r.stage] || r.stage }))}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {enriched.map((r) => {
          const Icon = r.delta > 0 ? TrendingUp : r.delta < 0 ? TrendingDown : Minus;
          const trendColor = r.delta > 0 ? "text-emerald-600" : r.delta < 0 ? "text-rose-600" : "text-muted-foreground";
          return (
            <Card key={r.stage}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{STAGE_LABELS[r.stage] || r.stage}</p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-2xl font-bold">{r.current_count}</p>
                  <span className={`text-xs flex items-center gap-1 ${trendColor}`}><Icon className="h-3 w-3" />{r.delta >= 0 ? "+" : ""}{r.delta}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.conversion}% of prospects</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
