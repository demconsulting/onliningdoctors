import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Crown, Mail, MessageCircle, Search, RefreshCw, BarChart3, Calendar, Network } from "lucide-react";
import { format } from "date-fns";
import { PIPELINE_STAGES, TEMPLATES, stageLabel } from "./templates";
import PipelineBoard from "./PipelineBoard";
import ProspectDialog from "./ProspectDialog";
import { useFoundingSlots } from "@/hooks/useFoundingSlots";
import FunnelAnalytics from "./FunnelAnalytics";
import ActivationPipeline from "./ActivationPipeline";
import FoundingCohortDashboard from "./FoundingCohortDashboard";
import DoctorSuccessTable from "./DoctorSuccessTable";
import FirstConsultationTracker from "./FirstConsultationTracker";
import GeographicDashboard from "./GeographicDashboard";
import SourceTrackingDashboard from "./SourceTrackingDashboard";
import EarlyAccessInterestList from "./EarlyAccessInterestList";

const AdminRecruitmentCRM = () => {
  const { toast } = useToast();
  const { slots } = useFoundingSlots();
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTpl, setBulkTpl] = useState("introduction");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [sendingBulk, setSendingBulk] = useState(false);

  const [refOpen, setRefOpen] = useState(false);
  const [refForm, setRefForm] = useState<any>({ referrer_name: "", prospect_name: "", status: "new", notes: "" });

  const [funnel, setFunnel] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [p, t, r, f] = await Promise.all([
      supabase.from("recruitment_prospects" as any).select("*").order("updated_at", { ascending: false }),
      supabase.from("recruitment_tasks" as any).select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("recruitment_referrals" as any).select("*").order("referral_date", { ascending: false }),
      supabase.rpc("admin_recruitment_funnel" as any),
    ]);
    setProspects((p.data as any[]) || []);
    setTasks((t.data as any[]) || []);
    setReferrals((r.data as any[]) || []);
    const fmap: Record<string, number> = {};
    ((f.data as any[]) || []).forEach((row: any) => { fmap[row.stage] = Number(row.current_count); });
    setFunnel(fmap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tpl = TEMPLATES.find(t => t.key === bulkTpl);
    if (tpl) { setBulkSubject(tpl.emailSubject); setBulkBody(tpl.emailBody); }
  }, [bulkTpl]);

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (stageFilter !== "all" && p.stage !== stageFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.first_name} ${p.last_name} ${p.specialty || ""} ${p.email || ""} ${p.hpcsa_number || ""} ${p.city || ""} ${p.province || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [prospects, search, stageFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => c[s.key] = 0);
    prospects.forEach(p => { c[p.stage] = (c[p.stage] || 0) + 1; });
    return c;
  }, [prospects]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setDialogOpen(true); };

  const handleStageChange = async (id: string, stage: string) => {
    const prev = prospects;
    setProspects(prev.map(p => p.id === id ? { ...p, stage } : p));
    const { error } = await supabase.from("recruitment_prospects" as any).update({ stage }).eq("id", id);
    if (error) { setProspects(prev); toast({ title: "Failed", description: error.message, variant: "destructive" }); }
  };

  const deleteProspect = async (id: string) => {
    if (!confirm("Delete this prospect and all related communications/tasks?")) return;
    const { error } = await supabase.from("recruitment_prospects" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    load();
  };

  const toggleBulk = (id: string) => {
    setBulkSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const sendBulk = async () => {
    const recipients = prospects
      .filter(p => bulkSelected.has(p.id) && p.email)
      .map(p => ({ email: p.email, name: p.first_name, prospectId: p.id }));
    if (!recipients.length) { toast({ title: "No recipients with email selected", variant: "destructive" }); return; }
    setSendingBulk(true);
    const { error } = await supabase.functions.invoke("send-recruitment-email", {
      body: { recipients, subject: bulkSubject, html: bulkBody, templateKey: bulkTpl },
    });
    setSendingBulk(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Queued ${recipients.length} emails` });
    setBulkOpen(false); setBulkSelected(new Set());
  };

  const saveReferral = async () => {
    if (!refForm.referrer_name || !refForm.prospect_name) { toast({ title: "Both names required", variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("recruitment_referrals" as any).insert({ ...refForm, created_by: user?.id });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setRefOpen(false); setRefForm({ referrer_name: "", prospect_name: "", status: "new", notes: "" });
    load();
  };

  // Reports
  const reports = useMemo(() => {
    const monthAgo = new Date(Date.now() - 30 * 86400000);
    const addedThisMonth = prospects.filter(p => new Date(p.created_at) >= monthAgo).length;
    const registered = counts.registered + counts.pending_verification + counts.verified + counts.founding_doctor;
    const verified = counts.verified + counts.founding_doctor;
    const leads = prospects.length;
    const leadToReg = leads > 0 ? Math.round((registered / leads) * 100) : 0;
    const regToVer = registered > 0 ? Math.round((verified / registered) * 100) : 0;
    const verToFounding = verified > 0 ? Math.round((counts.founding_doctor / verified) * 100) : 0;
    const bucket = (key: "referral_source" | "province" | "specialty") => {
      const m: Record<string, number> = {};
      prospects.forEach(p => { const v = (p[key] || "Unknown").trim() || "Unknown"; m[v] = (m[v] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    return { addedThisMonth, leadToReg, regToVer, verToFounding, topReferral: bucket("referral_source"), topProvinces: bucket("province"), topSpecialties: bucket("specialty") };
  }, [prospects, counts]);

  const overdueTasks = tasks.filter(t => t.status === "pending" && t.due_date && new Date(t.due_date) < new Date());

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const STAT_CARDS = [
    { key: "lead", label: "Total Prospects", value: prospects.length, icon: Users },
    { key: "contacted", label: "Contacted", value: counts.contacted },
    { key: "interested", label: "Interested", value: counts.interested },
    { key: "meeting_scheduled", label: "Demo Scheduled", value: counts.meeting_scheduled + counts.demo_completed },
    { key: "registered", label: "Registered", value: counts.registered },
    { key: "pending_verification", label: "Pending Verification", value: counts.pending_verification },
    { key: "verified", label: "Verified", value: counts.verified },
    { key: "founding_doctor", label: "Founding Doctors", value: counts.founding_doctor, icon: Crown },
    { key: "declined", label: "Declined", value: counts.declined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Doctor Recruitment CRM</h2>
          <p className="text-sm text-muted-foreground">Manage prospects, communications, follow-ups, and founding-doctor pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" variant="outline" onClick={() => { setBulkSelected(new Set()); setBulkOpen(true); }}><Mail className="h-4 w-4 mr-1" /> Bulk Email</Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New prospect</Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="activation">Activation</TabsTrigger>
          <TabsTrigger value="founding">Founding Cohort</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="first-consult">First Consult</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="early-access">Early Access</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="prospects">Prospects ({prospects.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks {overdueTasks.length > 0 && <Badge variant="destructive" className="ml-1.5">{overdueTasks.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel"><FunnelAnalytics /></TabsContent>
        <TabsContent value="activation"><ActivationPipeline /></TabsContent>
        <TabsContent value="founding"><FoundingCohortDashboard /></TabsContent>
        <TabsContent value="success"><DoctorSuccessTable /></TabsContent>
        <TabsContent value="first-consult"><FirstConsultationTracker /></TabsContent>
        <TabsContent value="geography"><GeographicDashboard /></TabsContent>
        <TabsContent value="sources"><SourceTrackingDashboard /></TabsContent>
        <TabsContent value="early-access"><EarlyAccessInterestList /></TabsContent>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {STAT_CARDS.map(c => (
              <Card key={c.label}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value}</p>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-500" /> Founding Doctor Tracker</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {slots && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span>{slots.approved_count} of {slots.max_slots} positions filled</span>
                    <span className="text-muted-foreground">{slots.remaining} remaining</span>
                  </div>
                  <Progress value={(slots.approved_count / slots.max_slots) * 100} />
                  {slots.remaining === 0 && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">Founding Cohort Complete</Badge>}
                </>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                <Stat label="Applied" value={prospects.filter(p => p.stage === "invited" || p.stage === "registered").length} />
                <Stat label="Pending Verification" value={counts.pending_verification} />
                <Stat label="Verified" value={counts.verified} />
                <Stat label="Approved Founding" value={counts.founding_doctor} />
              </div>
            </CardContent>
          </Card>

          {overdueTasks.length > 0 && (
            <Card><CardHeader><CardTitle className="text-destructive">Overdue tasks ({overdueTasks.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueTasks.slice(0, 10).map(t => {
                    const p = prospects.find(pr => pr.id === t.prospect_id);
                    return (
                      <div key={t.id} className="flex justify-between items-center rounded border border-destructive/30 bg-destructive/5 p-2 text-sm">
                        <div>
                          <span className="font-medium">{t.title}</span>
                          {p && <span className="text-muted-foreground"> — {p.first_name} {p.last_name}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(t.due_date), "PP")}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline">
          <PipelineBoard prospects={prospects} onStageChange={handleStageChange} onOpen={openEdit} />
        </TabsContent>

        {/* PROSPECTS */}
        <TabsContent value="prospects" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by name, email, HPCSA, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No prospects.</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(p)}>
                      <TableCell className="font-medium">{p.title || ""} {p.first_name} {p.last_name}</TableCell>
                      <TableCell>{p.specialty || "—"}</TableCell>
                      <TableCell>{[p.city, p.province].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 text-muted-foreground">
                          {p.email && <Mail className="h-4 w-4" />}
                          {p.whatsapp_number && <MessageCircle className="h-4 w-4 text-emerald-500" />}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{stageLabel(p.stage)}</Badge></TableCell>
                      <TableCell>{p.next_follow_up_date ? format(new Date(p.next_follow_up_date), "PP") : "—"}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteProspect(p.id); }}>Delete</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> All recruitment tasks</CardTitle></CardHeader>
            <CardContent>
              {tasks.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet. Open a prospect to add one.</p> : (
                <div className="space-y-2">
                  {tasks.map(t => {
                    const overdue = t.status === "pending" && t.due_date && new Date(t.due_date) < new Date();
                    const p = prospects.find(pr => pr.id === t.prospect_id);
                    return (
                      <div key={t.id} className={`flex items-center justify-between rounded border p-2.5 ${overdue ? "border-rose-500/50 bg-rose-500/5" : ""} ${t.status === "done" ? "opacity-60" : ""}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${t.status === "done" ? "line-through" : ""}`}>{t.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">{t.task_type}</Badge>
                            <Badge variant={t.priority === "high" || t.priority === "urgent" ? "destructive" : "secondary"} className="text-xs">{t.priority}</Badge>
                            {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                            {p && <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => openEdit(p)}>→ {p.first_name} {p.last_name}</Button>}
                          </div>
                          {t.due_date && <p className="text-xs text-muted-foreground">{format(new Date(t.due_date), "PPp")}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFERRALS */}
        <TabsContent value="referrals" className="space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => setRefOpen(true)}><Plus className="h-4 w-4 mr-1" /> New referral</Button></div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Referrer</TableHead><TableHead>Prospect</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {referrals.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No referrals.</TableCell></TableRow>
                  ) : referrals.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.referrer_name}</TableCell>
                      <TableCell>{r.prospect_name}</TableCell>
                      <TableCell>{format(new Date(r.referral_date), "PP")}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{r.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Added (30 days)" value={reports.addedThisMonth} />
            <Stat label="Lead → Registration" value={`${reports.leadToReg}%`} />
            <Stat label="Registration → Verification" value={`${reports.regToVer}%`} />
            <Stat label="Verification → Founding" value={`${reports.verToFounding}%`} />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <ReportList title="Top referral sources" rows={reports.topReferral} />
            <ReportList title="Top provinces" rows={reports.topProvinces} />
            <ReportList title="Top specialties" rows={reports.topSpecialties} />
          </div>
        </TabsContent>
      </Tabs>

      <ProspectDialog open={dialogOpen} onOpenChange={setDialogOpen} prospect={editing} onSaved={load} />

      {/* Bulk email */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Send bulk email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Template</Label>
              <Select value={bulkTpl} onValueChange={setBulkTpl}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Subject</Label><Input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} /></div>
            <div className="space-y-1"><Label>Message (HTML, use {`{{name}}`})</Label><Textarea rows={6} value={bulkBody} onChange={(e) => setBulkBody(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Recipients ({bulkSelected.size} selected)</Label>
              <div className="max-h-64 overflow-y-auto rounded border divide-y">
                {prospects.filter(p => p.email).map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted/30">
                    <Checkbox checked={bulkSelected.has(p.id)} onCheckedChange={() => toggleBulk(p.id)} />
                    <span className="flex-1">{p.first_name} {p.last_name} <span className="text-muted-foreground">— {p.email}</span></span>
                    <Badge variant="outline" className="text-xs">{stageLabel(p.stage)}</Badge>
                  </label>
                ))}
                {prospects.filter(p => p.email).length === 0 && <p className="p-3 text-sm text-muted-foreground">No prospects with email.</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={sendBulk} disabled={sendingBulk || bulkSelected.size === 0}>
              {sendingBulk && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Send to {bulkSelected.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral */}
      <Dialog open={refOpen} onOpenChange={setRefOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New referral</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Referrer doctor name" value={refForm.referrer_name} onChange={(e) => setRefForm({ ...refForm, referrer_name: e.target.value })} />
            <Input placeholder="Prospective doctor name" value={refForm.prospect_name} onChange={(e) => setRefForm({ ...refForm, prospect_name: e.target.value })} />
            <Select value={refForm.status} onValueChange={(v) => setRefForm({ ...refForm, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["new","contacted","converted","declined"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes" value={refForm.notes} onChange={(e) => setRefForm({ ...refForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefOpen(false)}>Cancel</Button>
            <Button onClick={saveReferral}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: any }) => (
  <Card><CardContent className="p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </CardContent></Card>
);

const ReportList = ({ title, rows }: { title: string; rows: [string, number][] }) => (
  <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {title}</CardTitle></CardHeader>
    <CardContent>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : (
        <div className="space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm"><span className="truncate">{k}</span><Badge variant="secondary">{v}</Badge></div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default AdminRecruitmentCRM;
