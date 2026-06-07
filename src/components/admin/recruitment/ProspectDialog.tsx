import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, MessageCircle, Phone, Calendar, StickyNote, Send, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PIPELINE_STAGES, TEMPLATES, stageLabel, stripHtml } from "./templates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospect: any | null;
  onSaved: () => void;
}

const EMPTY = {
  first_name: "", last_name: "", title: "Dr.", specialty: "", hpcsa_number: "",
  practice_name: "", province: "", city: "", mobile_number: "", whatsapp_number: "",
  email: "", referral_source: "", notes: "", stage: "lead",
  next_follow_up_date: "", assigned_recruiter: "",
};

const ProspectDialog = ({ open, onOpenChange, prospect, onSaved }: Props) => {
  const { toast } = useToast();
  const isEdit = !!prospect?.id;
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");

  const [comms, setComms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Comm composer
  const [tplKey, setTplKey] = useState<string>("introduction");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Quick note / call log
  const [noteText, setNoteText] = useState("");
  const [noteChannel, setNoteChannel] = useState<"note" | "call" | "meeting">("note");
  const [noteOutcome, setNoteOutcome] = useState("");

  // Task form
  const [taskForm, setTaskForm] = useState({ task_type: "call", title: "", notes: "", due_date: "", priority: "normal" });

  useEffect(() => {
    if (open) {
      setForm(prospect ? { ...EMPTY, ...prospect, next_follow_up_date: prospect.next_follow_up_date || "" } : EMPTY);
      setTab("details");
      if (prospect?.id) loadHistory(prospect.id);
    }
  }, [open, prospect]);

  useEffect(() => {
    const t = TEMPLATES.find((t) => t.key === tplKey);
    if (t) {
      setEmailSubject(t.emailSubject);
      setEmailBody(t.emailBody);
      setWhatsappMsg(t.whatsapp.replace(/\{\{name\}\}/g, form.first_name || "Doctor"));
    }
  }, [tplKey, form.first_name]);

  const loadHistory = async (id: string) => {
    setLoadingHistory(true);
    const [c, t] = await Promise.all([
      supabase.from("recruitment_communications" as any).select("*").eq("prospect_id", id).order("occurred_at", { ascending: false }),
      supabase.from("recruitment_tasks" as any).select("*").eq("prospect_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    setComms((c.data as any[]) || []);
    setTasks((t.data as any[]) || []);
    setLoadingHistory(false);
  };

  const save = async () => {
    if (!form.first_name || !form.last_name) {
      toast({ title: "Name required", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload: any = { ...form };
    if (!payload.next_follow_up_date) payload.next_follow_up_date = null;
    if (!payload.assigned_recruiter) payload.assigned_recruiter = null;
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    delete payload.linked_doctor_profile_id; delete payload.referrer_doctor_id; delete payload.created_by;

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("recruitment_prospects" as any).update(payload).eq("id", prospect.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      ({ error } = await supabase.from("recruitment_prospects" as any).insert(payload));
    }
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: isEdit ? "Prospect updated" : "Prospect created" });
    onSaved();
    if (!isEdit) onOpenChange(false);
  };

  const sendEmail = async () => {
    if (!form.email) { toast({ title: "No email on file", variant: "destructive" }); return; }
    if (!emailSubject || !emailBody) { toast({ title: "Subject and message required", variant: "destructive" }); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-recruitment-email", {
      body: {
        recipients: [{ email: form.email, name: form.first_name, prospectId: prospect?.id }],
        subject: emailSubject,
        html: emailBody,
        templateKey: tplKey,
      },
    });
    setSending(false);
    if (error) { toast({ title: "Email failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Email sent" });
    if (prospect?.id) loadHistory(prospect.id);
  };

  const openWhatsApp = async () => {
    const num = (form.whatsapp_number || form.mobile_number || "").replace(/[^0-9]/g, "");
    if (!num) { toast({ title: "No WhatsApp/mobile number", variant: "destructive" }); return; }
    const url = `https://wa.me/${num}?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    if (prospect?.id) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("recruitment_communications" as any).insert({
        prospect_id: prospect.id, channel: "whatsapp", direction: "outbound",
        body: whatsappMsg, template_key: tplKey, delivery_status: "opened",
        outcome: "WhatsApp web opened", created_by: user?.id,
      });
      loadHistory(prospect.id);
    }
  };

  const logNote = async () => {
    if (!noteText.trim()) return;
    if (!prospect?.id) { toast({ title: "Save the prospect first", variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("recruitment_communications" as any).insert({
      prospect_id: prospect.id, channel: noteChannel, direction: "outbound",
      body: noteText, outcome: noteOutcome || null, created_by: user?.id,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setNoteText(""); setNoteOutcome("");
    loadHistory(prospect.id);
  };

  const addTask = async () => {
    if (!taskForm.title || !prospect?.id) { toast({ title: "Title required", variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = { ...taskForm, prospect_id: prospect.id, created_by: user?.id, assigned_to: user?.id };
    if (!payload.due_date) delete payload.due_date;
    const { error } = await supabase.from("recruitment_tasks" as any).insert(payload);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setTaskForm({ task_type: "call", title: "", notes: "", due_date: "", priority: "normal" });
    loadHistory(prospect.id);
  };

  const toggleTask = async (t: any) => {
    const status = t.status === "done" ? "pending" : "done";
    await supabase.from("recruitment_tasks" as any).update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    loadHistory(prospect.id);
  };

  const deleteTask = async (id: string) => {
    await supabase.from("recruitment_tasks" as any).delete().eq("id", id);
    loadHistory(prospect.id);
  };

  const channelIcon = (c: string) =>
    c === "email" ? <Mail className="h-4 w-4" /> :
    c === "whatsapp" ? <MessageCircle className="h-4 w-4 text-emerald-500" /> :
    c === "call" ? <Phone className="h-4 w-4" /> :
    c === "meeting" ? <Calendar className="h-4 w-4" /> :
    <StickyNote className="h-4 w-4" />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `${form.title || ""} ${form.first_name} ${form.last_name}`.trim() : "New Prospect"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comms" disabled={!isEdit}>Communicate</TabsTrigger>
            <TabsTrigger value="history" disabled={!isEdit}>History ({comms.length})</TabsTrigger>
            <TabsTrigger value="tasks" disabled={!isEdit}>Tasks ({tasks.filter(t => t.status === "pending").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Specialty"><Input value={form.specialty || ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Field>
              <Field label="First name *"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
              <Field label="Last name *"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
              <Field label="HPCSA number"><Input value={form.hpcsa_number || ""} onChange={(e) => setForm({ ...form, hpcsa_number: e.target.value })} /></Field>
              <Field label="Practice name"><Input value={form.practice_name || ""} onChange={(e) => setForm({ ...form, practice_name: e.target.value })} /></Field>
              <Field label="Province"><Input value={form.province || ""} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
              <Field label="City"><Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Mobile number"><Input value={form.mobile_number || ""} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} /></Field>
              <Field label="WhatsApp number"><Input value={form.whatsapp_number || ""} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="e.g. 27821234567" /></Field>
              <Field label="Referral source"><Input value={form.referral_source || ""} onChange={(e) => setForm({ ...form, referral_source: e.target.value })} /></Field>
              <Field label="Stage">
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Next follow-up"><Input type="date" value={form.next_follow_up_date || ""} onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={4} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </TabsContent>

          <TabsContent value="comms" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={tplKey} onValueChange={setTplKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" /> Email</div>
              <Input placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              <Textarea rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="HTML body. Use {{name}} for first name." />
              <Button size="sm" onClick={sendEmail} disabled={sending || !form.email}>
                {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send Email
              </Button>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp</div>
              <Textarea rows={4} value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} />
              <Button size="sm" variant="outline" onClick={openWhatsApp} className="border-emerald-500 text-emerald-600">
                <MessageCircle className="h-4 w-4 mr-1" /> Open WhatsApp
              </Button>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4" /> Log call / meeting / note</div>
              <div className="flex gap-2">
                <Select value={noteChannel} onValueChange={(v: any) => setNoteChannel(v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Phone call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Outcome (optional)" value={noteOutcome} onChange={(e) => setNoteOutcome(e.target.value)} />
              </div>
              <Textarea rows={3} placeholder="Notes…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={logNote}>Log</Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            {loadingHistory ? <Loader2 className="h-5 w-5 animate-spin" /> : comms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No communications yet.</p>
            ) : (
              <div className="space-y-3">
                {comms.map(c => (
                  <div key={c.id} className="rounded border p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        {channelIcon(c.channel)}
                        <span className="capitalize">{c.channel}</span>
                        {c.delivery_status && <Badge variant="outline" className="text-xs">{c.delivery_status}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.occurred_at), "PPp")}</span>
                    </div>
                    {c.subject && <p className="text-sm font-semibold mt-1">{c.subject}</p>}
                    {c.body && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{stripHtml(c.body)}</p>}
                    {c.outcome && <p className="text-xs text-foreground/80 mt-1"><span className="font-medium">Outcome:</span> {c.outcome}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="pt-4 space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New task</div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={taskForm.task_type} onValueChange={(v) => setTaskForm({ ...taskForm, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Follow-up Call</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp Reminder</SelectItem>
                    <SelectItem value="email">Email Reminder</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low","normal","high","urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="col-span-2" placeholder="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                <Input type="datetime-local" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                <Input placeholder="Notes" value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} />
              </div>
              <Button size="sm" onClick={addTask}>Add task</Button>
            </div>

            {tasks.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No tasks.</p> : (
              <div className="space-y-2">
                {tasks.map(t => {
                  const overdue = t.status === "pending" && t.due_date && new Date(t.due_date) < new Date();
                  return (
                    <div key={t.id} className={`flex items-start gap-2 rounded border p-3 ${overdue ? "border-rose-500/50 bg-rose-500/5" : ""}`}>
                      <input type="checkbox" checked={t.status === "done"} onChange={() => toggleTask(t)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                          <Badge variant="outline" className="text-xs capitalize">{t.task_type}</Badge>
                          <Badge variant={t.priority === "urgent" || t.priority === "high" ? "destructive" : "secondary"} className="text-xs">{t.priority}</Badge>
                          {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                        </div>
                        {t.due_date && <p className="text-xs text-muted-foreground">Due {format(new Date(t.due_date), "PPp")}</p>}
                        {t.notes && <p className="text-sm mt-1">{t.notes}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteTask(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {isEdit && <Badge variant="outline">Stage: {stageLabel(form.stage)}</Badge>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {tab === "details" && (
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
);

export default ProspectDialog;
