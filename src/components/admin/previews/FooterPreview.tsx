import { Stethoscope, Shield, AlertCircle } from "lucide-react";

interface FooterContent {
  tagline: string; email: string; whatsapp: string; whatsapp_display: string;
  address: string; copyright: string; disclaimer_consultation: string; disclaimer_emergency: string;
}

const FooterPreview = ({ content }: { content: FooterContent }) => (
  <div className="rounded-lg border border-border bg-card text-[10px] overflow-hidden">
    <div className="border-b border-border bg-muted/50 p-3 space-y-1.5">
      <div className="flex gap-2 rounded bg-background p-2">
        <Shield className="h-3 w-3 flex-shrink-0 text-primary mt-0.5" />
        <p className="text-foreground">{content.disclaimer_consultation}</p>
      </div>
      <div className="flex gap-2 rounded bg-background p-2">
        <AlertCircle className="h-3 w-3 flex-shrink-0 text-destructive mt-0.5" />
        <p className="text-foreground"><span className="font-semibold">Not for emergencies:</span> {content.disclaimer_emergency}</p>
      </div>
    </div>
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="flex h-4 w-4 items-center justify-center rounded gradient-primary">
          <Stethoscope className="h-2.5 w-2.5 text-primary-foreground" />
        </div>
        <span className="font-display text-xs font-bold">Onlining Doctors</span>
      </div>
      <p className="text-muted-foreground mb-1">{content.tagline}</p>
      <p className="text-muted-foreground">Email: <span className="text-primary">{content.email}</span></p>
      <p className="text-muted-foreground">WhatsApp: <span className="text-primary">{content.whatsapp_display}</span></p>
    </div>
    <div className="border-t border-border bg-muted/30 p-2 text-center text-muted-foreground">
      <p>Physical Address: {content.address}</p>
      <p>© {new Date().getFullYear()} {content.copyright}</p>
    </div>
  </div>
);

export default FooterPreview;
