import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface DoctorProfileProps {
  user: User;
}

const DoctorProfile = ({ user }: DoctorProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    country: "",
  });
  const [doctor, setDoctor] = useState({
    title: "",
    bio: "",
    specialty_id: "",
    education: "",
    experience_years: 0,
    hospital_affiliation: "",
    license_number: "",
    consultation_fee: 0,
    languages: [] as string[],
    is_available: true,
  });
  const [languagesInput, setLanguagesInput] = useState("");

  useEffect(() => {
    const load = async () => {
      const [profileRes, doctorRes, specRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("doctors").select("*").eq("profile_id", user.id).single(),
        supabase.from("specialties").select("*"),
      ]);

      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
          date_of_birth: profileRes.data.date_of_birth || "",
          gender: profileRes.data.gender || "",
          address: profileRes.data.address || "",
          city: profileRes.data.city || "",
          country: profileRes.data.country || "",
        });
      }

      if (doctorRes.data) {
        setDoctor({
          title: doctorRes.data.title || "",
          bio: doctorRes.data.bio || "",
          specialty_id: doctorRes.data.specialty_id || "",
          education: doctorRes.data.education || "",
          experience_years: doctorRes.data.experience_years || 0,
          hospital_affiliation: doctorRes.data.hospital_affiliation || "",
          license_number: doctorRes.data.license_number || "",
          consultation_fee: doctorRes.data.consultation_fee || 0,
          languages: doctorRes.data.languages || [],
          is_available: doctorRes.data.is_available ?? true,
        });
        setLanguagesInput((doctorRes.data.languages || []).join(", "));
      }

      if (specRes.data) setSpecialties(specRes.data);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true);
    const langs = languagesInput.split(",").map(l => l.trim()).filter(Boolean);

    const [profileRes, doctorRes] = await Promise.all([
      supabase.from("profiles").update(profile).eq("id", user.id),
      supabase.from("doctors").update({
        ...doctor,
        languages: langs,
      }).eq("profile_id", user.id),
    ]);

    setSaving(false);
    if (profileRes.error || doctorRes.error) {
      toast({ variant: "destructive", title: "Error saving", description: (profileRes.error || doctorRes.error)?.message });
    } else {
      toast({ title: "Profile updated successfully" });
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Stethoscope className="h-5 w-5 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Title (e.g. Dr., Prof.)</Label>
              <Input value={doctor.title} onChange={(e) => setDoctor({ ...doctor, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Select value={doctor.specialty_id} onValueChange={(v) => setDoctor({ ...doctor, specialty_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose specialty" /></SelectTrigger>
                <SelectContent>
                  {specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input value={doctor.license_number} onChange={(e) => setDoctor({ ...doctor, license_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" min={0} value={doctor.experience_years} onChange={(e) => setDoctor({ ...doctor, experience_years: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Consultation Fee ($)</Label>
              <Input type="number" min={0} value={doctor.consultation_fee} onChange={(e) => setDoctor({ ...doctor, consultation_fee: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Education</Label>
            <Input value={doctor.education} onChange={(e) => setDoctor({ ...doctor, education: e.target.value })} placeholder="e.g. MD, Harvard Medical School" />
          </div>
          <div className="space-y-2">
            <Label>Hospital Affiliation</Label>
            <Input value={doctor.hospital_affiliation} onChange={(e) => setDoctor({ ...doctor, hospital_affiliation: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Languages (comma-separated)</Label>
            <Input value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} placeholder="English, French, Arabic" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={doctor.bio} onChange={(e) => setDoctor({ ...doctor, bio: e.target.value })} rows={3} placeholder="Brief professional bio..." />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;
