import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail, Send, RefreshCw, AlertTriangle, CheckCircle2, FileWarning, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LogRow = {
  id: string;
  doctor_profile_id: string;
  doctor_name: string | null;
  email_type: string;
  reminder_id: string | null;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  resend_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
};

type DoctorRow = {
  profile_id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_verified: boolean;
  is_suspended: boolean;
  id_document_path: string | null;
  license_document_path: string | null;
  avatar_url: string | null;
  consultation_fee: number | null;
  has_availability: boolean;
  is_founding_doctor: boolean;
  founding_status: string;
  last_reminder_at: string | null;
  reminder_count: number;
};

type Reminder = { id: string; name: string; subject: string; body: string };

const FILTERS = [
  { key: "all", label: "All onboarding" },
  { key: "missing_hpcsa", label: "Missing HPCSA" },
  { key: "missing_id", label: "Missing ID" },
  { key: "missing_photo", label: "Missing Profile Photo" },
  { key: "incomplete", label: "Incomplete Profile" },
  { key: "pending_verification", label: "Pending Verification" },
  { key: "founding_applicant", label: "Founding Doctor Applicant" },
];

const completion = (d: DoctorRow) => {
  const checks = [!!d.id_document_path, !!d.license_document_path, !!d.avatar_url, !!d.consultation_fee && d.consultation_fee > 0, d.has_availability];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    sent: "bg-blue-500/15 text-blue-700",
    delivered: "bg-green-500/15 text-green-700",
    opened: "bg-emerald-500/15 text-emerald-700",
    failed: "bg-red-500/15 text-red-700",
    pending: "bg-amber-500/15 text-amber-700",
  };
  return <Badge className={map[s] || "bg-muted"}>{s}</Badge>;
};

