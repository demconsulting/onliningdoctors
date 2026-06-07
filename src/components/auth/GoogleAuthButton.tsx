import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GoogleAuthButtonProps {
  /** Where to send the user after they finish onboarding (forwarded via ?redirect). */
  redirectTo?: string | null;
  /** When 'doctor', the auth callback will route a new account to /onboarding/doctor. */
  intent?: "patient" | "doctor";
  label?: string;
  disabled?: boolean;
}

const GoogleLogo = () => (
  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.2 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8L6 32.6C9.2 39 16 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

export const GoogleAuthButton = ({ redirectTo, intent = "patient", label = "Continue with Google", disabled }: GoogleAuthButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      // Remember intent so AuthCallback can route new doctor signups to onboarding.
      if (intent === "doctor") {
        localStorage.setItem("pending_doctor_signup", "1");
      } else {
        localStorage.removeItem("pending_doctor_signup");
      }

      const params = new URLSearchParams();
      if (redirectTo) params.set("redirect", redirectTo);
      const callback = `${window.location.origin}/auth/callback${params.toString() ? `?${params.toString()}` : ""}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback },
      });
      if (error) throw error;
      // Browser is being redirected — leave loading state on.
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Could not start Google sign-in. Please try again.";
      toast({ variant: "destructive", title: "Google sign-in failed", description: message });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading || disabled}
      className="w-full gap-2 border-border bg-background hover:bg-muted"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />}
      <span>{label}</span>
    </Button>
  );
};

export default GoogleAuthButton;
