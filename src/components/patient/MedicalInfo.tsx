import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, HeartPulse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import SuggestionChips from "@/components/shared/SuggestionChips";

interface MedicalInfoProps {
  user: User;
}

const COMMON_ALLERGIES = [
  "Penicillin", "Aspirin", "Ibuprofen", "Sulfa drugs", "Latex",
  "Peanuts", "Shellfish", "Dairy", "Eggs", "Pollen", "Dust mites", "None"
];

const COMMON_CONDITIONS = [
  "Hypertension", "Diabetes Type 2", "Diabetes Type 1", "Asthma",
  "High Cholesterol", "Heart Disease", "Arthritis", "Depression",
  "Anxiety", "Thyroid Disorder", "COPD", "Epilepsy", "HIV/AIDS", "None"
];

const COMMON_MEDICATIONS = [
  "Metformin", "Amlodipine", "Lisinopril", "Atorvastatin", "Omeprazole",
  "Paracetamol", "Ibuprofen", "Amoxicillin", "Metoprolol", "Hydrochlorothiazide",
  "Insulin", "Salbutamol Inhaler", "None"
];

const MedicalInfo = ({ user }: MedicalInfoProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const { toast } = useToast();
  const [info, setInfo] = useState({
    blood_type: "",
    allergies: "",
    chronic_conditions: "",
    current_medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    height_cm: "",
    weight_kg: "",
  });

  useEffect(() => {
    supabase
      .from("patient_medical_info")
      .select("*")
      .eq("patient_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExists(true);
          setInfo({
            blood_type: data.blood_type || "",
            allergies: data.allergies || "",
            chronic_conditions: data.chronic_conditions || "",
            current_medications: data.current_medications || "",
            emergency_contact_name: data.emergency_contact_name || "",
            emergency_contact_phone: data.emergency_contact_phone || "",
            height_cm: data.height_cm?.toString() || "",
            weight_kg: data.weight_kg?.toString() || "",
          });
        }
        setLoading(false);
      });
  }, [user.id]);

  const toggleChipInField = (field: "allergies" | "chronic_conditions" | "current_medications", chip: string) => {
    const current = info[field]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = current.some((c) => c.toLowerCase() === chip.toLowerCase());
    let updated: string[];
    if (chip === "None") {
      updated = exists ? [] : ["None"];
    } else {
      updated = exists
        ? current.filter((c) => c.toLowerCase() !== chip.toLowerCase())
        : [...current.filter((c) => c.toLowerCase() !== "none"), chip];
    }
    setInfo({ ...info, [field]: updated.join(", ") });
  };

  const getActiveValues = (field: "allergies" | "chronic_conditions" | "current_medications") =>
    info[field].split(",").map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      patient_id: user.id,
      blood_type: info.blood_type || null,
      allergies: info.allergies || null,
      chronic_conditions: info.chronic_conditions || null,
      current_medications: info.current_medications || null,
      emergency_contact_name: info.emergency_contact_name || null,
      emergency_contact_phone: info.emergency_contact_phone || null,
      height_cm: info.height_cm ? parseFloat(info.height_cm) : null,
      weight_kg: info.weight_kg ? parseFloat(info.weight_kg) : null,
    };

    const { error } = exists
      ? await supabase.from("patient_medical_info").update(payload).eq("patient_id", user.id)
      : await supabase.from("patient_medical_info").insert(payload);

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setExists(true);
      toast({ title: "Medical info saved" });
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <HeartPulse className="h-5 w-5 text-primary" /> Medical Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Blood Type</Label>
            <Select value={info.blood_type} onValueChange={(v) => setInfo({ ...info, blood_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Height (cm)</Label>
            <Input type="number" value={info.height_cm} onChange={(e) => setInfo({ ...info, height_cm: e.target.value })} placeholder="e.g. 170" />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" value={info.weight_kg} onChange={(e) => setInfo({ ...info, weight_kg: e.target.value })} placeholder="e.g. 70" />
          </div>
          <div className="space-y-2">
            <Label>BMI</Label>
            {(() => {
              const h = parseFloat(info.height_cm);
              const w = parseFloat(info.weight_kg);
              if (!h || !w || h <= 0) return <p className="text-sm text-muted-foreground pt-2">Enter height & weight</p>;
              const bmi = w / ((h / 100) ** 2);
              const rounded = bmi.toFixed(1);
              let category = "";
              let colorClass = "text-muted-foreground";
              if (bmi < 18.5) { category = "Underweight"; colorClass = "text-amber-500"; }
              else if (bmi < 25) { category = "Normal"; colorClass = "text-green-600"; }
              else if (bmi < 30) { category = "Overweight"; colorClass = "text-amber-500"; }
              else { category = "Obese"; colorClass = "text-destructive"; }
              return (
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-lg font-semibold">{rounded}</span>
                  <span className={`text-sm font-medium ${colorClass}`}>{category}</span>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Allergies</Label>
          <SuggestionChips
            suggestions={COMMON_ALLERGIES}
            onSelect={(v) => toggleChipInField("allergies", v)}
            activeValues={getActiveValues("allergies")}
            label="Tap to select common allergies"
          />
          <Textarea value={info.allergies} onChange={(e) => setInfo({ ...info, allergies: e.target.value })} rows={2} placeholder="Or type your own..." />
        </div>
        <div className="space-y-2">
          <Label>Chronic Conditions</Label>
          <SuggestionChips
            suggestions={COMMON_CONDITIONS}
            onSelect={(v) => toggleChipInField("chronic_conditions", v)}
            activeValues={getActiveValues("chronic_conditions")}
            label="Tap to select common conditions"
          />
          <Textarea value={info.chronic_conditions} onChange={(e) => setInfo({ ...info, chronic_conditions: e.target.value })} rows={2} placeholder="Or type your own..." />
        </div>
        <div className="space-y-2">
          <Label>Current Medications</Label>
          <SuggestionChips
            suggestions={COMMON_MEDICATIONS}
            onSelect={(v) => toggleChipInField("current_medications", v)}
            activeValues={getActiveValues("current_medications")}
            label="Tap to select common medications"
          />
          <Textarea value={info.current_medications} onChange={(e) => setInfo({ ...info, current_medications: e.target.value })} rows={2} placeholder="Or type your own with dosages..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Emergency Contact Name</Label>
            <Input value={info.emergency_contact_name} onChange={(e) => setInfo({ ...info, emergency_contact_name: e.target.value })} placeholder="e.g. John Smith" />
          </div>
          <div className="space-y-2">
            <Label>Emergency Contact Phone</Label>
            <Input value={info.emergency_contact_phone} onChange={(e) => setInfo({ ...info, emergency_contact_phone: e.target.value })} placeholder="e.g. +27 81 234 5678" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Medical Info
        </Button>
      </CardContent>
    </Card>
  );
};

export default MedicalInfo;
