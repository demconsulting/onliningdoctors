import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  name: string;
  subject: string;
  body: string;
  delay_minutes: number;
  is_active: boolean;
  sort_order: number;
}

interface LogRow {
  id: string;
  doctor_profile_id: string;
  email_type: string;
  recipient: string;
  subject: string;
  status: string;
  sent_at: string;
  error: string | null;
}

const empty: Omit<Reminder, "id"> = {
  name: "", subject: "", body: "Hi Dr {{doctor_name}},\n\nYour profile is incomplete.\n\nMissing items:\n{{missing_items}}\n\nPlease log in and complete your onboarding.",
  delay_minutes: 60, is_active: true, sort_order: 0,
};

const formatDelay = (min: number) => {
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.round(min/60)} hour${min>=120?"s":""}`;
  return `${Math.round(min/1440)} day${min>=2880?"s":""}`;
};

const AdminDoctorOnboarding = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<Omit<Reminder, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: rs }, { data: ls }] = await Promise.all([
      supabase.from("doctor_onboarding_reminders").select("*").order("delay_minutes", { ascending: true }),
      supabase.from("doctor_onboarding_email_log").select("*").order("sent_at", { ascending: false }).limit(100),
    ]);
    setReminders((rs ?? []) as Reminder[]);
    setLogs((ls ?? []) as LogRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: Reminder) => { setEditing(r); const { id, ...rest } = r; setForm(rest); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim() || form.delay_minutes <= 0) {
      toast({ variant: "destructive", title: "All fields required and delay must be > 0" });
      return;
    }
    setSaving(true);
    const payload = { ...form, delay_minutes: Number(form.delay_minutes), sort_order: Number(form.sort_order) || 0 };
    const { error } = editing
      ? await supabase.from("doctor_onboarding_reminders").update(payload).eq("id", editing.id)
      : await supabase.from("doctor_onboarding_reminders").insert(payload);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Save failed", description: error.message }); return; }
    toast({ title: editing ? "Reminder updated" : "Reminder created" });
    setOpen(false);
    load();
  };

  const toggle = async (r: Reminder) => {
    const { error } = await supabase.from("doctor_onboarding_reminders").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    else load();
  };

  const remove = async (r: Reminder) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    const { error } = await supabase.from("doctor_onboarding_reminders").delete().eq("id", r.id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else load();
  };

  const runNow = async () => {
    toast({ title: "Triggering reminder processor..." });
    const { error } = await supabase.functions.invoke("process-doctor-onboarding-reminders", { body: {} });
    if (error) toast({ variant: "destructive", title: "Run failed", description: error.message });
    else { toast({ title: "Processor run complete" }); load(); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <Clock className="h-5 w-5 text-primary" /> Doctor Onboarding Automations
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runNow}>Run now</Button>
            <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> New Reminder</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reminders are sent automatically every 15 minutes to unverified doctors with incomplete profiles. Use <code className="text-xs">{`{{doctor_name}}`}</code> and <code className="text-xs">{`{{missing_items}}`}</code> placeholders.
          </p>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders yet.</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <Badge variant="outline">{formatDelay(r.delay_minutes)}</Badge>
                      {!r.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display"><Mail className="h-5 w-5 text-primary" /> Recent Email Activity (last 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Sent</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Recipient</th>
                  <th className="pb-2 pr-4">Subject</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.sent_at).toLocaleString()}</td>
                      <td className="py-2 pr-4"><Badge variant="outline">{l.email_type}</Badge></td>
                      <td className="py-2 pr-4">{l.recipient}</td>
                      <td className="py-2 pr-4 max-w-xs truncate">{l.subject}</td>
                      <td className="py-2"><Badge variant={l.status === "sent" ? "default" : "destructive"}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Reminder" : "New Reminder"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Body</Label>
              <Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Placeholders: <code>{`{{doctor_name}}`}</code> <code>{`{{missing_items}}`}</code></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Delay (minutes)</Label><Input type="number" min={1} value={form.delay_minutes} onChange={(e) => setForm({ ...form, delay_minutes: Number(e.target.value) })} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDoctorOnboarding;