const AdminDoctorReminderCenter = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filter, setFilter] = useState("all");
  const [sendDialog, setSendDialog] = useState<DoctorRow | null>(null);
  const [sendForm, setSendForm] = useState({ reminderId: "__custom", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [testForm, setTestForm] = useState({ to: "", reminderId: "" });

  const load = async () => {
    setLoading(true);
    const [docsRes, logsRes, remindersRes, availRes] = await Promise.all([
      supabase.from("doctors").select("profile_id, created_at, is_verified, is_suspended, id_document_path, license_document_path, consultation_fee, is_founding_doctor, founding_status, profile:profiles!doctors_profile_id_fkey(full_name, avatar_url)").order("created_at", { ascending: false }).limit(500),
      supabase.from("doctor_onboarding_email_log").select("*").order("sent_at", { ascending: false }).limit(500),
      supabase.from("doctor_onboarding_reminders").select("id, name, subject, body").order("delay_minutes"),
      supabase.from("doctor_availability").select("doctor_id"),
    ]);

    const availSet = new Set((availRes.data || []).map((r: any) => r.doctor_id));
    const logRows = (logsRes.data || []) as LogRow[];
    const lastByDoctor = new Map<string, { last: string; count: number }>();
    for (const l of logRows) {
      const k = l.doctor_profile_id;
      const prev = lastByDoctor.get(k);
      if (!prev) lastByDoctor.set(k, { last: l.sent_at, count: 1 });
      else lastByDoctor.set(k, { last: prev.last, count: prev.count + 1 });
    }

    // We need emails — pull from auth via admin RPC (use existing admin-users edge function if available)
    let emailMap: Record<string, string> = {};
    try {
      const { data: ud } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
      if (ud?.users) emailMap = Object.fromEntries(ud.users.map((u: any) => [u.id, u.email]));
    } catch { /* fallback: leave empty */ }

    const rows: DoctorRow[] = (docsRes.data || []).map((d: any) => ({
      profile_id: d.profile_id,
      full_name: d.profile?.full_name || "Unnamed",
      email: emailMap[d.profile_id] || "",
      created_at: d.created_at,
      is_verified: d.is_verified,
      is_suspended: d.is_suspended,
      id_document_path: d.id_document_path,
      license_document_path: d.license_document_path,
      avatar_url: d.profile?.avatar_url || null,
      consultation_fee: d.consultation_fee,
      has_availability: availSet.has(d.profile_id),
      is_founding_doctor: d.is_founding_doctor,
      founding_status: d.founding_status,
      last_reminder_at: lastByDoctor.get(d.profile_id)?.last || null,
      reminder_count: lastByDoctor.get(d.profile_id)?.count || 0,
    }));

    setDoctors(rows);
    setLogs(logRows);
    setReminders((remindersRes.data || []) as Reminder[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const sent = logs.filter((l) => l.status === "sent" || l.status === "delivered" || l.status === "opened").length;
    const delivered = logs.filter((l) => !!l.delivered_at).length;
    const opened = logs.filter((l) => !!l.opened_at).length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const onboarding = doctors.filter((d) => !d.is_verified && !d.is_suspended);
    return {
      sent, delivered, opened, failed,
      awaitingDocs: onboarding.filter((d) => !d.id_document_path || !d.license_document_path).length,
      completed: doctors.filter((d) => completion(d) === 100).length,
      awaitingHpcsa: onboarding.filter((d) => !d.license_document_path).length,
      awaitingId: onboarding.filter((d) => !d.id_document_path).length,
    };
  }, [logs, doctors]);

  const filtered = useMemo(() => {
    const onboarding = doctors.filter((d) => !d.is_suspended && (!d.is_verified || filter === "founding_applicant"));
    switch (filter) {
      case "missing_hpcsa": return onboarding.filter((d) => !d.license_document_path);
      case "missing_id": return onboarding.filter((d) => !d.id_document_path);
      case "missing_photo": return onboarding.filter((d) => !d.avatar_url);
      case "incomplete": return onboarding.filter((d) => completion(d) < 100);
      case "pending_verification": return onboarding.filter((d) => completion(d) === 100 && !d.is_verified);
      case "founding_applicant": return doctors.filter((d) => d.founding_status === "pending");
      default: return onboarding;
    }
  }, [doctors, filter]);

  const openSend = (d: DoctorRow) => {
    setSendForm({ reminderId: "__custom", subject: "", message: "" });
    setSendDialog(d);
  };

  const pickReminder = (id: string) => {
    if (id === "__custom") { setSendForm({ reminderId: id, subject: "", message: "" }); return; }
    const r = reminders.find((r) => r.id === id);
    if (r) setSendForm({ reminderId: id, subject: r.subject, message: r.body });
  };

  const send = async () => {
    if (!sendDialog) return;
    if (!sendForm.subject.trim() || !sendForm.message.trim()) {
      toast({ variant: "destructive", title: "Subject and message required" }); return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-doctor-reminder", {
      body: {
        doctorProfileId: sendDialog.profile_id,
        reminderId: sendForm.reminderId === "__custom" ? undefined : sendForm.reminderId,
        reminderType: sendForm.reminderId === "__custom" ? "custom" : "manual_reminder",
        subject: sendForm.subject,
        message: sendForm.message,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Send failed", description: error?.message || JSON.stringify((data as any)?.error) });
    } else {
      toast({ title: "Reminder sent", description: (data as any)?.recipient });
      setSendDialog(null);
      load();
    }
  };

  const sendTest = async () => {
    if (!testForm.to.trim() || !testForm.reminderId) {
      toast({ variant: "destructive", title: "Recipient and template required" }); return;
    }
    const r = reminders.find((r) => r.id === testForm.reminderId);
    if (!r) return;
    const { data, error } = await supabase.functions.invoke("send-doctor-reminder", {
      body: { testRecipient: testForm.to, subject: `[TEST] ${r.subject}`, message: r.body, reminderType: "test" },
    });
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Test failed", description: error?.message || JSON.stringify((data as any)?.error) });
    } else {
      toast({ title: "Test email sent", description: testForm.to });
      setTestDialog(false);
    }
  };

  const resend = async (l: LogRow) => {
    const { data, error } = await supabase.functions.invoke("send-doctor-reminder", {
      body: { doctorProfileId: l.doctor_profile_id, reminderId: l.reminder_id || undefined, subject: l.subject, message: "Following up on a previous message. Please log in to complete your profile.", reminderType: "resend" },
    });
    if (error || (data as any)?.error) toast({ variant: "destructive", title: "Resend failed" });
    else { toast({ title: "Resent" }); load(); }
  };

  const runAutomations = async () => {
    toast({ title: "Triggering automated reminders…" });
    const { error } = await supabase.functions.invoke("process-doctor-onboarding-reminders", { body: {} });
    if (error) toast({ variant: "destructive", title: "Run failed", description: error.message });
    else { toast({ title: "Automation run complete" }); load(); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <Card><CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Doctor Reminder Center</h2>
          <p className="text-sm text-muted-foreground">Audit reminder emails, monitor profile completion and trigger sends.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTestDialog(true)}><Mail className="mr-1 h-4 w-4" />Send Test</Button>
          <Button variant="outline" size="sm" onClick={runAutomations}><RefreshCw className="mr-1 h-4 w-4" />Run Automations</Button>
          <Button size="sm" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Send} label="Total sent" value={stats.sent} color="text-blue-500" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} color="text-green-500" />
        <StatCard icon={Eye} label="Opened" value={stats.opened} color="text-emerald-500" />
        <StatCard icon={AlertTriangle} label="Failed" value={stats.failed} color="text-red-500" />
        <StatCard icon={FileWarning} label="Awaiting documents" value={stats.awaitingDocs} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label="Completed profiles" value={stats.completed} color="text-teal-500" />
        <StatCard icon={FileWarning} label="Awaiting HPCSA" value={stats.awaitingHpcsa} color="text-orange-500" />
        <StatCard icon={FileWarning} label="Awaiting ID" value={stats.awaitingId} color="text-orange-500" />
      </div>

      <Tabs defaultValue="action">
        <TabsList>
          <TabsTrigger value="action">Doctors Requiring Action</TabsTrigger>
          <TabsTrigger value="log">Reminder Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="action" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>{f.label}</Button>
            ))}
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Doctor</th><th className="p-3">Registered</th>
                <th className="p-3">HPCSA</th><th className="p-3">ID</th><th className="p-3">Photo</th>
                <th className="p-3">Profile %</th><th className="p-3">Last Reminder</th>
                <th className="p-3">Count</th><th className="p-3"></th>
              </tr></thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No doctors match this filter.</td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.profile_id}>
                    <td className="p-3">
                      <div className="font-medium">{d.full_name}</div>
                      <div className="text-xs text-muted-foreground">{d.email || "—"}</div>
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{d.license_document_path ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Badge variant="destructive">Missing</Badge>}</td>
                    <td className="p-3">{d.id_document_path ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Badge variant="destructive">Missing</Badge>}</td>
                    <td className="p-3">{d.avatar_url ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Badge variant="secondary">Missing</Badge>}</td>
                    <td className="p-3"><Badge variant={completion(d) === 100 ? "default" : "outline"}>{completion(d)}%</Badge></td>
                    <td className="p-3 text-xs whitespace-nowrap">{d.last_reminder_at ? new Date(d.last_reminder_at).toLocaleString() : "—"}</td>
                    <td className="p-3 text-center">{d.reminder_count}</td>
                    <td className="p-3"><Button size="sm" variant="outline" onClick={() => openSend(d)}><Send className="mr-1 h-3 w-3" />Send</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="log">
          <Card><CardHeader>
            <CardTitle className="text-base font-display">Reminder History</CardTitle>
            <CardDescription>Permanent audit of every reminder sent (last 500).</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Sent</th><th className="p-3">Doctor</th><th className="p-3">Type</th>
                <th className="p-3">Subject</th><th className="p-3">Status</th>
                <th className="p-3">Delivered</th><th className="p-3">Opened</th><th className="p-3"></th>
              </tr></thead>
              <tbody className="divide-y">
                {logs.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No reminders sent yet.</td></tr>
                ) : logs.map((l) => (
                  <tr key={l.id}>
                    <td className="p-3 text-xs whitespace-nowrap">{new Date(l.sent_at).toLocaleString()}</td>
                    <td className="p-3"><div>{l.doctor_name || "—"}</div><div className="text-xs text-muted-foreground">{l.recipient}</div></td>
                    <td className="p-3"><Badge variant="outline">{l.email_type}</Badge></td>
                    <td className="p-3 max-w-xs truncate" title={l.subject}>{l.subject}</td>
                    <td className="p-3">{statusBadge(l.status)}</td>
                    <td className="p-3 text-xs">{l.delivered_at ? new Date(l.delivered_at).toLocaleString() : "—"}</td>
                    <td className="p-3 text-xs">{l.opened_at ? new Date(l.opened_at).toLocaleString() : "—"}</td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={() => resend(l)}>Resend</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Send dialog */}
      <Dialog open={!!sendDialog} onOpenChange={(o) => !o && setSendDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Reminder to {sendDialog?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Template</Label>
              <Select value={sendForm.reminderId} onValueChange={pickReminder}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom">Custom message</SelectItem>
                  {reminders.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Subject</Label><Input value={sendForm.subject} onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={8} value={sendForm.message} onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Placeholders: <code>{`{{doctor_name}}`}</code> <code>{`{{missing_items}}`}</code></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(null)}>Cancel</Button>
            <Button onClick={send} disabled={sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Now"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Test Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Recipient</Label><Input type="email" value={testForm.to} onChange={(e) => setTestForm({ ...testForm, to: e.target.value })} placeholder="you@example.com" /></div>
            <div>
              <Label>Template</Label>
              <Select value={testForm.reminderId} onValueChange={(v) => setTestForm({ ...testForm, reminderId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>{reminders.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>Cancel</Button>
            <Button onClick={sendTest}>Send Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDoctorReminderCenter;
