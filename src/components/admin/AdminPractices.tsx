import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, Building2, MapPin, Phone, Mail, ShieldCheck, ShieldX, Eye, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PracticeStatus = "pending_admin_approval" | "approved" | "rejected";

interface Practice {
  id: string;
  practice_name: string;
  practice_number: string;
  owner_doctor_name: string;
  owner_hpcsa_number: string;
  email: string;
  phone: string;
  address: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  is_payout_verified: boolean;
  status: PracticeStatus | string;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusBadge = (status: PracticeStatus | string) => {
  switch (status) {
    case "pending_admin_approval":
      return <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Pending Approval</Badge>;
    case "approved":
      return <Badge className="gap-1 bg-green-600 text-white border-0"><Check className="h-3 w-3" /> Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="gap-1"><ShieldX className="h-3 w-3" /> Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const AdminPractices = () => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Practice | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  const fetchPractices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("practices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to load practices", description: error.message });
    }
    setPractices((data ?? []) as Practice[]);
    setLoading(false);
  };

  useEffect(() => { fetchPractices(); }, []);

  const handleApprove = async (practice: Practice) => {
    setProcessing(practice.id);
    const { error } = await supabase.rpc("admin_review_practice", {
      _practice_id: practice.id,
      _approve: true,
    });
    setProcessing(null);
    if (error) {
      toast({ variant: "destructive", title: "Approval failed", description: error.message });
      return;
    }
    toast({ title: "Practice approved", description: `${practice.practice_name} is now approved.` });
    fetchPractices();
  };

  const openReject = (practice: Practice) => {
    setSelected(practice);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast({ variant: "destructive", title: "Please provide a rejection reason" });
      return;
    }
    setProcessing(selected.id);
    const { error } = await supabase.rpc("admin_review_practice", {
      _practice_id: selected.id,
      _approve: false,
      _reason: reason,
    });
    setProcessing(null);
    setShowRejectDialog(false);
    if (error) {
      toast({ variant: "destructive", title: "Rejection failed", description: error.message });
      return;
    }
    toast({ title: "Practice rejected", description: `${selected.practice_name} has been rejected.` });
    setSelected(null);
    setRejectReason("");
    fetchPractices();
  };

  const pending = practices.filter((p) => p.status === "pending_admin_approval");
  const approved = practices.filter((p) => p.status === "approved");
  const rejected = practices.filter((p) => p.status === "rejected");

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderPracticeCard = (practice: Practice) => (
    <Card key={practice.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {practice.practice_name}
            </CardTitle>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {practice.address || "No address"}</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {practice.email}</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {practice.phone || "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(practice.status)}
            <Button size="sm" variant="outline" onClick={() => setSelected(practice)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Button>
            {practice.status === "pending_admin_approval" && (
              <>
                <Button size="sm" onClick={() => handleApprove(practice)} disabled={processing === practice.id}>
                  {processing === practice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openReject(practice)} disabled={processing === practice.id}>
                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide">Practice Number</span>
            {practice.practice_number}
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide">Owner / HPCSA</span>
            {practice.owner_doctor_name} — {practice.owner_hpcsa_number || "—"}
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide">Payout</span>
            {practice.is_payout_verified ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200"><Check className="h-3 w-3" /> Verified</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><Landmark className="h-3 w-3" /> Not verified</Badge>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide">Bank</span>
            {practice.bank_name || "—"}
          </div>
        </div>
        {practice.status === "rejected" && practice.rejection_reason && (
          <div className="mt-3 text-sm text-destructive bg-destructive/10 rounded-md p-2">
            <strong>Rejection reason:</strong> {practice.rejection_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Practice Approvals</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{pending.length} pending</Badge>
          <Badge className="bg-green-600 text-white border-0">{approved.length} approved</Badge>
          <Badge variant="destructive">{rejected.length} rejected</Badge>
        </div>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pending Approval</h3>
          <div>{pending.map(renderPracticeCard)}</div>
        </section>
      )}

      {approved.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Approved</h3>
          <div>{approved.map(renderPracticeCard)}</div>
        </section>
      )}

      {rejected.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Rejected</h3>
          <div>{rejected.map(renderPracticeCard)}</div>
        </section>
      )}

      {practices.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No practices have been registered yet.
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected && !showRejectDialog} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selected?.practice_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Practice Number</Label>
                <p>{selected?.practice_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Status</Label>
                <div className="mt-1">{selected && statusBadge(selected.status)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Owner</Label>
                <p>{selected?.owner_doctor_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">HPCSA Number</Label>
                <p>{selected?.owner_hpcsa_number || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Email</Label>
                <p>{selected?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Phone</Label>
                <p>{selected?.phone || "—"}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Address</Label>
              <p>{selected?.address || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Bank Name</Label>
                <p>{selected?.bank_name || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Account Name</Label>
                <p>{selected?.account_name || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Account Number</Label>
                <p>{selected?.account_number || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Paystack Subaccount</Label>
                <p className="font-mono text-xs">{selected?.paystack_subaccount_code || "—"}</p>
              </div>
            </div>
            {selected?.rejection_reason && (
              <div className="text-destructive bg-destructive/10 rounded-md p-3">
                <strong>Rejection reason:</strong> {selected.rejection_reason}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {selected?.status === "pending_admin_approval" && (
              <>
                <Button variant="outline" onClick={() => openReject(selected)} disabled={processing === selected?.id}>
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selected)} disabled={processing === selected?.id}>
                  {processing === selected?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Approve Practice
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Practice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are rejecting <strong>{selected?.practice_name}</strong>. The owner will see this reason.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing === selected?.id}>
              {processing === selected?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPractices;
