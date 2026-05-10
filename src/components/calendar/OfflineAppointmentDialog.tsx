import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
  defaultDate?: Date;
  appointment?: any | null;
  onSaved: () => void;
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const OfflineAppointmentDialog = ({ open, onOpenChange, doctorId, defaultDate, appointment, onSaved }: Props) => {
  const editing = !!appointment;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    start: toLocalInput(defaultDate || new Date()),
    end: toLocalInput(new Date((defaultDate || new Date()).getTime() + 30 * 60000)),
    reason: "",
    notes: "",
  });

  useEffect(() => {
    if (appointment) {
      const s = new Date(appointment.scheduled_at);
      const e = appointment.end_time ? new Date(appointment.end_time) : new Date(s.getTime() + (appointment.duration_minutes || 30) * 60000);
      setForm({
        patient_name: appointment.patient_name || "",
        patient_phone: appointment.patient_phone || "",
        patient_email: appointment.patient_email || "",
        start: toLocalInput(s),
        end: toLocalInput(e),
        reason: appointment.reason || "",
        notes: appointment.notes || "",
      });
    } else if (defaultDate) {
      setForm((f) => ({
        ...f,
        start: toLocalInput(defaultDate),
        end: toLocalInput(new Date(defaultDate.getTime() + 30 * 60000)),
      }));
    }
  }, [appointment, defaultDate, open]);

  const handleSave = async () => {
    if (!form.patient_name.trim()) {
      toast({ variant: "destructive", title: "Patient name is required" });
      return;
    }
    const start = new Date(form.start);
    const end = new Date(form.end);
    if (!(end > start)) {
      toast({ variant: "destructive", title: "End time must be after start time" });
      return;
    }
    setSaving(true);

    // Server-side conflict check
    const { data: conflict, error: cErr } = await supabase.rpc("check_appointment_conflict", {
      _doctor_id: doctorId,
      _start: start.toISOString(),
      _end: end.toISOString(),
      _exclude_appt_id: appointment?.id ?? null,
    });
    if (cErr) {
      setSaving(false);
      toast({ variant: "destructive", title: "Could not verify availability", description: cErr.message });
      return;
    }
    if (conflict) {
      setSaving(false);
      toast({ variant: "destructive", title: "This doctor is already booked during this time." });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);

    const payload: any = {
      doctor_id: doctorId,
      patient_id: null,
      patient_name: form.patient_name.trim(),
      patient_phone: form.patient_phone.trim() || null,
      patient_email: form.patient_email.trim() || null,
      scheduled_at: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: duration,
      appointment_type: "offline",
      status: "confirmed",
      reason: form.reason.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user?.id ?? null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("appointments").update(payload).eq("id", appointment.id));
    } else {
      ({ error } = await supabase.from("appointments").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return;
    }
    toast({ title: editing ? "Appointment updated" : "Offline appointment created" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit Offline Appointment" : "New Offline Appointment"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Patient name *</Label>
            <Input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.patient_email} onChange={(e) => setForm({ ...form, patient_email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start *</Label>
              <Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>End *</Label>
              <Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfflineAppointmentDialog;
