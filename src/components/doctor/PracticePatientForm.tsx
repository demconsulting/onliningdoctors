import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PracticePatient } from "./PracticePatients";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: PracticePatient | null;
  userId: string;
  practiceId: string | null;
  defaultCountry: string | null;
  onSaved: () => void;
}

const empty = {
  full_name: "", phone: "", email: "", date_of_birth: "", gender: "",
  id_type: "national_id" as "national_id" | "passport",
  id_country_code: "",
  id_number: "",
  address: "", emergency_contact_name: "", emergency_contact_phone: "",
  allergies: "", chronic_conditions: "", medical_notes: "",
};

const PracticePatientForm = ({ open, onOpenChange, editing, userId, practiceId, defaultCountry, onSaved }: Props) => {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editing) {
      setForm({
        full_name: editing.full_name || "",
        phone: editing.phone || "",
        email: editing.email || "",
        date_of_birth: editing.date_of_birth || "",
        gender: editing.gender || "",
        id_type: (editing.id_type as any) || "national_id",
        id_country_code: editing.id_country_code || defaultCountry || "",
        id_number: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        allergies: editing.allergies || "",
        chronic_conditions: editing.chronic_conditions || "",
        medical_notes: editing.medical_notes || "",
      });
    } else {
      setForm({ ...empty, id_country_code: defaultCountry || "" });
    }
  }, [editing, defaultCountry, open]);

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    setSaving(true);
    try {
      let id_number_hash: string | null = null;
      let id_last_four: string | null = null;
      const idNumberRaw = form.id_number.trim();
      if (idNumberRaw) {
        const { data: hashData, error: hashErr } = await supabase.rpc("hash_identifier", {
          _id_type: form.id_type,
          _id_value: idNumberRaw,
          _country: form.id_country_code || null,
        });
        if (hashErr) throw hashErr;
        id_number_hash = hashData as string;
        id_last_four = idNumberRaw.replace(/[^A-Za-z0-9]/g, "").slice(-4).toUpperCase();
      }

      const payload: any = {
        full_name: form.full_name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        id_type: idNumberRaw ? form.id_type : null,
        id_country_code: form.id_country_code || null,
        allergies: form.allergies || null,
        chronic_conditions: form.chronic_conditions || null,
        medical_notes: form.medical_notes || null,
      };
      if (idNumberRaw) {
        payload.id_number_hash = id_number_hash;
        payload.id_last_four = id_last_four;
      }
      if (!editing) {
        payload.address = form.address || null;
        payload.emergency_contact_name = form.emergency_contact_name || null;
        payload.emergency_contact_phone = form.emergency_contact_phone || null;
        payload.created_by = userId;
        payload.doctor_id = userId;
        payload.practice_id = practiceId;
      }

      if (editing) {
        const { error } = await supabase.from("practice_patients").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Patient updated" });
      } else {
        const { error } = await supabase.from("practice_patients").insert(payload);
        if (error) throw error;
        toast({ title: "Patient added" });
      }
      onSaved();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? "Edit Practice Patient" : "Add Practice Patient"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Country (for ID)</Label><Input value={form.id_country_code} onChange={(e) => setForm({ ...form, id_country_code: e.target.value })} placeholder="ZA" /></div>
            <div className="space-y-1.5">
              <Label>ID Type</Label>
              <Select value={form.id_type} onValueChange={(v: any) => setForm({ ...form, id_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ID / Passport Number {editing ? "(leave blank to keep)" : ""}</Label>
              <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder="Stored as hash, not plain text" />
            </div>
          </div>

          {!editing && (
            <>
              <div className="space-y-1.5"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Emergency Contact Name</Label><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Emergency Contact Phone</Label><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
              </div>
            </>
          )}

          <div className="space-y-1.5"><Label>Allergies</Label><Textarea rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Chronic Conditions</Label><Textarea rows={2} value={form.chronic_conditions} onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Medical Notes (offline history)</Label><Textarea rows={4} value={form.medical_notes} onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PracticePatientForm;
