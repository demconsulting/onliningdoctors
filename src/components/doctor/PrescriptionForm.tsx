import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, FileText, Save, Upload, BookTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionFormProps {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  onSaved?: () => void;
}

const emptyMed: Medication = { name: "", dosage: "", frequency: "", duration: "", instructions: "" };

const PrescriptionForm = ({ appointmentId, doctorId, patientId, patientName, onSaved }: PrescriptionFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMed }]);
  const [pharmacyNotes, setPharmacyNotes] = useState("");
  const [refillCount, setRefillCount] = useState(0);
  const [followUpDate, setFollowUpDate] = useState("");
  const [warnings, setWarnings] = useState("");
  const [allergiesNoted, setAllergiesNoted] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prescriptions" as any)
        .select("*")
        .eq("appointment_id", appointmentId)
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        setExistingId(d.id);
        setDiagnosis(d.diagnosis || "");
        setMedications(d.medications?.length ? d.medications : [{ ...emptyMed }]);
        setPharmacyNotes(d.pharmacy_notes || "");
        setRefillCount(d.refill_count || 0);
        setFollowUpDate(d.follow_up_date || "");
        setWarnings(d.warnings || "");
        setAllergiesNoted(d.allergies_noted || "");
        setLogoUrl(d.doctor_logo_url || "");
        setSignatureUrl(d.doctor_signature_url || "");
      } else {
        // Load saved logo/sig from most recent prescription
        const { data: recent } = await supabase
          .from("prescriptions" as any)
          .select("doctor_logo_url, doctor_signature_url")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recent) {
          setLogoUrl((recent as any).doctor_logo_url || "");
          setSignatureUrl((recent as any).doctor_signature_url || "");
        }
      }
      // Load templates
      const { data: tpls } = await supabase
        .from("prescription_templates" as any)
        .select("id, name, condition, diagnosis, medications, pharmacy_notes, warnings, refill_count")
        .eq("doctor_id", doctorId)
        .order("name");
      setTemplates((tpls as any[]) || []);
      setLoading(false);
    };
    load();
  }, [open, appointmentId, doctorId]);

  const uploadFile = async (file: File, type: "logo" | "signature") => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingSig;
    setter(true);
    const ext = file.name.split(".").pop();
    const path = `${doctorId}/${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("prescription-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
      setter(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("prescription-assets").getPublicUrl(path);
    // Since bucket is private, we'll store the path and use signed URLs
    if (type === "logo") setLogoUrl(path);
    else setSignatureUrl(path);
    setter(false);
    toast({ title: `${type === "logo" ? "Logo" : "Signature"} uploaded` });
  };

  const updateMed = (idx: number, field: keyof Medication, value: string) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addMed = () => setMedications(prev => [...prev, { ...emptyMed }]);
  const removeMed = (idx: number) => setMedications(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (medications.every(m => !m.name.trim())) {
      toast({ variant: "destructive", title: "Add at least one medication" });
      return;
    }
    setSaving(true);
    const payload = {
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      diagnosis,
      medications: medications.filter(m => m.name.trim()),
      pharmacy_notes: pharmacyNotes || null,
      refill_count: refillCount,
      follow_up_date: followUpDate || null,
      warnings: warnings || null,
      allergies_noted: allergiesNoted || null,
      doctor_logo_url: logoUrl || null,
      doctor_signature_url: signatureUrl || null,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("prescriptions" as any).update(payload).eq("id", existingId));
    } else {
      const res = await supabase.from("prescriptions" as any).insert(payload).select("id").single();
      error = res.error;
      if (res.data) setExistingId((res.data as any).id);
    }

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error saving", description: error.message });
    } else {
      toast({ title: "Prescription saved" });
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {existingId ? "Edit" : "Create"} Prescription
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {/* Logo & Signature Uploads */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Practice Logo</Label>
                {logoUrl && (
                  <div className="h-16 w-32 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    <img src={logoUrl.startsWith("http") ? logoUrl : ""} alt="Logo" className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-xs text-muted-foreground">{logoUrl && !logoUrl.startsWith("http") ? "✓ Uploaded" : ""}</span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="gap-1 text-xs" disabled={uploadingLogo} onClick={() => document.getElementById("logo-upload")?.click()}>
                  {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload Logo
                </Button>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Signature</Label>
                {signatureUrl && (
                  <div className="h-16 w-32 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    <span className="text-xs text-muted-foreground">✓ Uploaded</span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="gap-1 text-xs" disabled={uploadingSig} onClick={() => document.getElementById("sig-upload")?.click()}>
                  {uploadingSig ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload Signature
                </Button>
                <input id="sig-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "signature")} />
              </div>
            </div>

            {/* Diagnosis */}
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Clinical diagnosis..." rows={2} />
            </div>

            {/* Allergies */}
            <div className="space-y-1.5">
              <Label>Patient Allergies Noted</Label>
              <Input value={allergiesNoted} onChange={e => setAllergiesNoted(e.target.value)} placeholder="Known allergies..." />
            </div>

            {/* Medications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Medications</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMed} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add Medication
                </Button>
              </div>
              {medications.map((med, idx) => (
                <Card key={idx} className="border-border/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Medication {idx + 1}</span>
                      {medications.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeMed(idx)} className="h-6 w-6 p-0 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Medication Name *</Label>
                        <Input value={med.name} onChange={e => updateMed(idx, "name", e.target.value)} placeholder="e.g. Amoxicillin" />
                      </div>
                      <div>
                        <Label className="text-xs">Dosage</Label>
                        <Input value={med.dosage} onChange={e => updateMed(idx, "dosage", e.target.value)} placeholder="e.g. 500mg" />
                      </div>
                      <div>
                        <Label className="text-xs">Frequency</Label>
                        <Input value={med.frequency} onChange={e => updateMed(idx, "frequency", e.target.value)} placeholder="e.g. 3 times daily" />
                      </div>
                      <div>
                        <Label className="text-xs">Duration</Label>
                        <Input value={med.duration} onChange={e => updateMed(idx, "duration", e.target.value)} placeholder="e.g. 7 days" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Special Instructions</Label>
                      <Input value={med.instructions} onChange={e => updateMed(idx, "instructions", e.target.value)} placeholder="e.g. Take with food" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pharmacy Notes */}
            <div className="space-y-1.5">
              <Label>Pharmacy Notes</Label>
              <Textarea value={pharmacyNotes} onChange={e => setPharmacyNotes(e.target.value)} placeholder="Notes for the pharmacist..." rows={2} />
            </div>

            {/* Warnings */}
            <div className="space-y-1.5">
              <Label>Warnings / Side Effects</Label>
              <Textarea value={warnings} onChange={e => setWarnings(e.target.value)} placeholder="Important warnings..." rows={2} />
            </div>

            {/* Refill & Follow-up */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Refill Count</Label>
                <Input type="number" min={0} value={refillCount} onChange={e => setRefillCount(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up Date</Label>
                <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {existingId ? "Update Prescription" : "Create Prescription"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionForm;
