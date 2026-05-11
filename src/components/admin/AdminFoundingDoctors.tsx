import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Crown, Loader2, Check, X, RefreshCw, Users, ListChecks, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";

const AdminFoundingDoctors = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeFounders, setActiveFounders] = useState<any[]>([]);
  const [foundingPlans, setFoundingPlans] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [progRes, appsRes, foundersRes, plansRes] = await Promise.all([
      supabase.from("founding_doctor_program" as any).select("*").maybeSingle(),
      supabase.from("founding_doctor_applications" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("doctors").select("*").eq("is_founding_doctor", true),
      supabase.from("platform_fee_settings" as any).select("*").eq("is_founding_plan", true).eq("is_active", true),
    ]);
    setProgram(progRes.data);
    setApplications((appsRes.data as any[]) || []);
    setActiveFounders((foundersRes.data as any[]) || []);
    setFoundingPlans((plansRes.data as any[]) || []);

    const ids = new Set<string>();
    ((appsRes.data as any[]) || []).forEach((a) => ids.add(a.doctor_id));
    ((foundersRes.data as any[]) || []).forEach((d) => ids.add(d.profile_id));
    if (ids.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, country").in("id", Array.from(ids));
      const map: Record<string, any> = {};
      (profs || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (app: any) => {
    const { error } = await supabase.from("founding_doctor_applications" as any)
      .update({ status: "approved" }).eq("id", app.id);
    if (error) toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Founding doctor approved" }); load(); }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const { error } = await supabase.from("founding_doctor_applications" as any)
      .update({ status: "rejected", rejection_reason: rejectReason || null }).eq("id", rejectTarget.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Application rejected" }); setRejectTarget(null); setRejectReason(""); load(); }
  };

  const deactivate = async (doctorProfileId: string) => {
    if (!confirm("Deactivate this founding doctor's benefits? Their pricing will revert to the default plan.")) return;
    // find their active application
    const { data: app } = await supabase.from("founding_doctor_applications" as any)
      .select("id").eq("doctor_id", doctorProfileId).eq("status", "approved").maybeSingle();
    if (!app) {
      // no approval row — just toggle the doctor row directly
      await supabase.from("doctors").update({ is_founding_doctor: false, founding_status: "inactive" }).eq("profile_id", doctorProfileId);
    } else {
      await supabase.from("founding_doctor_applications" as any).update({ status: "inactive" }).eq("id", (app as any).id);
    }
    toast({ title: "Founding benefits deactivated" });
    load();
  };

  const changePlan = async (doctorProfileId: string, planId: string) => {
    const { error } = await supabase.from("doctors")
      .update({ founding_pricing_plan_id: planId, fee_settings_id: planId })
      .eq("profile_id", doctorProfileId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Plan updated" }); load(); }
  };

  const saveProgram = async (patch: any) => {
    if (!program) return;
    const { error } = await supabase.from("founding_doctor_program" as any).update(patch).eq("id", program.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); load(); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pending = applications.filter((a) => a.status === "pending");
  const waitlist = applications.filter((a) => a.status === "waitlist");
  const approvedCount = activeFounders.length;
  const max = program?.max_slots ?? 10;
  const remaining = Math.max(max - approvedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" /> Founding Doctors Management
          </h2>
          <p className="text-sm text-muted-foreground">{program?.program_label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">{approvedCount} / {max} slots</Badge>
          <Badge variant="secondary" className="text-sm">{remaining} remaining</Badge>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
        </div>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1.5"><ListChecks className="h-4 w-4" /> Queue ({pending.length})</TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5"><Users className="h-4 w-4" /> Active ({approvedCount})</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Application Review Queue</CardTitle><CardDescription>Approve, reject, or review pending applicants.</CardDescription></CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No pending applications.</p>
              ) : (
                <div className="space-y-4">
                  {pending.map((a) => (
                    <div key={a.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{profiles[a.doctor_id]?.full_name || a.doctor_id}</p>
                          <p className="text-xs text-muted-foreground">{a.specialty} • {a.years_experience ?? "?"} yrs experience • {format(new Date(a.created_at), "PP")}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approve(a)} disabled={remaining <= 0}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectTarget(a)}>
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                      {a.motivation && <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">{a.motivation}</p>}
                      {a.availability && <p className="text-xs"><span className="font-semibold">Availability:</span> {a.availability}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {waitlist.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Waitlist ({waitlist.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Doctor</TableHead><TableHead>Specialty</TableHead><TableHead>Submitted</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {waitlist.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{profiles[a.doctor_id]?.full_name || a.doctor_id}</TableCell>
                        <TableCell>{a.specialty}</TableCell>
                        <TableCell>{format(new Date(a.created_at), "PP")}</TableCell>
                        <TableCell><Button size="sm" onClick={() => approve(a)} disabled={remaining <= 0}>Promote</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle>Active Founding Doctors</CardTitle><CardDescription>Manage pricing plans and benefits.</CardDescription></CardHeader>
            <CardContent>
              {activeFounders.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No active founding doctors yet.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Doctor</TableHead><TableHead>Since</TableHead><TableHead>Founding Plan</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {activeFounders.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{profiles[d.profile_id]?.full_name || d.profile_id}</TableCell>
                        <TableCell>{d.founding_doctor_since ? format(new Date(d.founding_doctor_since), "PP") : "—"}</TableCell>
                        <TableCell>
                          <Select value={d.founding_pricing_plan_id || ""} onValueChange={(v) => changePlan(d.profile_id, v)}>
                            <SelectTrigger className="w-56"><SelectValue placeholder="Select plan" /></SelectTrigger>
                            <SelectContent>
                              {foundingPlans.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.platform_fee_percent}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => deactivate(d.profile_id)}>Deactivate</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Program Settings</CardTitle><CardDescription>Configure slots, status, and the default founding plan.</CardDescription></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Program label</Label>
                <Input defaultValue={program?.program_label} onBlur={(e) => e.target.value !== program?.program_label && saveProgram({ program_label: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Maximum founding slots</Label>
                <Input type="number" min={1} defaultValue={program?.max_slots} onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n !== program?.max_slots) saveProgram({ max_slots: n });
                }} />
              </div>
              <div className="space-y-2">
                <Label>Default founding pricing plan</Label>
                <Select value={program?.default_fee_settings_id || ""} onValueChange={(v) => saveProgram({ default_fee_settings_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {foundingPlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.platform_fee_percent}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Manage these in Financial Settings (mark plans as "founding plan").</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-semibold">Applications open</p>
                  <p className="text-xs text-muted-foreground">When off, new submissions go to the waitlist.</p>
                </div>
                <Switch checked={!!program?.applications_open} onCheckedChange={(v) => saveProgram({ applications_open: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject founding application</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional, shared with the doctor)</Label>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFoundingDoctors;
