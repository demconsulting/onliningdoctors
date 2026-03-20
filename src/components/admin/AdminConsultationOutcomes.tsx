import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

const AdminConsultationOutcomes = () => {
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("consultation_outcomes")
        .select("*, doctor:doctor_id(full_name)")
        .eq("admin_attention_required", true)
        .order("created_at", { ascending: false });
      if (data) setOutcomes(data);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <ClipboardCheck className="h-5 w-5 text-primary" /> Flagged Consultation Outcomes
          {outcomes.length > 0 && <Badge variant="destructive" className="text-xs">{outcomes.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {outcomes.length === 0 && <p className="text-sm text-muted-foreground">No flagged outcomes.</p>}
        {outcomes.map((o) => (
          <div key={o.id} className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">Dr. {o.doctor?.full_name || "Unknown"}</span>
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {o.outcome && <Badge variant="outline" className="text-xs">{o.outcome}</Badge>}
              {o.conduct_flag && (
                <Badge variant={o.conduct_flag === "abusive" ? "destructive" : "outline"} className="text-xs">
                  Conduct: {o.conduct_flag}
                </Badge>
              )}
            </div>
            {o.internal_note && <p className="text-sm text-foreground">{o.internal_note}</p>}
            <p className="text-xs text-muted-foreground">Appointment: {o.appointment_id}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminConsultationOutcomes;
