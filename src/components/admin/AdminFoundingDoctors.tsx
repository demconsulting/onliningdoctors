import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Crown, Loader2, Check, X, RefreshCw, Users, ListChecks, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";
import TierProgressCards from "./founding/TierProgressCards";
import DoctorTierTable from "./founding/DoctorTierTable";
import DigitalServicesDialog from "./founding/DigitalServicesDialog";
import ProgrammeSettings from "./founding/ProgrammeSettings";
import { useFoundingPricing } from "@/hooks/useFoundingPricing";

const money = (v: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(v || 0);

const Kpi = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

const AdminFoundingDoctors = () => {
  const { toast } = useToast();
  const { pricing } = useFoundingPricing();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [foundingPlans, setFoundingPlans] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [servicesFor, setServicesFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [progRes, appsRes, doctorsRes, plansRes] = await Promise.all([
      supabase.from("founding_doctor_program" as any).select("*").limit(1).maybeSingle(),
      supabase.from("founding_doctor_applications" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("doctors").select("*").eq("is_suspended", false),
      supabase.from("platform_fee_settings" as any).select("*").eq("is_founding_plan", true).eq("is_active", true),
    ]);
    setProgram(progRes.data);
    setApplications((appsRes.data as any[]) || []);
    setAllDoctors((doctorsRes.data as any[]) || []);
    setFoundingPlans((plansRes.data as any[]) || []);

    const ids = new Set<string>();
    ((appsRes.data as any[]) || []).forEach((a) => ids.add(a.doctor_id));
    ((doctorsRes.data as any[]) || []).forEach((d) => d.profile_id && ids.add(d.profile_id));
    if (ids.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, country").in("id", Array.from(ids));
      const map: Record<string, any> = {};
      (profs || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pioneers = useMemo(() => allDoctors.filter((d) => d.is_founding_doctor && d.founding_tier === "pioneer"), [allDoctors]);
  const founders = useMemo(() => allDoctors.filter((d) => d.is_founding_doctor && d.founding_tier === "founding"), [allDoctors]);
  const standard = useMemo(() => allDoctors.filter((d) => !d.is_founding_doctor), [allDoctors]);

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
    const { data: app } = await supabase.from("founding_doctor_applications" as any)
      .select("id").eq("doctor_id", doctorProfileId).eq("status", "approved").maybeSingle();
    if (!app) {
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

  const changeSource = async (doctorProfileId: string, source: string) => {
    const { error } = await supabase.from("doctors" as any)
      .update({ recruitment_source: source }).eq("profile_id", doctorProfileId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setAllDoctors((prev) => prev.map((d) => d.profile_id === doctorProfileId ? { ...d, recruitment_source: source } : d));
      toast({ title: "Recruitment source updated" });
    }
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
  const approvedApps = applications.filter((a) => a.status === "approved");
  const pioneerLimit = program?.pioneer_limit ?? 20;
  const foundingLimit = program?.founding_limit ?? 80;
  const totalActive = pioneers.length + founders.length;
  const monthly = Number(pricing?.monthly_care_plan || 0);
  const mrr = (totalActive + standard.length) * monthly;
  const conversion = applications.length > 0 ? Math.round((approvedApps.length / applications.length) * 100) : 0;
  const remaining = Math.max(pioneerLimit + foundingLimit - totalActive, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" /> Founding Doctor Programme
          </h2>
          <p className="text-sm text-muted-foreground">Recruit, Onboard and Manage the First 100 Founding Doctors</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      <TierProgressCards
        pioneerFilled={pioneers.length}
        pioneerLimit={pioneerLimit}
        foundingFilled={founders.length}
        foundingLimit={foundingLimit}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Applications" value={applications.length} />
        <Kpi label="Pending approval" value={pending.length} />
        <Kpi label="Pioneer" value={pioneers.length} />
        <Kpi label="Founding" value={founders.length} />
        <Kpi label="Standard" value={standard.length} />
        <Kpi label="Total active" value={totalActive} />
        <Kpi label="MRR" value={money(mrr, pricing?.currency)} />
        <Kpi label="Conversion" value={`${conversion}%`} />
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start h-auto">
          <TabsTrigger value="applications" className="gap-1.5"><ListChecks className="h-4 w-4" /> Applications ({pending.length})</TabsTrigger>
          <TabsTrigger value="pioneer" className="gap-1.5"><Sparkles className="h-4 w-4" /> Pioneer ({pioneers.length})</TabsTrigger>
          <TabsTrigger value="founding" className="gap-1.5"><Crown className="h-4 w-4" /> Founding ({founders.length})</TabsTrigger>
          <TabsTrigger value="standard" className="gap-1.5"><Users className="h-4 w-4" /> Standard ({standard.length})</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Application Review Queue</CardTitle><CardDescription>Approve, reject, or review pending applicants. {remaining} programme slots remain.</CardDescription></CardHeader>
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
              <CardHeader><CardTitle>Waiting list ({waitlist.length})</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
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

        <TabsContent value="pioneer">
          <DoctorTierTable
            title="Pioneer Founding Doctors"
            description="The first doctors to join, with lifetime locked-in benefits."
            doctors={pioneers}
            profiles={profiles}
            foundingPlans={foundingPlans}
            onChangePlan={changePlan}
            onChangeSource={changeSource}
            onDeactivate={deactivate}
            onOpenServices={setServicesFor}
          />
        </TabsContent>

        <TabsContent value="founding">
          <DoctorTierTable
            title="Founding Doctors"
            description="Doctors joining after the pioneer tier, on preferential pricing."
            doctors={founders}
            profiles={profiles}
            foundingPlans={foundingPlans}
            onChangePlan={changePlan}
            onChangeSource={changeSource}
            onDeactivate={deactivate}
            onOpenServices={setServicesFor}
          />
        </TabsContent>

        <TabsContent value="standard">
          <DoctorTierTable
            title="Standard Doctors"
            description="Doctors outside the founding programme."
            doctors={standard}
            profiles={profiles}
            foundingPlans={foundingPlans}
            showPlan={false}
            onChangeSource={changeSource}
            onOpenServices={setServicesFor}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ProgrammeSettings program={program} foundingPlans={foundingPlans} onSaveProgram={saveProgram} />
        </TabsContent>
      </Tabs>

      <DigitalServicesDialog
        doctorProfileId={servicesFor}
        doctorName={servicesFor ? profiles[servicesFor]?.full_name : undefined}
        onClose={() => setServicesFor(null)}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject application</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
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
