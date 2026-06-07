import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { getCountries } from "@/data/locations";
import logoSrc from "@/assets/logo.png";

const DoctorOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("Dr.");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [country, setCountry] = useState("South Africa");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login", { replace: true });
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (roles?.some((r) => r.role === "doctor")) {
        navigate("/doctor-dashboard", { replace: true });
        return;
      }
      if (roles?.some((r) => ["admin", "super_admin", "platform_admin"].includes(r.role as string))) {
        navigate("/admin", { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim() || !country) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("complete_doctor_signup", {
      _license_number: licenseNumber.trim(),
      _title: title,
      _country: country,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not complete signup", description: error.message });
      return;
    }
    localStorage.removeItem("pending_doctor_signup");
    // Fire-and-forget welcome email
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      void supabase.functions
        .invoke("send-doctor-welcome-email", { body: { doctorProfileId: user.id } })
        .then(() => undefined, () => undefined);
      void Promise.resolve(
        supabase.rpc("log_audit_event_self", {
          _action: "google_doctor_registration",
          _table_name: "auth.users",
          _details: { provider: "google" },
        })
      ).then(() => undefined, () => undefined);
    }
    toast({ title: "Application submitted", description: "An admin will review your credentials shortly." });
    navigate("/doctor-dashboard", { replace: true });
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <img src={logoSrc} alt="Doctors Onlining" className="mx-auto mb-3 h-14 w-auto select-none" />
            <CardTitle className="font-display text-2xl">Complete your doctor profile</CardTitle>
            <CardDescription>We need a few details to verify your medical credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                    <SelectItem value="Assoc. Prof.">Assoc. Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">HPCSA Registration Number <span className="text-destructive">*</span></Label>
                <Input id="license" placeholder="e.g. MP-0612345" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country of Operation <span className="text-destructive">*</span></Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {getCountries().map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Your account will be reviewed by an admin before you can start accepting patients.
                </p>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DoctorOnboarding;
