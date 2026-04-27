import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Pencil, Trash2, Mail, Loader2, Baby, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInYears } from "date-fns";
import type { User } from "@supabase/supabase-js";

interface FamilyMembersProps {
  user: User;
}

interface Dependent {
  id: string;
  guardian_id: string;
  linked_user_id: string | null;
  full_name: string;
  date_of_birth: string;
  gender: string | null;
  relationship: string;
  email: string | null;
  phone: string | null;
  medical_notes: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allow_login: boolean;
  is_minor: boolean;
  invitation_status: string;
  invitation_sent_at: string | null;
  consent_accepted_at: string | null;
}

const RELATIONSHIPS = ["Spouse", "Child", "Parent", "Sibling", "Grandparent", "Grandchild", "Guardian", "Other"];
const CONSENT_TEXT_GUARDIAN =
  "I confirm that I am legally authorised to manage healthcare bookings for this dependent, and I understand that minor dependents (under 18) are managed by me as guardian.";

const emptyForm = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  relationship: "",
  email: "",
  phone: "",
  medical_notes: "",
  allergies: "",
  chronic_conditions: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  allow_login: false,
};

const FamilyMembers = ({ user }: FamilyMembersProps) => {
  const { toast } = useToast();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [consentChecked, setConsentChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const loadDependents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dependents")
      .select("*")
      .eq("guardian_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast({ variant: "destructive", title: "Error loading dependents", description: error.message });
    else setDependents((data as Dependent[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadDependents(); }, [user.id]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setConsentChecked(false);
    setDialogOpen(true);
  };

  const openEdit = (d: Dependent) => {
    setEditing(d);
    setForm({
      full_name: d.full_name,
      date_of_birth: d.date_of_birth,
      gender: d.gender || "",
      relationship: d.relationship,
      email: d.email || "",
      phone: d.phone || "",
      medical_notes: d.medical_notes || "",
      allergies: d.allergies || "",
      chronic_conditions: d.chronic_conditions || "",
      emergency_contact_name: d.emergency_contact_name || "",
      emergency_contact_phone: d.emergency_contact_phone || "",
      allow_login: d.allow_login,
    });
    setConsentChecked(true); // already consented previously
    setDialogOpen(true);
  };

  const computedAge = form.date_of_birth ? differenceInYears(new Date(), new Date(form.date_of_birth)) : null;
  const willBeMinor = computedAge !== null && computedAge < 18;
  const wantsLogin = form.allow_login && !willBeMinor;

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.date_of_birth || !form.relationship) {
      toast({ variant: "destructive", title: "Please fill name, date of birth and relationship" });
      return;
    }
    if (wantsLogin && !form.email.trim()) {
      toast({ variant: "destructive", title: "Email required to allow login" });
      return;
    }
    if (!editing && !consentChecked) {
      toast({ variant: "destructive", title: "Please confirm guardian authorisation" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        guardian_id: user.id,
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender || null,
        relationship: form.relationship,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        medical_notes: form.medical_notes.trim() || null,
        allergies: form.allergies.trim() || null,
        chronic_conditions: form.chronic_conditions.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        allow_login: wantsLogin,
      };

      let dependentId: string;

      if (editing) {
        const { error } = await supabase.from("dependents").update(payload).eq("id", editing.id);
        if (error) throw error;
        dependentId = editing.id;
      } else {
        const { data, error } = await supabase.from("dependents").insert(payload).select("id").single();
        if (error) throw error;
        dependentId = data.id;

        // Record guardian authority consent
        await supabase.from("dependent_consents").insert({
          dependent_id: dependentId,
          user_id: user.id,
          consent_type: "guardian_authority",
          consent_text: CONSENT_TEXT_GUARDIAN,
          consent_version: "1.0",
        });
      }

      toast({ title: editing ? "Dependent updated" : "Dependent added" });
      setDialogOpen(false);
      await loadDependents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("dependents").delete().eq("id", deleteId);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Dependent removed" });
      await loadDependents();
    }
    setDeleteId(null);
  };

  const handleInvite = async (d: Dependent) => {
    if (!d.email) {
      toast({ variant: "destructive", title: "Add an email first to invite this dependent" });
      return;
    }
    setInvitingId(d.id);
    try {
      const { data, error } = await supabase.functions.invoke("invite-dependent", {
        body: { dependent_id: d.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed to send invitation");
      toast({ title: "Invitation sent", description: `An email was sent to ${d.email}` });
      await loadDependents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Invitation failed", description: err.message });
    } finally {
      setInvitingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-display">
          <Users className="h-5 w-5 text-primary" /> Family Members & Dependents
        </CardTitle>
        <Button size="sm" onClick={openAdd} className="gap-1">
          <Plus className="h-4 w-4" /> Add Dependent
        </Button>
      </CardHeader>
      <CardContent>
        {dependents.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p>No dependents added yet</p>
            <p className="text-sm">Add a family member to book consultations on their behalf</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dependents.map((d) => {
              const age = differenceInYears(new Date(), new Date(d.date_of_birth));
              return (
                <div key={d.id} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        {d.is_minor ? <Baby className="h-5 w-5 text-primary" /> : <UserCheck className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{d.full_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{d.relationship}</span>
                          <span>•</span>
                          <span>{age} yrs</span>
                          {d.is_minor && <Badge variant="secondary" className="text-[10px]">Minor</Badge>}
                          {!d.is_minor && d.allow_login && (
                            <Badge variant="outline" className="text-[10px]">
                              {d.invitation_status === "accepted" ? "Linked account" :
                               d.invitation_status === "pending" ? "Invite pending" : "Login enabled"}
                            </Badge>
                          )}
                          {!d.is_minor && d.consent_accepted_at && (
                            <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                              Records consent ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {!d.is_minor && d.allow_login && d.email && d.invitation_status !== "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => handleInvite(d)} disabled={invitingId === d.id} className="gap-1 text-xs">
                          {invitingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                          {d.invitation_status === "pending" ? "Resend invite" : "Invite"}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(d)} className="gap-1 text-xs">
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(d.id)} className="gap-1 text-xs text-destructive">
                        <Trash2 className="h-3 w-3" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Dependent" : "Add Dependent"}</DialogTitle>
            <DialogDescription>
              Their profile is kept separate from yours. You'll select who a consultation is for when booking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth *</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} max={format(new Date(), "yyyy-MM-dd")} />
              {computedAge !== null && (
                <p className="text-xs text-muted-foreground">{computedAge} years old • {willBeMinor ? "Minor (guardian managed)" : "Adult"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Relationship *</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email (optional)</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Allergies</Label>
              <Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Chronic conditions</Label>
              <Textarea value={form.chronic_conditions} onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Medical notes</Label>
              <Textarea value={form.medical_notes} onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency contact name</Label>
              <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency contact phone</Label>
              <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </div>

            {!willBeMinor && computedAge !== null && (
              <div className="sm:col-span-2 flex items-start gap-3 rounded-md border border-border p-3">
                <Switch checked={form.allow_login} onCheckedChange={(v) => setForm({ ...form, allow_login: v })} id="allow-login" />
                <div className="flex-1">
                  <Label htmlFor="allow-login" className="cursor-pointer">Allow this dependent to have their own login</Label>
                  <p className="text-xs text-muted-foreground">
                    They'll receive an email invitation. Until they accept and consent, you can book consultations for them but won't be able to view their consultation notes or prescriptions.
                  </p>
                </div>
              </div>
            )}

            {!editing && (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                <Checkbox id="guardian-consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(!!v)} className="mt-0.5" />
                <Label htmlFor="guardian-consent" className="cursor-pointer text-sm font-normal leading-snug">
                  {CONSENT_TEXT_GUARDIAN}
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Save changes" : "Add dependent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this dependent?</AlertDialogTitle>
            <AlertDialogDescription>
              The dependent's profile will be removed. Past consultations and prescriptions will remain in your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default FamilyMembers;
