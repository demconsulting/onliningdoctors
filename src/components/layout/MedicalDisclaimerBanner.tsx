import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "disclaimer_dismissed";

const MedicalDisclaimerBanner = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(STORAGE_KEY);
    setDismissed(!!wasDismissed);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-destructive/10 border-b border-destructive/20">
      <div className="container mx-auto px-4 py-3 pr-12">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Doctors Onlining</span> is a video consultation platform for{" "}
            <span className="font-semibold">non-emergency medical consultations only</span>.
            If you are experiencing a medical emergency, please call{" "}
            <a href="tel:10177" className="font-bold text-destructive underline">10177</a>{" "}
            (Ambulance Services) or go to your nearest emergency facility immediately.
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label="Dismiss disclaimer"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MedicalDisclaimerBanner;
