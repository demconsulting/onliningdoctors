import { useEffect, useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import { Link } from "react-router-dom";
import { Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GooglePlayBadge from "@/components/shared/GooglePlayBadge";

interface FooterContent {
  tagline: string;
  email: string;
  whatsapp: string;
  whatsapp_display: string;
  address: string;
  copyright: string;
  disclaimer_consultation: string;
  disclaimer_emergency: string;
}

const fallback: FooterContent = {
  tagline: "Making healthcare accessible, one consultation at a time.",
  email: "assist@doctorsonlining.com",
  whatsapp: "27605445802",
  whatsapp_display: "+27 60 544 5802",
  address: "61 Albatross Drive, Fourways, 2191, South Africa",
  copyright: "Doctors Onlining. All rights reserved.",
  disclaimer_consultation: "All consultations are conducted by independently licensed and registered healthcare professionals.",
  disclaimer_emergency: "This platform is not intended for medical emergencies. If you are experiencing a medical emergency, please call your local emergency services immediately.",
};

const Footer = () => {
  const [content, setContent] = useState<FooterContent>(fallback);
  const { branding, logoSrc } = useBranding();

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "footer").maybeSingle().then(({ data }) => {
      if (data?.value) setContent(data.value as unknown as FooterContent);
    });
  }, []);

  return (
    <footer className="border-t border-border bg-card">
      {/* Alert Banners */}
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 py-4 space-y-3">
          <div className="flex gap-3 rounded-lg bg-background p-4">
            <Shield className="h-5 w-5 flex-shrink-0 text-primary" />
            <p className="text-sm text-foreground">{content.disclaimer_consultation}</p>
          </div>
          <div className="flex gap-3 rounded-lg bg-background p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Not for emergencies:</span> {content.disclaimer_emergency}
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div>
            <Link to="/" className="mb-4 inline-flex items-center" aria-label="Doctors Onlining home">
              <img src={logoSrc} alt="Doctors Onlining" style={{ height: branding.footer_height }} className="w-auto select-none" loading="lazy" decoding="async" />
            </Link>
            <p className="mb-4 text-sm text-muted-foreground">{content.tagline}</p>
            <div className="space-y-2">
              <h5 className="font-semibold text-foreground">Contact Us</h5>
              <p className="text-sm text-muted-foreground">
                Email: <a href={`mailto:${content.email}`} className="text-primary hover:underline">{content.email}</a>
              </p>
              <p className="text-sm text-muted-foreground">
                WhatsApp: <a href={`https://wa.me/${content.whatsapp}`} className="text-primary hover:underline">{content.whatsapp_display}</a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-display font-semibold text-foreground">For Patients</h4>
            <div className="flex flex-col gap-2">
              <Link to="/doctors" className="text-sm text-muted-foreground hover:text-foreground">Find Doctors</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Us</Link>
              <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-display font-semibold text-foreground">For Doctors</h4>
            <div className="flex flex-col gap-2">
              <Link to="/doctor-benefits" className="text-sm text-muted-foreground hover:text-foreground">Benefits</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Support</Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-display font-semibold text-foreground">Legal & Company</h4>
            <div className="flex flex-col gap-2">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms & Conditions</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy (POPIA)</Link>
              <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Telemedicine Legal Notice */}
      <div className="border-t border-border bg-muted/40">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/70">
            Doctors Onlining is a video consultation platform and does not provide emergency medical care.
          </p>
          <p>
            In an emergency, call <a href="tel:10177" className="font-semibold text-destructive underline">10177</a> or visit your nearest hospital.
          </p>
          <p>All services are provided in accordance with applicable South African healthcare regulations.</p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-2">
          <p>Physical Address: {content.address}</p>
          <p>© {new Date().getFullYear()} {content.copyright}</p>
          <p className="pt-1 text-xs tracking-wide text-muted-foreground/70">
            Powered by <span className="font-medium text-foreground/70">OnliningHealth</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
