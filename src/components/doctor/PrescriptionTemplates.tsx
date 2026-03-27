import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Save, BookTemplate, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Template {
  id: string;
  name: string;
  condition: string | null;
  diagnosis: string | null;
  medications: Medication[];
  pharmacy_notes: string | null;
  warnings: string | null;
  refill_count: number;
  created_at: string;
}

interface PrescriptionTemplatesProps {
  user: User;
}

const emptyMed: Medication = { name: "", dosage: "", frequency: "", duration: "", instructions: "" };

const PrescriptionTemplates = ({ user }: PrescriptionTemplatesProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMed }]);
  const [pharmacyNotes, setPharmacyNotes] = useState("");
  const [warnings, setWarnings] = useState("");
  const [refillCount, setRefillCount] = useState(0);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("prescription_templates" as any)
      .select("*")
      .eq("doctor_id", user.id)
      .order("name");
    setTemplates((data as any as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [user.id]);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setCondition("");
    setDiagnosis("");
    setMedications([{ ...emptyMed }]);
    setPharmacyNotes("");
    setWarnings("");
    setRefillCount(0);
  };

  const openNew = () => { resetForm(); setEditOpen(true); };

  const openEdit = (t: Template) => {
    setEditId(t.id);
    setName(t.name);
    setCondition(t.condition || "");
    setDiagnosis(t.diagnosis || "");
    setMedications(t.medications?.length ? t.medications : [{ ...emptyMed }]);
    setPharmacyNotes(t.pharmacy_notes || "");
    setWarnings(t.warnings || "");
    setRefillCount(t.refill_count || 0);
    setEditOpen(true);
  };

  const updateMed = (idx: number, field: keyof Medication, value: string) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ variant: "destructive", title: "Template name is required" }); return; }
    if (medications.every(m => !m.name.trim())) { toast({ variant: "destructive", title: "Add at least one medication" }); return; }

    setSaving(true);
    const payload = {
      doctor_id: user.id,
      name: name.trim(),
      condition: condition || null,
      diagnosis: diagnosis || null,
      medications: medications.filter(m => m.name.trim()),
      pharmacy_notes: pharmacyNotes || null,
      warnings: warnings || null,
      refill_count: refillCount,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("prescription_templates" as any).update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("prescription_templates" as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editId ? "Template updated" : "Template created" });
      setEditOpen(false);
      resetForm();
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("prescription_templates" as any).delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else { toast({ title: "Template deleted" }); fetchTemplates(); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <BookTemplate className="h-5 w-5 text-primary" /> Prescription Templates
          </CardTitle>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Save frequently prescribed medication sets as reusable templates.</p>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <BookTemplate className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p>No templates yet</p>
            <p className="text-sm">Create your first template to speed up prescriptions</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map(t => (
              <Card key={t.id} className="border-border/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{t.name}</h3>
                      {t.condition && <p className="text-xs text-muted-foreground">{t.condition}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {t.diagnosis && <p className="text-xs text-muted-foreground">Dx: {t.diagnosis}</p>}
                  <div className="space-y-1">
                    {t.medications.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">{m.name}</span>
                        {m.dosage && <span className="text-muted-foreground">• {m.dosage}</span>}
                        {m.frequency && <span className="text-muted-foreground">• {m.frequency}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">
                    {t.medications.length} medication{t.medications.length !== 1 ? "s" : ""}
                    {t.refill_count > 0 && ` • ${t.refill_count} refills`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit/Create Dialog */}
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookTemplate className="h-5 w-5 text-primary" />
                {editId ? "Edit Template" : "New Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Template Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hypertension Standard" />
                </div>
                <div className="space-y-1.5">
                  <Label>Condition</Label>
                  <Input value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. Upper respiratory infection" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Default Diagnosis</Label>
                <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Pre-fill diagnosis text..." rows={2} />
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Medications</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMedications(prev => [...prev, { ...emptyMed }])} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                {medications.map((med, idx) => (
                  <Card key={idx} className="border-border/50">
                    <CardContent className="pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Med {idx + 1}</span>
                        {medications.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setMedications(prev => prev.filter((_, i) => i !== idx))} className="h-6 w-6 p-0 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Name *</Label>
                          <Input value={med.name} onChange={e => updateMed(idx, "name", e.target.value)} placeholder="Amoxicillin" />
                        </div>
                        <div>
                          <Label className="text-xs">Dosage</Label>
                          <Input value={med.dosage} onChange={e => updateMed(idx, "dosage", e.target.value)} placeholder="500mg" />
                        </div>
                        <div>
                          <Label className="text-xs">Frequency</Label>
                          <Input value={med.frequency} onChange={e => updateMed(idx, "frequency", e.target.value)} placeholder="3x daily" />
                        </div>
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Input value={med.duration} onChange={e => updateMed(idx, "duration", e.target.value)} placeholder="7 days" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Instructions</Label>
                        <Input value={med.instructions} onChange={e => updateMed(idx, "instructions", e.target.value)} placeholder="Take with food" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Default Pharmacy Notes</Label>
                <Textarea value={pharmacyNotes} onChange={e => setPharmacyNotes(e.target.value)} placeholder="Notes for pharmacist..." rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Default Warnings</Label>
                <Textarea value={warnings} onChange={e => setWarnings(e.target.value)} placeholder="Warnings..." rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Default Refill Count</Label>
                <Input type="number" min={0} value={refillCount} onChange={e => setRefillCount(parseInt(e.target.value) || 0)} />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editId ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PrescriptionTemplates;
