import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Change = {
  id: string;
  doctor_id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  doctor_name?: string;
  doctor_email?: string;
};

const fmt = (v: any) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v || "—";
  try { return JSON.stringify(v); } catch { return String(v); }
};

const AdminDoctorProfileReviews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Change[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Change | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("doctor_profile_changes" as any)
      .select("*")
      .order("created_at", { ascending: false });
    const rows = ((data as any) || []) as Change[];
    const doctorIds = Array.from(new Set(rows.map(r => r.doctor_id)));
    if (doctorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name").in("id", doctorIds);
      const map = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
      rows.forEach(r => { r.doctor_name = map.get(r.doctor_id) || "Unknown doctor"; });
    }
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (c: Change) => {
    setBusyId(c.id);
    const { error } = await supabase.rpc("approve_profile_change" as any, { _change_id: c.id });
    setBusyId(null);
    if (error) {
      toast({ variant: "destructive", title: "Approve failed", description: error.message });
    } else {
      toast({ title: "Change approved" });
      load();
    }
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (reason.trim().length === 0) {
      toast({ variant: "destructive", title: "Reason required" });
      return;
    }
    setBusyId(rejecting.id);
    const { error } = await supabase.rpc("reject_profile_change" as any, {
      _change_id: rejecting.id, _reason: reason.trim(),
    });
    setBusyId(null);
    if (error) {
      toast({ variant: "destructive", title: "Reject failed", description: error.message });
    } else {
      toast({ title: "Change rejected" });
      setRejecting(null); setReason("");
      load();
    }
  };

  const filter = (s: string) => items.filter(i => i.status === s);

  const List = ({ rows, showActions }: { rows: Change[]; showActions: boolean }) => {
    if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>;
    return (
      <div className="space-y-3">
        {rows.map(c => (
          <div key={c.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-[260px] space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.doctor_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="capitalize">{c.field_name.replace(/_/g, " ")}</span>
                  <Badge variant={c.status === "pending" ? "secondary" : c.status === "approved" ? "default" : "destructive"}>
                    {c.status}
                  </Badge>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Old:</span> {fmt(c.old_value)}</div>
                  <div><span className="text-muted-foreground">New:</span> {fmt(c.new_value)}</div>
                </div>
                {c.rejection_reason && (
                  <p className="text-sm text-destructive">Reason: {c.rejection_reason}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(c.created_at).toLocaleString()}
                  {c.reviewed_at && ` · Reviewed ${new Date(c.reviewed_at).toLocaleString()}`}
                </p>
              </div>
              {showActions && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(c)} disabled={busyId === c.id} className="gap-1">
                    {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setRejecting(c); setReason(""); }} disabled={busyId === c.id} className="gap-1">
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <ShieldCheck className="h-5 w-5 text-primary" /> Doctor Profile Reviews
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review verification-critical changes submitted by doctors. Approving applies the new value to the live profile.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({filter("pending").length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({filter("approved").length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({filter("rejected").length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4"><List rows={filter("pending")} showActions /></TabsContent>
            <TabsContent value="approved" className="mt-4"><List rows={filter("approved")} showActions={false} /></TabsContent>
            <TabsContent value="rejected" className="mt-4"><List rows={filter("rejected")} showActions={false} /></TabsContent>
          </Tabs>
        )}
      </CardContent>

      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject change</DialogTitle>
            <DialogDescription>
              Tell the doctor why this update was rejected. They will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection..." rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejecting(null); setReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={busyId === rejecting?.id}>
              {busyId === rejecting?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminDoctorProfileReviews;
