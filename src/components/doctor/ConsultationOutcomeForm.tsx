import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ConsultationOutcomeFormProps {
  user: User;
  appointmentId: string;
}

const ConsultationOutcomeForm = ({ user, appointmentId }: ConsultationOutcomeFormProps) => {
  const [outcome, setOutcome] = useState("");
  const [conductFlag, setConductFlag] = useState("");
  const [adminAttention, setAdminAttention] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("consultation_outcomes")
      .select("*")
      .eq("appointment_id", appointmentId)
      .eq("doctor_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setOutcome(data.outcome || "");
          setConductFlag(data.conduct_flag || "");
          setAdminAttention(data.admin_attention_required);
          setInternalNote(data.internal_note || "");
        }
        setFetching(false);
      });
  }, [appointmentId, user.id]);

  const handleSubmit = async () => {
    setLoading(true);

    const payload = {
      appointment_id: appointmentId,
      doctor_id: user.id,
      outcome: outcome || null,
      conduct_flag: conductFlag || null,
      admin_attention_required: adminAttention,
      internal_note: internalNote.trim() || null,
    };

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("consultation_outcomes")
        .update(payload)
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("consultation_outcomes")
        .insert(payload));
    }

    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: existing ? "Outcome updated" : "Outcome recorded" });
      if (!existing) {
        // Refresh
        const { data } = await supabase
          .from("consultation_outcomes")
          .select("*")
          .eq("appointment_id", appointmentId)
          .eq("doctor_id", user.id)
          .maybeSingle();
        if (data) setExisting(data);
      }
    }
  };

  if (fetching) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Consultation Outcome
          <span className="text-[10px] text-muted-foreground font-normal">(Private — not visible to patients)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Outcome</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
              <SelectItem value="referred">Referred to Specialist</SelectItem>
              <SelectItem value="inconclusive">Inconclusive</SelectItem>
              <SelectItem value="no_show">Patient No-Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Patient Conduct</Label>
          <Select value={conductFlag} onValueChange={setConductFlag}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select conduct..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="disruptive">Disruptive</SelectItem>
              <SelectItem value="abusive">Abusive / Threatening</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={adminAttention} onCheckedChange={setAdminAttention} id="admin-attention" />
          <Label htmlFor="admin-attention" className="text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-warning" /> Flag for Admin Attention
          </Label>
        </div>

        <div>
          <Label className="text-xs">Internal Note</Label>
          <Textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={2}
            placeholder="Private notes about this consultation..."
            className="text-sm"
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} size="sm" variant="outline" className="gap-1">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {existing ? "Update Outcome" : "Save Outcome"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConsultationOutcomeForm;
