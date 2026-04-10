import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";

const CONSENT_VERSION = "1.0";

const NON_EMERGENCY_TEXT =
  "I confirm that I am seeking care for a non-emergency condition. I understand that Doctors Onlining does not provide emergency medical services and that in case of an emergency I must call 10177 or visit a healthcare facility immediately.";

const TELEMEDICINE_TEXT =
  "I consent to receiving healthcare services via telemedicine, including the electronic sharing of my health information, in accordance with South African healthcare regulations.";

interface ConsentCheckboxesProps {
  userId: string;
  onConsentGiven: (granted: boolean) => void;
}

const ConsentCheckboxes = ({ userId, onConsentGiven }: ConsentCheckboxesProps) => {
  const [nonEmergency, setNonEmergency] = useState(false);
  const [telemedicine, setTelemedicine] = useState(false);
  const [alreadyConsented, setAlreadyConsented] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user already has valid consent for this version
  useEffect(() => {
    supabase
      .from("patient_consents")
      .select("id")
      .eq("user_id", userId)
      .eq("consent_version", CONSENT_VERSION)
      .eq("consent_type", "non_emergency_acknowledgement")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAlreadyConsented(true);
          onConsentGiven(true);
        }
        setLoading(false);
      });
  }, [userId, onConsentGiven]);

  useEffect(() => {
    if (!alreadyConsented) {
      onConsentGiven(nonEmergency && telemedicine);
    }
  }, [nonEmergency, telemedicine, alreadyConsented, onConsentGiven]);

  const storeConsent = async () => {
    // Get IP address (best effort)
    let ipAddress: string | null = null;
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      ipAddress = data.ip;
    } catch {}

    const consents = [
      {
        user_id: userId,
        consent_type: "non_emergency_acknowledgement",
        consent_version: CONSENT_VERSION,
        consent_text: NON_EMERGENCY_TEXT,
        ip_address: ipAddress,
      },
      {
        user_id: userId,
        consent_type: "telemedicine_consent",
        consent_version: CONSENT_VERSION,
        consent_text: TELEMEDICINE_TEXT,
        ip_address: ipAddress,
      },
    ];

    await supabase.from("patient_consents").insert(consents);
  };

  // Expose storeConsent method
  useEffect(() => {
    if (nonEmergency && telemedicine && !alreadyConsented) {
      // Store will be called when booking proceeds
      (window as any).__storePatientConsent = storeConsent;
    }
    return () => {
      delete (window as any).__storePatientConsent;
    };
  }, [nonEmergency, telemedicine, alreadyConsented]);

  if (loading) return null;
  if (alreadyConsented) return null;

  return (
    <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Required Consent
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="non-emergency"
          checked={nonEmergency}
          onCheckedChange={(v) => setNonEmergency(!!v)}
        />
        <Label htmlFor="non-emergency" className="text-sm leading-relaxed text-muted-foreground cursor-pointer">
          {NON_EMERGENCY_TEXT}
        </Label>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="telemedicine"
          checked={telemedicine}
          onCheckedChange={(v) => setTelemedicine(!!v)}
        />
        <Label htmlFor="telemedicine" className="text-sm leading-relaxed text-muted-foreground cursor-pointer">
          {TELEMEDICINE_TEXT}{" "}
          See our{" "}
          <Link to="/privacy" className="text-primary underline" target="_blank">Privacy Policy</Link>{" "}
          and{" "}
          <Link to="/terms" className="text-primary underline" target="_blank">Terms & Conditions</Link>.
        </Label>
      </div>
    </div>
  );
};

export default ConsentCheckboxes;
