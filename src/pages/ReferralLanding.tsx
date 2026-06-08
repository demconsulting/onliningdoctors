import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { storeReferralCode } from "@/lib/referral";
import { Loader2 } from "lucide-react";

const ReferralLanding = () => {
  const { code = "" } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
    if (!clean) {
      navigate("/", { replace: true });
      return;
    }
    storeReferralCode(clean);
    // Fire-and-forget click tracking
    supabase
      .from("referral_clicks")
      .insert({
        code: clean,
        user_agent: navigator.userAgent.slice(0, 500),
        referer: document.referrer || null,
      })
      .then(() => undefined, () => undefined);

    const isDoctor = search.get("as") === "doctor";
    const target = isDoctor
      ? `/signup/doctor?ref=${encodeURIComponent(clean)}`
      : `/signup?ref=${encodeURIComponent(clean)}`;
    navigate(target, { replace: true });
  }, [code, search, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default ReferralLanding;
