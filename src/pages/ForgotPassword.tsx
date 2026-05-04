import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { friendlyAuthError } from "@/lib/authErrors";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't send reset link", description: friendlyAuthError(error.message) });
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <img src={logoSrc} alt="Doctors Onlining" className="mx-auto mb-3 h-14 w-auto select-none" />
            <CardTitle className="font-display text-2xl">Forgot your password?</CardTitle>
            <CardDescription>
              {sent
                ? "Check your inbox for a password reset link."
                : "Enter your email and we'll send you a link to reset it."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-center text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
                The link expires shortly, so use it soon.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                </Button>
              </form>
            )}
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/signin" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ForgotPassword;
