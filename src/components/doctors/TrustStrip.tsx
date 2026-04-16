import { ShieldCheck, Video, BadgeCheck, HeartPulse } from "lucide-react";

const items = [
  { icon: BadgeCheck, label: "Licensed Doctors" },
  { icon: Video, label: "Secure Video Consultations" },
  { icon: HeartPulse, label: "Affordable Pricing" },
  { icon: ShieldCheck, label: "Non-Emergency Care Only" },
];

const TrustStrip = () => (
  <section className="border-b border-border bg-card/50">
    <div className="container mx-auto px-4 py-4">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <item.icon className="h-4.5 w-4.5 text-secondary" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustStrip;
