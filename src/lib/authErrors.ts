// Maps raw Supabase auth errors to friendly user-facing messages.
export function friendlyAuthError(message?: string | null): string {
  if (!message) return "Something went wrong. Please try again.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "An account with this email already exists. Please sign in instead.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("expired") || m.includes("otp_expired"))
    return "This link has expired. Please request a new one.";
  if (m.includes("access_denied") || m.includes("invalid") || m.includes("not found"))
    return "This link is invalid or has already been used. Please request a new one.";
  if (m.includes("password")) return message; // password validation messages are usually fine
  if (m.includes("network")) return "Network error. Please check your connection and try again.";
  return "Something went wrong. Please try again.";
}

// Parses the URL hash (e.g. #error=...&error_code=otp_expired) returned by Supabase auth redirects.
export function parseAuthHashError(): { error: string; code?: string } | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const error = params.get("error") || params.get("error_code");
  if (!error) return null;
  return {
    error: params.get("error_description")?.replace(/\+/g, " ") || error,
    code: params.get("error_code") || undefined,
  };
}
