import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { friendlyAuthError, parseAuthHashError } from "@/lib/authErrors";

type Status = "checking" | "ready" | "invalid";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hashErr = parseAuthHashError();
    if (hashErr) {
      setLinkError(friendlyAuthError(hashErr.error));
      setStatus("invalid");
      return;
    }

    // Supabase emits PASSWORD_RECOVERY when the recovery link is parsed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && window.location.hash.includes("type=recovery"))) {
        setStatus("ready");
      }
    });

    // Fallback: if a session already exists or the hash includes recovery markers
    supabase.auth.getSession().then(({ data }) => {
      if (window.location.hash.includes("type=recovery") || data.session) {
        setStatus((s) => (s === "checking" ? "ready" : s));
      } else {
        // Give the listener a brief moment, then mark invalid
        setTimeout(() => {
          setStatus((s) => {
            if (s === "checking") {
              setLinkError("This link has expired or is invalid. Please request a new link.");
              return "invalid";
            }
            return s;
          });
        }, 800);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please re-enter both passwords." });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't update password", description: friendlyAuthError(error.message) });
      return;
    }
    toast({ title: "Password updated successfully", description: "You can now sign in." });
    await supabase.auth.signOut();
    navigate("/signin", { replace: true });
  };

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md border-border">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-2xl">Link expired or invalid</CardTitle>
              <CardDescription>{linkError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild className="w-full gradient-primary border-0 text-primary-foreground">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/signin">Back to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Set new password</CardTitle>
            <CardDescription>Choose a strong password you haven't used before.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ResetPassword;
