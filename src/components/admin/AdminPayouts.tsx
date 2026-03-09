import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "approved") return "default";
  if (s === "rejected") return "destructive";
  return "secondary";
};

const statusIcon = (s: string) => {
  if (s === "approved") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (s === "rejected") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

const AdminPayouts = () => {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setPayouts(data);
      const ids = [...new Set(data.map((p) => p.doctor_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p) => (map[p.id] = p.full_name || "Unknown"));
          setDoctors(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return payouts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (doctors[p.doctor_id] || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [payouts, statusFilter, search, doctors]);

  const pendingTotal = useMemo(
    () => payouts.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0),
    [payouts]
  );

  const handleAction = async (action: "approved" | "rejected") => {
    if (!selectedPayout) return;
    setProcessing(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("payout_requests")
      .update({
        status: action,
        admin_notes: adminNotes.trim() || null,
        processed_by: user?.id || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", selectedPayout.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to update", description: error.message });
    } else {
      toast({ title: `Payout ${action}`, description: `${doctors[selectedPayout.doctor_id] || "Doctor"}'s payout has been ${action}.` });
      setSelectedPayout(null);
      setAdminNotes("");
      load();
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold text-foreground">{payouts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Amount</p>
            <p className="text-2xl font-bold text-foreground">
              {pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <p className="text-2xl font-bold text-foreground">
              {payouts.filter((p) => p.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Payout Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by doctor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No payout requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(p.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {doctors[p.doctor_id] || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm">{p.currency}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(p.status)} className="capitalize text-xs gap-1">
                          {statusIcon(p.status)} {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.processed_at ? format(new Date(p.processed_at), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayout(p);
                              setAdminNotes(p.admin_notes || "");
                            }}
                          >
                            Review
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayout(p);
                              setAdminNotes(p.admin_notes || "");
                            }}
                          >
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={(open) => { if (!open) { setSelectedPayout(null); setAdminNotes(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPayout?.status === "pending" ? "Review Payout Request" : "Payout Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Doctor</p>
                  <p className="font-medium">{doctors[selectedPayout.doctor_id] || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{selectedPayout.currency} {Number(selectedPayout.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requested</p>
                  <p className="font-medium">{format(new Date(selectedPayout.created_at), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selectedPayout.status)} className="capitalize text-xs gap-1 mt-0.5">
                    {statusIcon(selectedPayout.status)} {selectedPayout.status}
                  </Badge>
                </div>
                {selectedPayout.payment_ids?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Linked Payments</p>
                    <p className="font-medium">{selectedPayout.payment_ids.length} payment(s)</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this payout..."
                  rows={3}
                  disabled={selectedPayout.status !== "pending"}
                />
              </div>
            </div>
          )}
          {selectedPayout?.status === "pending" && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={() => handleAction("rejected")}
                disabled={processing}
                className="gap-1.5"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </Button>
              <Button
                onClick={() => handleAction("approved")}
                disabled={processing}
                className="gap-1.5"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
