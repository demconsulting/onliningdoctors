import { useEffect, useState } from "react";
import logoSrc from "@/assets/logo.png";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";

// Warm dashboard bundles in the background as soon as the login page mounts,
// so post-login navigation doesn't wait on a network round-trip for the chunk.
const prefetchDashboards = () => {
  import("./Dashboard");
  import("./DoctorDashboard");
  import("./AdminDashboard");
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const win = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof win.requestIdleCallback === "function") win.requestIdleCallback(prefetchDashboards);
    else setTimeout(prefetchDashboards, 300);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Sign in failed", description: friendlyAuthError(error.message) });
      return;
    }
    // Resolve role + admin status in parallel and route accordingly.
    const [{ data: roles }, { data: adminRoles }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin"),
    ]);
    setLoading(false);
    if (adminRoles && adminRoles.length > 0) { navigate("/admin"); return; }
    const isDoctor = roles?.some(r => r.role === "doctor");
    navigate(isDoctor ? "/doctor-dashboard" : "/dashboard");
  };

  const handleForgotPassword = () => navigate("/forgot-password");


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <img src={logoSrc} alt="Doctors Onlining" className="mx-auto mb-3 h-14 w-auto select-none" />
            <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
            <CardDescription>Log in to your Doctors Onlining account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={handleForgotPassword}>
                    Forgot password?
                  </button>
                </div>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
