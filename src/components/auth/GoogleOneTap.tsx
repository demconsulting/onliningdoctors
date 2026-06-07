import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Public Google OAuth Web Client ID (safe to expose in frontend).
const GOOGLE_CLIENT_ID =
  "203467953970-7uinnp4qcmnthqrssdg3kqs3vu10eotq.apps.googleusercontent.com";

// Routes where One-Tap is allowed.
const ALLOWED_PATHS = new Set<string>([
  "/",
  "/login",
  "/signin",
  "/signup",
  "/signup/doctor",
  "/doctors",
]);

const DISMISS_KEY = "google_onetap_dismissed_at";
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google?: any;
    __googleOneTapInitialized?: boolean;
  }
}

const loadGsiScript = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.google?.accounts?.id) return resolve(true);
    const existing = document.getElementById("google-gsi-client") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.id = "google-gsi-client";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

const generateNonce = async (): Promise<[string, string]> => {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const rawStr = Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join("");
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawStr));
  const hashed = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, "0")).join("");
  return [rawStr, hashed];
};

export const GoogleOneTap = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const cancelledRef = useRef(false);

  // Track auth state
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setAuthed(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    // Gate by route
    if (!ALLOWED_PATHS.has(location.pathname)) return;
    if (location.pathname.startsWith("/admin")) return;
    // Authed users never see it
    if (authed !== false) return;

    // Recently dismissed?
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_WINDOW_MS) return;
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      const ok = await loadGsiScript();
      if (cancelled || cancelledRef.current) return;
      if (!ok || !window.google?.accounts?.id) return;

      try {
        const [rawNonce, hashedNonce] = await generateNonce();
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            try {
              const { error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
                nonce: rawNonce,
              });
              if (error) throw error;
              // Stay on current page so any in-progress booking intent is preserved.
              window.location.reload();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Google sign-in failed. Try the button instead.";
              toast({ variant: "destructive", title: "Google sign-in failed", description: message });
            }
          },
          nonce: hashedNonce,
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
          context: "signin",
          itp_support: true,
        });

        window.google.accounts.id.prompt((notification: any) => {
          try {
            if (
              notification?.isNotDisplayed?.() ||
              notification?.isSkippedMoment?.() ||
              notification?.isDismissedMoment?.()
            ) {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
            }
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* Silently fail; user can still use Continue with Google button */
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      try {
        window.google?.accounts?.id?.cancel?.();
      } catch {
        /* ignore */
      }
    };
  }, [authed, location.pathname, toast]);

  return null;
};

export default GoogleOneTap;
