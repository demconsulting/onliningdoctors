import { useState } from "react";
import logoSrc from "@/assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Loader2, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { getCountries } from "@/data/locations";

const DoctorSignup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [country, setCountry] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim()) {
      toast({ variant: "destructive", title: "License number is required" });
      return;
    }
    if (!country) {
      toast({ variant: "destructive", title: "Country of operation is required" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          signup_as_doctor: "true",
          license_number: licenseNumber,
          title,
          country,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Sign up failed", description: error.message });
    } else {
      toast({
        title: "Application submitted!",
        description: "Check your email to confirm, then an admin will verify your account.",
      });
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <img src={logoSrc} alt="Doctors Onlining" className="mx-auto mb-3 h-14 w-auto select-none" />
            <CardTitle className="font-display text-2xl">Register as a Doctor</CardTitle>
            <CardDescription>Submit your credentials for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Dr. Jane Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
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
                <Label htmlFor="license">License / Certificate Number</Label>
                <Input id="license" placeholder="e.g. MED-2024-12345" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
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
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Your account will be reviewed by an admin before you can start accepting patients. You'll be notified once verified.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5" />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="font-medium text-primary hover:underline">Terms &amp; Conditions</Link>
                  {" "}and{" "}
                  <Link to="/privacy" target="_blank" className="font-medium text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground" disabled={loading || !acceptedTerms || !country}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Not a doctor?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">Sign up as a patient</Link>
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DoctorSignup;
