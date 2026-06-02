import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Stethoscope, Upload, FileCheck, Building2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import LocationSelect from "@/components/shared/LocationSelect";
import TagInput from "@/components/shared/TagInput";
import AvatarUpload from "@/components/shared/AvatarUpload";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePractice } from "@/hooks/usePractice";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import PrescriptionSettings from "@/components/doctor/PrescriptionSettings";

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

const REVIEW_FIELDS = new Set([
  "full_name",
  "license_number",
  "specialty_id",
  "education",
  "license_document_path",
  "id_document_path",
]);

const DoctorProfile = ({ user }: DoctorProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { practice, loading: practiceLoading } = usePractice(user.id);
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
    accepted_payment_method: "both" as "medical_aid_only" | "card_only" | "both",
  });
  const [originalReview, setOriginalReview] = useState<Record<string, any>>({});
  const [pendingReviewFields, setPendingReviewFields] = useState<Set<string>>(new Set());
  const [licenseDocPath, setLicenseDocPath] = useState<string | null>(null);
  const [idDocPath, setIdDocPath] = useState<string | null>(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingPracticeLogo, setUploadingPracticeLogo] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const practiceLogoRef = useRef<HTMLInputElement>(null);
  const [practiceLogoSignedUrl, setPracticeLogoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {

      const [profileRes, doctorRes, specRes, pendingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("doctors").select("*").eq("profile_id", user.id).single(),
        supabase.from("specialties").select("*"),
        supabase.from("doctor_profile_changes" as any).select("field_name").eq("doctor_id", user.id).eq("status", "pending"),
      ]);

      const origReview: Record<string, any> = {};

      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url || null);
        const p = profileRes.data;
        setProfile({
          full_name: p.full_name || "",
          phone: p.phone || "",
          date_of_birth: p.date_of_birth || "",
          gender: p.gender || "",
          address: p.address || "",
          city: p.city || "",
          state: (p as any).state || "",
          country: p.country || "",
        });
        origReview.full_name = p.full_name || "";
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
          accepted_payment_method: (d.accepted_payment_method as any) || "both",
        });
        setLicenseDocPath(d.license_document_path || null);
        setIdDocPath((d as any).id_document_path || null);
        origReview.license_number = d.license_number || "";
        origReview.specialty_id = d.specialty_id || "";
        origReview.education = d.education || "";
        origReview.license_document_path = d.license_document_path || "";
        origReview.id_document_path = (d as any).id_document_path || "";
        if (d.practice_logo_url) {
          const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(d.practice_logo_url, 3600);
          if (url) setPracticeLogoSignedUrl(url.signedUrl);
        }
      }

      setOriginalReview(origReview);
      setPendingReviewFields(new Set(((pendingRes.data as any) || []).map((r: any) => r.field_name)));

      if (specRes.data) setSpecialties(specRes.data);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);


  // Submit a single field as a pending change (review-required fields)
  const submitReviewChange = async (field: string, oldValue: any, newValue: any) => {
    // Delete any existing pending request for this field then insert fresh
    await supabase
      .from("doctor_profile_changes" as any)
      .delete()
      .eq("doctor_id", user.id)
      .eq("field_name", field)
      .eq("status", "pending");
    const { error } = await supabase.from("doctor_profile_changes" as any).insert({
      doctor_id: user.id,
      field_name: field,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    });
    return error;
  };

  const handleSave = async () => {
    // Required advanced details — admin verification requires these
    const missing: string[] = [];
    if (!profile.country) missing.push("Country");
    if (!profile.city) missing.push("City");
    if (!doctor.education?.trim()) missing.push("Education / Qualifications");
    if (!doctor.languages || doctor.languages.length === 0) missing.push("Languages");
    if (!doctor.bio?.trim()) missing.push("Bio");
    if (!doctor.experience_years || doctor.experience_years <= 0) missing.push("Years of Experience");
    if (!licenseDocPath) missing.push("HPCSA Document");
    if (!idDocPath) missing.push("ID Copy");
    if (missing.length > 0) {
      toast({
        variant: "destructive",
        title: "Advanced details required",
        description: `Please complete: ${missing.join(", ")}.`,
      });
      return;
    }

    setSaving(true);

    // Build review-field changes (only when changed vs original)
    const reviewChanges: Array<{ field: string; oldV: any; newV: any }> = [];
    const newReviewSnapshot: Record<string, any> = {
      full_name: profile.full_name || "",
      license_number: doctor.license_number || "",
      specialty_id: doctor.specialty_id || "",
      education: doctor.education || "",
    };
    for (const f of Object.keys(newReviewSnapshot)) {
      if ((newReviewSnapshot[f] || "") !== (originalReview[f] || "")) {
        reviewChanges.push({ field: f, oldV: originalReview[f] ?? "", newV: newReviewSnapshot[f] });
      }
    }

    // Auto-approved payloads (strip review fields and consultation_fee)
    const { full_name: _fn, ...autoProfile } = profile;
    const profilePayload = { ...autoProfile, date_of_birth: profile.date_of_birth || null };
    const {
      consultation_fee: _fee,
      license_number: _ln,
      specialty_id: _sid,
      education: _edu,
      ...autoDoctor
    } = doctor;

    const [profileRes, doctorRes] = await Promise.all([
      supabase.from("profiles").update(profilePayload).eq("id", user.id),
      supabase.from("doctors").update(autoDoctor as any).eq("profile_id", user.id),
    ]);

    let reviewError: any = null;
    for (const c of reviewChanges) {
      const err = await submitReviewChange(c.field, c.oldV, c.newV);
      if (err) reviewError = err;
    }

    setSaving(false);
    if (profileRes.error || doctorRes.error || reviewError) {
      toast({
        variant: "destructive",
        title: "Error saving",
        description: (profileRes.error || doctorRes.error || reviewError)?.message,
      });
      return;
    }

    if (reviewChanges.length > 0) {
      setPendingReviewFields(prev => {
        const next = new Set(prev);
        reviewChanges.forEach(c => next.add(c.field));
        return next;
      });
      toast({
        title: "Profile updated",
        description: `${reviewChanges.length} regulated change(s) submitted for admin review.`,
      });
    } else {
      toast({ title: "Profile updated successfully" });
    }
  };


  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Essentials — minimum to receive bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Stethoscope className="h-5 w-5 text-primary" /> Essentials
          </CardTitle>
          <p className="text-sm text-muted-foreground">The basics patients see when they find you. Everything else is optional.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center pb-2">
            <AvatarUpload userId={user.id} currentUrl={avatarUrl} fullName={profile.full_name} onUploaded={setAvatarUrl} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email (registered)</Label>
              <Input value={user.email || ""} readOnly disabled className="bg-muted" />
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
              <Label>Specialty</Label>
              <Select value={doctor.specialty_id} onValueChange={(v) => setDoctor({ ...doctor, specialty_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose specialty" /></SelectTrigger>
                <SelectContent>
                  {specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>HPCSA Registration Number</Label>
              <Input
                value={doctor.license_number}
                onChange={(e) => setDoctor({ ...doctor, license_number: e.target.value })}
                placeholder="e.g. MP-0612345"
              />
              <p className="text-xs text-muted-foreground">
                This number is verified with the Health Professions Council of South Africa (HPCSA).
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <Label>Accepted Payment Methods</Label>
            <Select
              value={doctor.accepted_payment_method}
              onValueChange={(v) => setDoctor({ ...doctor, accepted_payment_method: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both — Medical Aid & Card Payments</SelectItem>
                <SelectItem value="medical_aid_only">Medical Aid only</SelectItem>
                <SelectItem value="card_only">Card Payments only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Patients will only see the payment options you accept when booking with you.
            </p>
          </div>


          <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Advanced details — REQUIRED for verification */}
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between p-6 text-left">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  Advanced details <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Required</span>
                </h3>
                <p className="text-sm text-muted-foreground">Bio, qualifications, languages, location, ID copy and HPCSA document. All required for verification.</p>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input type="number" min={0} value={doctor.experience_years} onChange={(e) => setDoctor({ ...doctor, experience_years: Number(e.target.value) })} />
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
              <div className="space-y-2">
                <Label>ID Copy (PDF/Image) <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG · Max 5MB. Clear copy of your national ID or passport.</p>
                <div className="flex items-center gap-3">
                  <input
                    ref={idInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const { validateFile, uploadFile } = await import("@/lib/fileUpload");
                      const v = validateFile(file, "doctor_id");
                      if (!v.ok) {
                        toast({ variant: "destructive", title: "Invalid file", description: v.message });
                        return;
                      }
                      setUploadingId(true);
                      try {
                        const ext = file.name.split(".").pop();
                        const { path } = await uploadFile({
                          bucket: "doctor-licenses",
                          path: `${user.id}/id.${ext}`,
                          file,
                          profile: "doctor_id",
                          onOptimizing: () => toast({ title: "Optimising image before upload..." }),
                        });
                        if (!idDocPath) {
                          await supabase.from("doctors").update({ id_document_path: path } as any).eq("profile_id", user.id);
                          setIdDocPath(path);
                          toast({ title: "ID copy uploaded" });
                        } else {
                          const err = await submitReviewChange("id_document_path", idDocPath, path);
                          if (err) throw err;
                          setPendingReviewFields(prev => new Set(prev).add("id_document_path"));
                          toast({ title: "Submitted for review", description: "Your new ID document is pending admin approval." });
                        }
                      } catch (err: any) {
                        toast({ variant: "destructive", title: "Upload failed", description: err.message });
                      }
                      setUploadingId(false);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => idInputRef.current?.click()} disabled={uploadingId}>
                    {uploadingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {idDocPath ? "Replace" : "Upload"}
                  </Button>
                  {idDocPath && <span className="flex items-center gap-1 text-sm text-green-600"><FileCheck className="h-4 w-4" /> Uploaded</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>HPCSA Document (PDF/Image) <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG · Max 5MB.</p>
                <div className="flex items-center gap-3">
                  <input
                    ref={licenseInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const { validateFile, uploadFile } = await import("@/lib/fileUpload");
                      const v = validateFile(file, "hpcsa");
                      if (!v.ok) {
                        toast({ variant: "destructive", title: "Invalid file", description: v.message });
                        return;
                      }
                      setUploadingLicense(true);
                      try {
                        const ext = file.name.split(".").pop();
                        const { path } = await uploadFile({
                          bucket: "doctor-licenses",
                          path: `${user.id}/license.${ext}`,
                          file,
                          profile: "hpcsa",
                          onOptimizing: () => toast({ title: "Optimising image before upload..." }),
                        });
                        if (!licenseDocPath) {
                          await supabase.from("doctors").update({ license_document_path: path } as any).eq("profile_id", user.id);
                          setLicenseDocPath(path);
                          toast({ title: "Document uploaded" });
                        } else {
                          const err = await submitReviewChange("license_document_path", licenseDocPath, path);
                          if (err) throw err;
                          setPendingReviewFields(prev => new Set(prev).add("license_document_path"));
                          toast({ title: "Submitted for review", description: "Your new HPCSA document is pending admin approval." });
                        }
                      } catch (err: any) {
                        toast({ variant: "destructive", title: "Upload failed", description: err.message });
                      }
                      setUploadingLicense(false);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => licenseInputRef.current?.click()} disabled={uploadingLicense}>
                    {uploadingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {licenseDocPath ? "Replace" : "Upload"}
                  </Button>
                  {licenseDocPath && <span className="flex items-center gap-1 text-sm text-green-600"><FileCheck className="h-4 w-4" /> Uploaded</span>}
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Advanced Details
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Prescription Settings */}
      <PrescriptionSettings user={user} />


      {/* Practice — optional, for clinics or multi-doctor practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Building2 className="h-5 w-5 text-primary" /> Register a Practice (Optional)
          </CardTitle>
          <p className="text-sm text-muted-foreground">For clinics and multi-doctor practices only. Solo doctors can skip this.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {practice ? (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">{practice.practice_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Practice #{practice.practice_number} · {practice.email} · {practice.phone}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => navigate("/practice/settings")}>
                  Edit practice details <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => navigate("/practice/team")}>
                  Manage team
                </Button>
              </div>
            </div>
          ) : !practiceLoading && (
            <div className="rounded-lg border border-dashed p-5 text-center space-y-3">
              <Building2 className="mx-auto h-8 w-8 text-primary" />
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Manage a clinic? Register a practice to power your prescription letterhead, billing entity, and team.
              </p>
              <Button type="button" variant="outline" onClick={() => navigate("/practice/setup")} className="gap-2">
                Register a Practice <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;
