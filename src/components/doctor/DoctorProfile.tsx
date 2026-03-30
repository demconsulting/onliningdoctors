import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Stethoscope, Upload, FileCheck, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import LocationSelect from "@/components/shared/LocationSelect";
import TagInput from "@/components/shared/TagInput";
import AvatarUpload from "@/components/shared/AvatarUpload";
import DoctorBilling from "@/components/doctor/DoctorBilling";

interface DoctorProfileProps {
  user: User;
}

const COMMON_LANGUAGES = [
  "English", "French", "Arabic", "Swahili", "Portuguese", "Zulu",
  "Afrikaans", "Yoruba", "Hausa", "Amharic", "Igbo", "Xhosa",
  "Sotho", "Tswana", "Shona", "Spanish", "Mandarin", "Hindi"
];

const EDUCATION_SUGGESTIONS = [
  "MBChB", "MBBS", "MD", "DO", "PhD", "MMed",
  "FCS (SA)", "FCOG (SA)", "FCP (SA)", "DCH", "Dip Allergy (SA)",
  "MPH", "MSc Medicine", "Fellowship"
];

const DoctorProfile = ({ user }: DoctorProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
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
    practice_name: "",
    practice_email: "",
    practice_phone: "",
    practice_logo_url: "",
  });
  const [licenseDocPath, setLicenseDocPath] = useState<string | null>(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingPracticeLogo, setUploadingPracticeLogo] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const practiceLogoRef = useRef<HTMLInputElement>(null);
  const [practiceLogoSignedUrl, setPracticeLogoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [profileRes, doctorRes, specRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("doctors").select("*").eq("profile_id", user.id).single(),
        supabase.from("specialties").select("*"),
      ]);

      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url || null);
        setProfile({
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
          date_of_birth: profileRes.data.date_of_birth || "",
          gender: profileRes.data.gender || "",
          address: profileRes.data.address || "",
          city: profileRes.data.city || "",
          state: (profileRes.data as any).state || "",
          country: profileRes.data.country || "",
        });
      }

      if (doctorRes.data) {
        const d = doctorRes.data as any;
        setDoctor({
          title: d.title || "",
          bio: d.bio || "",
          specialty_id: d.specialty_id || "",
          education: d.education || "",
          experience_years: d.experience_years || 0,
          hospital_affiliation: d.hospital_affiliation || "",
          license_number: d.license_number || "",
          consultation_fee: d.consultation_fee || 0,
          languages: d.languages || [],
          is_available: d.is_available ?? true,
          practice_name: d.practice_name || "",
          practice_email: d.practice_email || "",
          practice_phone: d.practice_phone || "",
          practice_logo_url: d.practice_logo_url || "",
        });
        setLicenseDocPath(d.license_document_path || null);
        // Load signed URL for practice logo
        if (d.practice_logo_url) {
          const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(d.practice_logo_url, 3600);
          if (url) setPracticeLogoSignedUrl(url.signedUrl);
        }
      }

      if (specRes.data) setSpecialties(specRes.data);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);


  const handleSave = async () => {
    setSaving(true);

    const profilePayload = {
      ...profile,
      date_of_birth: profile.date_of_birth || null,
    };
    const [profileRes, doctorRes] = await Promise.all([
      supabase.from("profiles").update(profilePayload).eq("id", user.id),
      supabase.from("doctors").update({
        ...doctor,
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
          <div className="flex justify-center pb-2">
            <AvatarUpload
              userId={user.id}
              currentUrl={avatarUrl}
              fullName={profile.full_name}
              onUploaded={setAvatarUrl}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Select value={doctor.title} onValueChange={(v) => setDoctor({ ...doctor, title: v })}>
                <SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
                  <SelectItem value="Assoc. Prof.">Assoc. Prof.</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g. +27 81 234 5678" />
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
          <div className="grid gap-4 sm:grid-cols-3">
            <LocationSelect
              country={profile.country}
              state={profile.state}
              city={profile.city}
              onCountryChange={(v) => setProfile((prev) => ({ ...prev, country: v, state: "", city: "" }))}
              onStateChange={(v) => setProfile((prev) => ({ ...prev, state: v, city: "" }))}
              onCityChange={(v) => setProfile((prev) => ({ ...prev, city: v }))}
            />
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
              <Input value={doctor.license_number} onChange={(e) => setDoctor({ ...doctor, license_number: e.target.value })} placeholder="e.g. MP-0612345" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>License Document (PDF/Image)</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ variant: "destructive", title: "File too large", description: "Max 5MB" });
                      return;
                    }
                    setUploadingLicense(true);
                    const ext = file.name.split(".").pop();
                    const path = `${user.id}/license.${ext}`;
                    const { error } = await supabase.storage.from("doctor-licenses").upload(path, file, { upsert: true });
                    if (error) {
                      toast({ variant: "destructive", title: "Upload failed", description: error.message });
                    } else {
                      await supabase.from("doctors").update({ license_document_path: path } as any).eq("profile_id", user.id);
                      setLicenseDocPath(path);
                      toast({ title: "License document uploaded" });
                    }
                    setUploadingLicense(false);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => licenseInputRef.current?.click()}
                  disabled={uploadingLicense}
                >
                  {uploadingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {licenseDocPath ? "Replace" : "Upload"}
                </Button>
                {licenseDocPath && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <FileCheck className="h-4 w-4" /> Uploaded
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" min={0} value={doctor.experience_years} onChange={(e) => setDoctor({ ...doctor, experience_years: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Consultation Fee</Label>
              <Input type="number" min={0} value={doctor.consultation_fee} readOnly disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Auto-synced from your lowest active pricing tier. Update it in the Pricing tab.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Education / Qualifications</Label>
            <TagInput
              values={doctor.education ? doctor.education.split(",").map(s => s.trim()).filter(Boolean) : []}
              onChange={(vals) => setDoctor({ ...doctor, education: vals.join(", ") })}
              placeholder="Type or select qualifications..."
              suggestions={EDUCATION_SUGGESTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label>Hospital Affiliation</Label>
            <Input value={doctor.hospital_affiliation} onChange={(e) => setDoctor({ ...doctor, hospital_affiliation: e.target.value })} placeholder="e.g. Groote Schuur Hospital" />
          </div>
          <div className="space-y-2">
            <Label>Languages Spoken</Label>
            <TagInput
              values={doctor.languages}
              onChange={(vals) => setDoctor({ ...doctor, languages: vals })}
              placeholder="Type or select languages..."
              suggestions={COMMON_LANGUAGES}
            />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={doctor.bio} onChange={(e) => setDoctor({ ...doctor, bio: e.target.value })} rows={3} placeholder="Brief professional bio highlighting your experience and areas of focus..." />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>
      <DoctorBilling user={user} />
    </div>
  );
};

export default DoctorProfile;
