import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CONSENT_SHARE_TEXT =
  "I consent to share my medical records, consultation notes and prescriptions with the family account holder who invited me. I understand I can revoke this from my own account at any time.";

const DependentInvite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [dependent, setDependent] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shareConsent, setShareConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setLoading(false); return; }
      const { data } = await supabase
        .from("dependents")
        .select("id, full_name, email, invitation_status, guardian_id")
        .eq("invitation_token", token)
        .maybeSingle();
      setDependent(data);
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!dependent) return;
    if (password.length < 8) { toast({ variant: "destructive", title: "Password must be at least 8 characters" }); return; }
    if (password !== confirm) { toast({ variant: "destructive", title: "Passwords do not match" }); return; }

    setSubmitting(true);
    try {
      // Sign up with the dependent's email
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email: dependent.email,
        password,
        options: {
          data: { full_name: dependent.full_name },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      // If the email already exists, ask user to sign in to link
      if (signErr && !/registered/i.test(signErr.message)) {
        throw signErr;
      }

      // Try to sign in (works whether new or existing)
      const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
        email: dependent.email,
        password,
      });
      if (signInErr) throw signInErr;
      const userId = signIn.user.id;

      // Link dependent to user, mark accepted
      const consentTimestamp = new Date().toISOString();
      const { error: linkErr } = await supabase
        .from("dependents")
        .update({
          linked_user_id: userId,
          invitation_status: "accepted",
          consent_accepted_at: shareConsent ? consentTimestamp : null,
          consent_version: shareConsent ? "1.0" : null,
          invitation_token: null,
        })
        .eq("id", dependent.id);
      if (linkErr) throw linkErr;

      // Record consents
      await supabase.from("dependent_consents").insert([
        {
          dependent_id: dependent.id,
          user_id: userId,
          consent_type: "adult_invitation_accepted",
          consent_text: "I accept the invitation to link my account to this family group.",
          consent_version: "1.0",
        },
        ...(shareConsent ? [{
          dependent_id: dependent.id,
          user_id: userId,
          consent_type: "adult_share_records",
          consent_text: CONSENT_SHARE_TEXT,
          consent_version: "1.0",
        }] : []),
      ]);

      toast({ title: "Invitation accepted", description: "Welcome to Doctors Onlining" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not accept invitation", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-10">
        <div className="mx-auto max-w-md">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !dependent ? (
            <Card>
              <CardHeader><CardTitle>Invitation not found</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This invitation link is invalid or has already been used.</p>
              </CardContent>
            </Card>
          ) : dependent.invitation_status === "accepted" ? (
            <Card>
              <CardHeader><CardTitle>Already accepted</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">This invitation has already been used. Please sign in.</p>
                <Button onClick={() => navigate("/login")} className="w-full">Go to Login</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <Users className="h-5 w-5 text-primary" /> Accept Family Invitation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You've been invited to create a Doctors Onlining account linked to your family group. Set your password below.
                </p>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={dependent.email} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm password</Label>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <div className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Checkbox id="share" checked={shareConsent} onCheckedChange={(v) => setShareConsent(!!v)} className="mt-0.5" />
                  <Label htmlFor="share" className="cursor-pointer text-sm font-normal leading-snug">
                    {CONSENT_SHARE_TEXT}
                  </Label>
                </div>
                <Button onClick={handleAccept} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Accept & create account
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DependentInvite;
