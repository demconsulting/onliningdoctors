import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { practiceRegistrationSchema, practiceRegistrationDetails } from "@/lib/practiceRegistration";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { usePractice } from "@/hooks/usePractice";
import type { User } from "@supabase/supabase-js";

const MAX_PHOTOS = 4;

const PracticeSetup = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isVerifiedDoctor, setIsVerifiedDoctor] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { practice, loading: practiceLoading, refresh } = usePractice(user?.id);

  const [form, setForm] = useState({
    practice_name: "",
    practice_number: "",
    bhf_number: "",
    owner_doctor_name: "",
    owner_hpcsa_number: "",
    email: "",
    phone: "",
    address: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    is_medical_aid_practice: true,
  });
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      const { data: doctor } = await supabase
        .from("doctors").select("is_verified, license_number, bhf_number, physical_practice_address").eq("profile_id", session.user.id).maybeSingle();
      setIsVerifiedDoctor(!!doctor?.is_verified);
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", session.user.id).maybeSingle();
      setForm((f) => ({
        ...f,
        owner_doctor_name: profile?.full_name || session.user.user_metadata?.full_name || "",
        email: session.user.email || "",
        owner_hpcsa_number: doctor?.license_number || "",
        bhf_number: doctor?.bhf_number || "",
        address: doctor?.physical_practice_address || "",
      }));
      setChecking(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (practice) navigate("/practice/settings", { replace: true });
  }, [practice, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = practiceRegistrationSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Please check the form");
      return;
    }
    setSubmitting(true);
    const d = practiceRegistrationDetails(parsed.data);

    // Upload verification photos first (auto-compressed to fit size limits)
    const photoUrls: string[] = [];
    try {
      const { uploadFile } = await import("@/lib/fileUpload");
      for (const file of photos.slice(0, MAX_PHOTOS)) {
        const { path } = await uploadFile({
          bucket: "practice-photos",
          path: `${user.id}/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`,
          file,
          profile: "practice_photo",
        });
        photoUrls.push(path);
      }
    } catch (err: any) {
      setSubmitting(false);
      toast.error(`Photo upload failed: ${err.message}`);
      return;
    }

    const { error } = await supabase.from("practices").insert([{
      ...d,
      owner_id: user.id,
      photo_urls: photoUrls,
    }]);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Practice created");
    await refresh();
    navigate("/practice/settings");
  };

  if (checking || practiceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVerifiedDoctor) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container mx-auto flex-1 px-4 py-12">
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Verified doctors only</CardTitle>
              <CardDescription>Only verified doctors can register a practice. Please complete your doctor verification first.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-8">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="font-display">Register your practice</CardTitle>
                <CardDescription>Solo practice registration · Medical aid details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {([
                ["practice_name", "Practice name"],
                ["practice_number", "Practice number"],
                ["bhf_number", "BHF number (optional — add later for medical aid claims)"],
                ["owner_doctor_name", "Owner doctor name"],
                ["owner_hpcsa_number", "Owner HPCSA number"],
                ["email", "Email"],
                ["phone", "Phone number"],
                ["bank_name", "Bank name"],
                ["account_name", "Account holder name"],
                ["account_number", "Account number"],
              ] as const).map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <Label htmlFor={k}>{label}</Label>
                  <Input
                    id={k}
                    type={k === "email" ? "email" : "text"}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    required={k !== "bhf_number"}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <Switch id="medical-aid-registration" checked={form.is_medical_aid_practice} onCheckedChange={(checked) => setForm({ ...form, is_medical_aid_practice: checked })} />
                  <Label htmlFor="medical-aid-registration">Medical aid practice</Label>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="photos">Verification photos (up to {MAX_PHOTOS})</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
                    setPhotos(files);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Photos of the practice or registration documents help admins verify your practice faster.
                </p>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((f) => (
                      <img
                        key={f.name + f.size}
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create practice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PracticeSetup;
