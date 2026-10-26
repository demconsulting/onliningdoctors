import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Save, Upload, UserPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/fileUpload";
import { canAccessGroupPractice, missingDoctorCredentials, PRACTICE_TYPES, MEMBER_ROLES } from "@/lib/groupPractice";
import type { Tables } from "@/integrations/supabase/types";
import PracticeAdministrators from "@/components/admin/PracticeAdministrators";

type Practice = Tables<"practices">;
type Member = { id: string; doctor_id: string; full_name: string; email: string; member_role: typeof MEMBER_ROLES[number]; is_active: boolean; hpcsa_number: string | null; individual_bhf_number: string | null; physical_practice_address: string | null };
const GroupPracticeDashboard = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Practice | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState<typeof MEMBER_ROLES[number]>("associate");
  const [logo, setLogo] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login?redirect=/practice-dashboard", { replace: true }); return; }
      const { data: rows, error } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (error) { if (active) { setLoadError(error.message); setChecking(false); } return; }
      const roles = rows?.map(row => row.role) || [];
      if (!canAccessGroupPractice(roles)) { navigate(roles.includes("doctor") ? "/doctor-dashboard" : "/dashboard", { replace: true }); return; }
      const { data, error: practiceError } = await supabase.from("practices").select("*").order("practice_name");
      if (!active) return;
      setIsAdmin(roles.some(role => ["admin", "super_admin", "platform_admin"].includes(role)));
      setPractices(data || []);
      setSelectedId(data?.[0]?.id || "");
      if (practiceError) setLoadError(practiceError.message);
      setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);
  const loadMembers = useCallback(async () => {
    if (!selectedId) return;
    setMembersLoading(true);
    const { data, error } = await supabase.rpc("group_practice_members", { _practice_id: selectedId });
    if (error) toast.error(error.message);
    else setMembers((data || []) as unknown as Member[]);
    setMembersLoading(false);
  }, [selectedId]);
  useEffect(() => {
    setDraft(practices.find(practice => practice.id === selectedId) || null);
    setMembers([]);
    void loadMembers();
  }, [selectedId, practices, loadMembers]);
  useEffect(() => {
    let active = true;
    setLogo("");
    if (draft?.logo_url) void supabase.storage.from("group-practice-logos").createSignedUrl(draft.logo_url, 3600).then(({ data }) => { if (active) setLogo(data?.signedUrl || ""); });
    return () => { active = false; };
  }, [draft?.logo_url]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    const { data, error } = await supabase.from("practices").update({ practice_name: draft.practice_name.trim(), bhf_number: draft.bhf_number?.trim() || null, practice_type: draft.practice_type, vat_number: draft.vat_number?.trim() || null, address: draft.address.trim(), city: draft.city, province: draft.province, phone: draft.phone.trim(), email: draft.email.trim(), is_medical_aid_practice: draft.is_medical_aid_practice, is_active: draft.is_active }).eq("id", draft.id).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setPractices(previous => previous.map(practice => practice.id === data.id ? data : practice));
    toast.success("Practice details saved");
  };
  const uploadLogo = async (file?: File) => {
    if (!file || !draft) return;
    setBusy(true);
    try {
      const { path } = await uploadFile({ file, bucket: "group-practice-logos", path: `${draft.id}/logo-${Date.now()}.webp`, profile: "practice_logo" });
      const { data, error } = await supabase.from("practices").update({ logo_url: path }).eq("id", draft.id).select().single();
      if (error) throw error;
      setDraft(previous => previous ? { ...previous, logo_url: path } : previous);
      setPractices(previous => previous.map(practice => practice.id === data.id ? data : practice));
      toast.success("Practice logo updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Logo upload failed"); }
    finally { setBusy(false); }
  };
  const addDoctor = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("add_group_practice_doctor", { _practice_id: selectedId, _email: email.trim(), _member_role: memberRole });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEmail(""); toast.success("Doctor added"); await loadMembers();
  };
  const changeMember = async (member: Member, changes: { member_role?: typeof MEMBER_ROLES[number]; status?: "active" | "suspended" }) => {
    setBusy(true);
    const { error } = await supabase.from("practice_members").update(changes).eq("id", member.id).eq("practice_id", selectedId);
    setBusy(false);
    if (error) toast.error(error.message); else await loadMembers();
  };
  if (checking) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading practice dashboard" /></div>;
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main className="container mx-auto flex-1 space-y-6 px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="flex items-center gap-3 font-display text-2xl font-semibold"><Building2 className="h-6 w-6 shrink-0 text-primary" />Group Practice &amp; Medical Aid</h1>{isAdmin && <Button asChild variant="outline"><Link to="/admin">Admin dashboard</Link></Button>}</div>
    {loadError ? <p role="alert" className="text-destructive">{loadError}</p> : !practices.length ? <p className="text-muted-foreground">{isAdmin ? "No practices registered yet." : "No practice assigned to your account. Ask a platform administrator to assign your practice."}</p> : <>
      <div className="max-w-md space-y-2"><Label>Practice</Label><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger aria-label="Practice"><SelectValue /></SelectTrigger><SelectContent>{practices.map(practice => <SelectItem key={practice.id} value={practice.id}>{practice.practice_name}</SelectItem>)}</SelectContent></Select></div>
      {draft && <Tabs defaultValue="details" className="space-y-6"><TabsList><TabsTrigger value="details">Practice details</TabsTrigger><TabsTrigger value="doctors">Doctors</TabsTrigger></TabsList>
        <TabsContent value="details" className="space-y-8">
          <div className="flex items-center gap-4">{logo ? <img src={logo} alt={`${draft.practice_name} logo`} className="h-20 w-20 rounded-md border border-border bg-card object-contain" /> : <Building2 className="h-14 w-14 text-muted-foreground" />}<div><Label htmlFor="practice-logo" className="mb-2 block">Practice logo</Label><Input id="practice-logo" type="file" accept=".jpg,.jpeg,.png,.webp" disabled={busy} onChange={event => { void uploadLogo(event.target.files?.[0]); event.target.value = ""; }} /></div>{busy && <Upload className="h-4 w-4 animate-pulse text-primary" />}</div>
          <form onSubmit={save} className="max-w-4xl space-y-5"><div className="grid gap-5 sm:grid-cols-2">
            {([['practice_name','Practice name'],['bhf_number','BHF group practice number'],['vat_number','VAT number'],['address','Physical address'],['city','City'],['province','Province'],['phone','Phone'],['email','Email']] as const).map(([field,label]) => <div key={field} className="space-y-2"><Label htmlFor={`practice-${field}`}>{label}</Label><Input id={`practice-${field}`} type={field === 'email' ? 'email' : 'text'} value={draft[field] || ''} required={['practice_name','address','phone','email'].includes(field)} minLength={field === 'practice_name' ? 2 : ['address','phone'].includes(field) ? 3 : undefined} maxLength={field === 'address' ? 500 : field === 'email' ? 255 : field === 'practice_name' ? 200 : 50} onChange={event => setDraft({ ...draft, [field]: event.target.value })} /></div>)}
            <div className="space-y-2"><Label>Practice type</Label><Select value={draft.practice_type} onValueChange={value => setDraft({ ...draft, practice_type: value as Practice['practice_type'] })}><SelectTrigger aria-label="Practice type"><SelectValue /></SelectTrigger><SelectContent>{PRACTICE_TYPES.map(type => <SelectItem value={type} key={type} className="capitalize">{type}</SelectItem>)}</SelectContent></Select></div>
          </div><div className="flex flex-wrap gap-6"><div className="flex items-center gap-3"><Switch id="medical-aid-practice" checked={draft.is_medical_aid_practice} onCheckedChange={value => setDraft({ ...draft, is_medical_aid_practice: value })} /><Label htmlFor="medical-aid-practice">Medical aid practice</Label></div><div className="flex items-center gap-3"><Switch id="practice-active" checked={draft.is_active} onCheckedChange={value => setDraft({ ...draft, is_active: value })} /><Label htmlFor="practice-active">Active practice</Label></div></div><Button disabled={busy} type="submit" className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save details</Button></form>
          {isAdmin && <PracticeAdministrators key={selectedId} practiceId={selectedId} />}
        </TabsContent>
        <TabsContent value="doctors" className="space-y-6"><form onSubmit={addDoctor} className="flex flex-wrap items-end gap-3 border-b border-border pb-6"><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="member-email">Existing doctor email</Label><Input id="member-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></div><div className="w-40 space-y-2"><Label>Member role</Label><Select value={memberRole} onValueChange={value => setMemberRole(value as typeof MEMBER_ROLES[number])}><SelectTrigger aria-label="Member role"><SelectValue /></SelectTrigger><SelectContent>{MEMBER_ROLES.map(role => <SelectItem value={role} key={role} className="capitalize">{role}</SelectItem>)}</SelectContent></Select></div><Button disabled={busy} type="submit" className="gap-2"><UserPlus className="h-4 w-4" />Add doctor</Button></form>
          {membersLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : !members.length ? <p className="text-muted-foreground">No doctors added to this practice.</p> : members.map(member => <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4"><div className="min-w-0 flex-1 space-y-2"><h2 className="font-semibold">{member.full_name}</h2><p className="break-all text-sm text-muted-foreground">{member.email}</p><p className="text-sm text-muted-foreground">HPCSA: {member.hpcsa_number || 'Missing'} · BHF: {member.individual_bhf_number || 'Missing'}</p><p className="text-sm text-muted-foreground">{member.physical_practice_address || 'Physical practice address missing'}</p><div className="flex flex-wrap gap-2">{missingDoctorCredentials(member).map(credential => <Badge key={credential} variant="outline" className="gap-1 border-warning text-foreground"><AlertTriangle className="h-3 w-3 text-warning" />Missing {credential}</Badge>)}</div></div><div className="flex flex-wrap items-center gap-2"><Badge variant={member.is_active ? 'secondary' : 'outline'}>{member.is_active ? 'Active' : 'Inactive'}</Badge><Select value={member.member_role} disabled={busy} onValueChange={value => void changeMember(member,{ member_role: value as typeof MEMBER_ROLES[number] })}><SelectTrigger className="w-36" aria-label={`Role for ${member.full_name}`}><SelectValue /></SelectTrigger><SelectContent>{MEMBER_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={busy} onClick={() => void changeMember(member,{ status: member.is_active ? 'suspended' : 'active' })}>{member.is_active ? 'Deactivate' : 'Reactivate'}</Button></div></div>)}
        </TabsContent>
      </Tabs>}
    </>}
  </main><Footer /></div>;
};
export default GroupPracticeDashboard;