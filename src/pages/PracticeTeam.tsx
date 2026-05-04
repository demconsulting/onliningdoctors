import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Users, Plus, Trash2, ShieldOff, ShieldCheck, Stethoscope, Calendar, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { usePractice, type PracticeRole, type PracticeMember } from "@/hooks/usePractice";
import type { User } from "@supabase/supabase-js";

const ROLES: { value: PracticeRole; label: string }[] = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" },
  { value: "practice_admin", label: "Practice Admin" },
];

const memberSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(3).max(50).optional().or(z.literal("")),
  role: z.enum(["doctor", "nurse", "receptionist", "practice_admin"]),
  hpcsa_number: z.string().trim().max(50).optional().or(z.literal("")),
});

type Counts = { doctors: number; staff: number; appointments: number; activePatients: number };

const PracticeTeam = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { practice, isManager, loading } = usePractice(user?.id);
  const [members, setMembers] = useState<PracticeMember[]>([]);
  const [counts, setCounts] = useState<Counts>({ doctors: 0, staff: 0, appointments: 0, activePatients: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role: "doctor" as PracticeRole, hpcsa_number: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      else setUser(session.user);
    });
  }, [navigate]);

  const fetchMembers = useCallback(async () => {
    if (!practice) return;
    const { data } = await supabase
      .from("practice_members")
      .select("*")
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: true });
    setMembers((data as PracticeMember[]) || []);
  }, [practice]);

  const fetchCounts = useCallback(async () => {
    if (!practice) return;
    const { data: doctorRows } = await supabase
      .from("doctors").select("profile_id").eq("practice_id", practice.id);
    const doctorIds = (doctorRows || []).map((d) => d.profile_id);
    const { data: memberRows } = await supabase
      .from("practice_members").select("role,status").eq("practice_id", practice.id);
    const doctors = (memberRows || []).filter((m) => m.role === "doctor" || m.role === "owner").length;
    const staff = (memberRows || []).filter((m) => m.role === "nurse" || m.role === "receptionist" || m.role === "practice_admin").length;

    let appointments = 0;
    let activePatients = 0;
    if (doctorIds.length > 0) {
      const { count: aptCount } = await supabase
        .from("appointments").select("id", { count: "exact", head: true }).in("doctor_id", doctorIds);
      appointments = aptCount || 0;
      const { data: pats } = await supabase
        .from("appointments").select("patient_id").in("doctor_id", doctorIds).in("status", ["confirmed", "completed", "pending"]);
      activePatients = new Set((pats || []).map((p) => p.patient_id)).size;
    }
    setCounts({ doctors, staff, appointments, activePatients });
  }, [practice]);

  useEffect(() => { fetchMembers(); fetchCounts(); }, [fetchMembers, fetchCounts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practice) return;
    const parsed = memberSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message || "Invalid input"); return; }
    if (parsed.data.role === "doctor" && !parsed.data.hpcsa_number) {
      toast.error("HPCSA number is required for doctors"); return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("practice_members").insert({
      practice_id: practice.id,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      hpcsa_number: parsed.data.hpcsa_number || null,
      status: "invited",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Team member added");
    setDialogOpen(false);
    setForm({ full_name: "", email: "", phone: "", role: "doctor", hpcsa_number: "" });
    fetchMembers(); fetchCounts();
  };

  const updateMember = async (id: string, patch: Partial<PracticeMember>) => {
    const { error } = await supabase.from("practice_members").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchMembers();
  };

  const removeMember = async (m: PracticeMember) => {
    if (m.role === "owner") { toast.error("Cannot remove the owner"); return; }
    if (!confirm(`Remove ${m.full_name}?`)) return;
    const { error } = await supabase.from("practice_members").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    fetchMembers(); fetchCounts();
  };

  const statusVariant = useMemo(() => ({
    active: "default", invited: "secondary", suspended: "destructive",
  } as const), []);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!practice) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container mx-auto flex-1 px-4 py-12">
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>No practice yet</CardTitle>
              <CardDescription>You're not part of a practice. Set one up to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/practice/setup")}>Register a practice</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{practice.practice_name}</h1>
            <p className="text-sm text-muted-foreground">
              Practice #{practice.practice_number} · You belong to this practice
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/practice/settings")}>Settings</Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Doctors", value: counts.doctors, icon: Stethoscope },
            { label: "Staff", value: counts.staff, icon: UserCheck },
            { label: "Appointments", value: counts.appointments, icon: Calendar },
            { label: "Active Patients", value: counts.activePatients, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
                <div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team members</CardTitle>
              <CardDescription>Manage staff in your practice</CardDescription>
            </div>
            {isManager && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add team member</DialogTitle>
                    <DialogDescription>They'll be linked to {practice.practice_name}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAdd} className="grid gap-3">
                    <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as PracticeRole })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.role === "doctor" && (
                      <div className="space-y-2"><Label>HPCSA number</Label><Input value={form.hpcsa_number} onChange={(e) => setForm({ ...form, hpcsa_number: e.target.value })} required /></div>
                    )}
                    <DialogFooter>
                      <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 && (
                  <TableRow><TableCell colSpan={isManager ? 5 : 4} className="text-center text-muted-foreground">No team members yet</TableCell></TableRow>
                )}
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.full_name}
                      {m.role === "doctor" && m.hpcsa_number && (
                        <div className="text-xs text-muted-foreground">HPCSA: {m.hpcsa_number}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isManager && m.role !== "owner" ? (
                        <Select value={m.role} onValueChange={(v) => updateMember(m.id, { role: v as PracticeRole })}>
                          <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">{m.role.replace("_", " ")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{m.email}</TableCell>
                    <TableCell><Badge variant={statusVariant[m.status]} className="capitalize">{m.status}</Badge></TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        {m.role !== "owner" && (
                          <div className="flex justify-end gap-1">
                            {m.status === "suspended" ? (
                              <Button size="sm" variant="ghost" onClick={() => updateMember(m.id, { status: "active" })} title="Reactivate">
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => updateMember(m.id, { status: "suspended" })} title="Suspend">
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => removeMember(m)} title="Remove">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Role permissions</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>• Doctors must have their own individual doctor profile to conduct consultations.</div>
            <div>• Receptionists and Practice Admins can manage appointments but cannot conduct consultations.</div>
            <div>• Nurses can support consultations only if enabled by the Practice Owner in Settings.</div>
            <div>• Only the Owner and Practice Admins can invite, edit, suspend, or remove members.</div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PracticeTeam;
