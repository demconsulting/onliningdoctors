import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If a Supabase recovery link lands on any route other than /reset-password
// (e.g. Site URL fallback to "/"), redirect to /reset-password while preserving
// the hash so supabase-js can parse the recovery token there.
if (typeof window !== "undefined") {
  const hash = window.location.hash || "";
  const isRecovery = hash.includes("type=recovery");
  if (isRecovery && window.location.pathname !== "/reset-password") {
    window.location.replace(`/reset-password${window.location.search}${hash}`);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
