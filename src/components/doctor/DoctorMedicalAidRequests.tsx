import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Inbox, CheckCircle2, XCircle, Coins, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Props { user: User; }

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", approved: "Approved", rejected: "Rejected",
  copay_requested: "Co-payment", private_requested: "Private requested", cancelled: "Cancelled",
};

const DoctorMedicalAidRequests = ({ user }: Props) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "copay" | "private" | null>(null);
  const [rate, setRate] = useState<string>("");
  const [copay, setCopay] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("medical_aid_requests")
      .select("*, patient:patient_id(full_name, avatar_url)")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`maid-doc-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "medical_aid_requests", filter: `doctor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user.id]);

  const open = (r: any, a: typeof action) => {
    setEditing(r); setAction(a);
    setRate(r.approved_rate?.toString() || "");
    setCopay(r.copayment_amount?.toString() || "");
    setNotes(r.doctor_notes || "");
  };

  const submit = async () => {
    if (!editing || !action) return;
    let patch: any = { doctor_notes: notes.trim() || null };
    if (action === "approve") {
      if (!rate || Number(rate) < 0) { toast({ variant: "destructive", title: "Enter approved rate" }); return; }
      patch.status = "approved"; patch.approved_rate = Number(rate); patch.copayment_amount = null;
    } else if (action === "reject") {
      patch.status = "rejected";
    } else if (action === "copay") {
      if (!rate || !copay) { toast({ variant: "destructive", title: "Enter rate and co-payment" }); return; }
      patch.status = "copay_requested"; patch.approved_rate = Number(rate); patch.copayment_amount = Number(copay);
    } else if (action === "private") {
      patch.status = "private_requested";
    }
    setSaving(true);
    const { error } = await supabase.from("medical_aid_requests").update(patch).eq("id", editing.id);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Update failed", description: error.message }); return; }
    toast({ title: "Patient notified" });
    setEditing(null); setAction(null); load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display"><Inbox className="h-5 w-5 text-primary" /> Medical Aid Requests</CardTitle>
        <CardDescription>Review patient medical aid submissions and decide whether to approve, reject, request a co-payment, or convert to private payment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No medical aid requests yet.</p>}
        {requests.map((r: any) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{r.patient?.full_name || "Patient"}</p>
                  <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" || r.status === "copay_requested" ? "default" : "outline"}>
                    {STATUS_LABEL[r.status] || r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.scheme_name}{r.plan ? ` · ${r.plan}` : ""} · Member #{r.membership_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  Main member: {r.main_member_name}{r.dependent_code ? ` · Dep code: ${r.dependent_code}` : ""}
                </p>
                {r.approved_rate != null && (
                  <p className="text-xs mt-1">Approved rate: <strong>{Number(r.approved_rate).toFixed(2)}</strong>
                    {r.copayment_amount != null && <> · Co-pay: <strong>{Number(r.copayment_amount).toFixed(2)}</strong></>}
                  </p>
                )}
              </div>
              {r.status === "pending" && (
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" onClick={() => open(r, "approve")} className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => open(r, "copay")} className="gap-1"><Coins className="h-3.5 w-3.5" /> Co-payment</Button>
                  <Button size="sm" variant="outline" onClick={() => open(r, "private")} className="gap-1"><ArrowRight className="h-3.5 w-3.5" /> Private</Button>
                  <Button size="sm" variant="ghost" onClick={() => open(r, "reject")} className="gap-1"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setAction(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" && "Approve medical aid"}
              {action === "reject" && "Reject medical aid"}
              {action === "copay" && "Request co-payment"}
              {action === "private" && "Request private payment"}
            </DialogTitle>
            <DialogDescription>
              {editing?.scheme_name}{editing?.plan ? ` · ${editing.plan}` : ""} — {editing?.patient?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(action === "approve" || action === "copay") && (
              <div>
                <Label>Approved consultation rate *</Label>
                <Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
            )}
            {action === "copay" && (
              <div>
                <Label>Co-payment amount *</Label>
                <Input type="number" min={0} step="0.01" value={copay} onChange={(e) => setCopay(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Notes for patient (optional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditing(null); setAction(null); }}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Send response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DoctorMedicalAidRequests;
