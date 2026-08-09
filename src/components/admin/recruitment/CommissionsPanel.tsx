import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

const money = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(v || 0);
const STATUSES = ["pending", "approved", "paid"];

interface Props { prospects: any[]; }

const CommissionsPanel = ({ prospects }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ prospect_id: "", amount: "", status: "pending", payment_date: "", payment_reference: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("recruitment_commissions" as any).select("*").order("created_at", { ascending: false });
    setRows((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nameOf = (id: string) => {
    const p = prospects.find((x) => x.id === id);
    return p ? `${p.title || ""} ${p.first_name} ${p.last_name}`.trim() : "—";
  };

  const save = async () => {
    if (!form.prospect_id || !form.amount) {
      toast({ title: "Prospect and amount are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const prospect = prospects.find((p) => p.id === form.prospect_id);
    const { error } = await supabase.from("recruitment_commissions" as any).insert({
      prospect_id: form.prospect_id,
      doctor_profile_id: prospect?.linked_doctor_profile_id || null,
      business_developer: prospect?.business_developer || prospect?.assigned_recruiter || null,
      amount: Number(form.amount),
      status: form.status,
      payment_date: form.payment_date || null,
      payment_reference: form.payment_reference || null,
    });
    setSaving(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Commission recorded" });
      setOpen(false);
      setForm({ prospect_id: "", amount: "", status: "pending", payment_date: "", payment_reference: "" });
      load();
    }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("recruitment_commissions" as any)
      .update({ status, payment_date: status === "paid" ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Recruitment Commissions</CardTitle>
          <CardDescription>Track commission owed and paid per recruited doctor.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add commission</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No commissions recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
                <TableHead>Payment date</TableHead><TableHead>Reference</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{nameOf(r.prospect_id)}</TableCell>
                  <TableCell>{money(Number(r.amount))}</TableCell>
                  <TableCell><Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell>{r.payment_date ? format(new Date(r.payment_date), "PP") : "—"}</TableCell>
                  <TableCell>{r.payment_reference || "—"}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add commission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Prospect</Label>
              <Select value={form.prospect_id} onValueChange={(v) => setForm({ ...form, prospect_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select prospect" /></SelectTrigger>
                <SelectContent>
                  {prospects.filter((p) => !String(p.id).startsWith("doctor:")).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (ZAR)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment reference</Label>
              <Input value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CommissionsPanel;
