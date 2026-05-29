// Client-side state for admin impersonation.
// Uses sessionStorage so the impersonated session lasts only as long as the tab.

const BACKUP_KEY = "lovable.adminImpersonation.backup";
const ACTIVE_KEY = "lovable.adminImpersonation.active";

export interface AdminSessionBackup {
  access_token: string;
  refresh_token: string;
  admin_user_id: string;
  admin_name?: string | null;
  saved_at: string;
}

export interface ActiveImpersonation {
  log_id: string;
  target_user_id: string;
  target_name: string;
  target_email?: string;
  started_at: string;
}

const safeStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
};

export const getBackup = (): AdminSessionBackup | null => {
  const s = safeStorage(); if (!s) return null;
  const raw = s.getItem(BACKUP_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AdminSessionBackup; } catch { return null; }
};

export const setBackup = (b: AdminSessionBackup) => {
  const s = safeStorage(); if (!s) return;
  s.setItem(BACKUP_KEY, JSON.stringify(b));
};

export const clearBackup = () => {
  const s = safeStorage(); if (!s) return;
  s.removeItem(BACKUP_KEY);
};

export const getActive = (): ActiveImpersonation | null => {
  const s = safeStorage(); if (!s) return null;
  const raw = s.getItem(ACTIVE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as ActiveImpersonation; } catch { return null; }
};

export const setActive = (a: ActiveImpersonation) => {
  const s = safeStorage(); if (!s) return;
  s.setItem(ACTIVE_KEY, JSON.stringify(a));
  // Notify same-tab listeners (storage events only fire cross-tab).
  window.dispatchEvent(new Event("impersonation:changed"));
};

export const clearActive = () => {
  const s = safeStorage(); if (!s) return;
  s.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new Event("impersonation:changed"));
};
