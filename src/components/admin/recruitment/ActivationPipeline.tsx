import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const STAGES = [
  { key: "verified", label: "Verified" },
  { key: "awaiting_cohort", label: "Awaiting Cohort Activation" },
  { key: "activated", label: "Activated" },
  { key: "first_consultation", label: "First Consultation Completed" },
  { key: "active", label: "Active Doctor" },
];

export default function ActivationPipeline() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recruitment_activation_events" as any)
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200);
      setEvents((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const grouped: Record<string, any[]> = {};
  events.forEach((e) => {
    const k = e.doctor_profile_id || e.prospect_id || "unknown";
    (grouped[k] ||= []).push(e);
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Activation Stages</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <Badge variant="outline">{i + 1}. {s.label}</Badge>
                {i < STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activation Events</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activation events recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).slice(0, 25).map(([k, list]) => (
                <div key={k} className="border-l-2 border-primary pl-4 space-y-2">
                  <p className="font-mono text-xs text-muted-foreground">{k}</p>
                  {list.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="font-medium">{STAGES.find((s) => s.key === e.event_type)?.label || e.event_type}</span>
                      <Clock className="h-3 w-3 text-muted-foreground ml-2" />
                      <span className="text-muted-foreground text-xs">{format(new Date(e.occurred_at), "yyyy-MM-dd HH:mm")}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
