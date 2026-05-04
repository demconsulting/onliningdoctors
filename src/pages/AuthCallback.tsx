import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { friendlyAuthError, parseAuthHashError } from "@/lib/authErrors";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const hashErr = parseAuthHashError();
      const hash = window.location.hash;

      // Recovery links should always go to /reset-password
      if (hash.includes("type=recovery")) {
        navigate(`/reset-password${hash}`, { replace: true });
        return;
      }

      if (hashErr) {
        setError(friendlyAuthError(hashErr.error));
        return;
      }

      // Give Supabase a tick to parse the URL session
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        setError(friendlyAuthError(sessionErr.message));
        return;
      }

      const user = data.session?.user;
      if (!user) {
        // Email confirmation links typically land here without a session
        navigate("/email-confirmed", { replace: true });
        return;
      }

      // Authenticated — route to the right dashboard
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isDoctor = roles?.some((r) => r.role === "doctor");
      const isAdmin = roles?.some((r) => r.role === "admin");
      navigate(isAdmin ? "/admin" : isDoctor ? "/doctor-dashboard" : "/dashboard", { replace: true });
    };
    run();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        {error ? (
          <Card className="w-full max-w-md border-border">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-2xl">Link expired or invalid</CardTitle>
              <CardDescription>
                This link has expired or is invalid. Please request a new link.
              </CardDescription>
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
        ) : (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Signing you in…</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default AuthCallback;
