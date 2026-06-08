// Referral capture utilities — stores the incoming referral code in localStorage
// during signup and attaches it to the user once authenticated.
import { supabase } from "@/integrations/supabase/client";

const KEY = "do_referral";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function storeReferralCode(code: string) {
  if (!code) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: code.toUpperCase(), ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function readReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.code || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return String(parsed.code);
  } catch {
    return null;
  }
}

export function clearReferralCode() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

function deviceFingerprint(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const parts = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      tz,
    ].join("|");
    // tiny non-crypto hash
    let h = 0;
    for (let i = 0; i < parts.length; i++) h = (h * 31 + parts.charCodeAt(i)) | 0;
    return `fp_${(h >>> 0).toString(36)}`;
  } catch {
    return "fp_unknown";
  }
}

/** Call after successful signup/sign-in to attach a referral if one is pending. */
export async function attachPendingReferral(): Promise<void> {
  const code = readReferralCode();
  if (!code) return;
  try {
    await supabase.rpc("attach_referral_on_signup", {
      _code: code,
      _ip: null,
      _ua: navigator.userAgent.slice(0, 500),
      _fp: deviceFingerprint(),
    });
  } catch (e) {
    console.warn("attach referral failed", e);
  } finally {
    clearReferralCode();
  }
}

export function buildReferralLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/ref/${encodeURIComponent(code)}`;
}
