import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ShieldCheck, MessageCircleQuestion, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ChangeStatus = "pending" | "approved" | "rejected" | "needs_info";

type Change = {
  id: string;
  doctor_id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  status: ChangeStatus;
  rejection_reason: string | null;
  info_request_message?: string | null;
  created_at: string;
  reviewed_at: string | null;
  doctor_name?: string;
  hpcsa_number?: string;
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  license_number: "HPCSA Registration Number",
  specialty_id: "Specialty",
  education: "Qualifications",
  license_document_path: "HPCSA Document",
  id_document_path: "ID Document",
  practice_name: "Practice Name",
};

const fmt = (v: any) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v || "—";
  try { return JSON.stringify(v); } catch { return String(v); }
};

const statusBadge = (s: ChangeStatus) => {
  switch (s) {
    case "approved": return <Badge variant="default">approved</Badge>;
    case "rejected": return <Badge variant="destructive">rejected</Badge>;
    case "needs_info": return <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">needs info</Badge>;
    default: return <Badge variant="secondary">pending</Badge>;
  }
};

const AdminDoctorProfileReviews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Change[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Change | null>(null);
  const [requestingInfo, setRequestingInfo] = useState<Change | null>(null);
  const [reason, setReason] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("doctor_profile_changes" as any)
      .select("*")
      .order("created_at", { ascending: false });
    const rows = ((data as any) || []) as Change[];
    const doctorIds = Array.from(new Set(rows.map(r => r.doctor_id)));
    if (doctorIds.length > 0) {
      const [{ data: profs }, { data: docs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", doctorIds),
        supabase.from("doctors").select("profile_id, license_number").in("profile_id", doctorIds),
      ]);
      const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
      const hpcsaMap = new Map((docs || []).map((d: any) => [d.profile_id, d.license_number]));
      rows.forEach(r => {
        r.doctor_name = nameMap.get(r.doctor_id) || "Unknown doctor";
        r.hpcsa_number = hpcsaMap.get(r.doctor_id) || "—";
      });
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

  const submitInfoRequest = async () => {
    if (!requestingInfo) return;
    if (infoMessage.trim().length === 0) {
      toast({ variant: "destructive", title: "Message required" });
      return;
    }
    setBusyId(requestingInfo.id);
    const { error } = await supabase.rpc("request_profile_change_info" as any, {
      _change_id: requestingInfo.id, _message: infoMessage.trim(),
    });
    setBusyId(null);
    if (error) {
      toast({ variant: "destructive", title: "Request failed", description: error.message });
    } else {
      toast({ title: "Information requested" });
      setRequestingInfo(null); setInfoMessage("");
      load();
    }
  };

  const filter = (s: ChangeStatus) => items.filter(i => i.status === s);
  const pending = filter("pending");
  const needsInfo = filter("needs_info");

  // Group pending by doctor for the "Pending Approvals" widget
  const pendingByDoctor = pending.reduce<Map<string, Change[]>>((acc, c) => {
    const arr = acc.get(c.doctor_id) || [];
    arr.push(c);
    acc.set(c.doctor_id, arr);
    return acc;
  }, new Map());

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
                  <span className="text-xs text-muted-foreground">HPCSA: {c.hpcsa_number}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{FIELD_LABELS[c.field_name] || c.field_name.replace(/_/g, " ")}</span>
                  {statusBadge(c.status)}
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Old:</span> {fmt(c.old_value)}</div>
                  <div><span className="text-muted-foreground">New:</span> {fmt(c.new_value)}</div>
                </div>
                {c.rejection_reason && (
                  <p className="text-sm text-destructive">Rejection reason: {c.rejection_reason}</p>
                )}
                {c.info_request_message && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Info requested: {c.info_request_message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(c.created_at).toLocaleString()}
                  {c.reviewed_at && ` · Reviewed ${new Date(c.reviewed_at).toLocaleString()}`}
                </p>
              </div>
              {showActions && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approve(c)} disabled={busyId === c.id} className="gap-1">
                    {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRequestingInfo(c); setInfoMessage(""); }} disabled={busyId === c.id} className="gap-1">
                    <MessageCircleQuestion className="h-4 w-4" /> Request Info
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
    <div className="space-y-4">
      {/* Pending Approvals widget */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ClipboardList className="h-5 w-5 text-primary" /> Pending Approvals
            <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
            {needsInfo.length > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
                {needsInfo.length} awaiting doctor
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctor profile changes awaiting review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Doctor</th>
                    <th className="py-2 pr-3">HPCSA</th>
                    <th className="py-2 pr-3">Fields Changed</th>
                    <th className="py-2 pr-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(pendingByDoctor.entries()).map(([doctorId, changes]) => {
                    const oldest = changes.reduce((a, b) => (a.created_at < b.created_at ? a : b));
                    return (
                      <tr key={doctorId} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{changes[0].doctor_name}</td>
                        <td className="py-2 pr-3">{changes[0].hpcsa_number}</td>
                        <td className="py-2 pr-3">
                          {changes.map(c => FIELD_LABELS[c.field_name] || c.field_name.replace(/_/g, " ")).join(", ")}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {new Date(oldest.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                <TabsTrigger value="needs_info">Needs Info ({needsInfo.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({filter("approved").length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({filter("rejected").length})</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4"><List rows={pending} showActions /></TabsContent>
              <TabsContent value="needs_info" className="mt-4"><List rows={needsInfo} showActions={false} /></TabsContent>
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

        <Dialog open={!!requestingInfo} onOpenChange={(o) => { if (!o) { setRequestingInfo(null); setInfoMessage(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request additional information</DialogTitle>
              <DialogDescription>
                Tell the doctor what additional information or document you need. They will be notified.
              </DialogDescription>
            </DialogHeader>
            <Textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)} placeholder="e.g. Please upload a clearer copy of your HPCSA certificate." rows={4} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setRequestingInfo(null); setInfoMessage(""); }}>Cancel</Button>
              <Button onClick={submitInfoRequest} disabled={busyId === requestingInfo?.id}>
                {busyId === requestingInfo?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default AdminDoctorProfileReviews;
