import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Sparkles, Lock, Handshake, Zap } from "lucide-react";
import { format } from "date-fns";

interface Props {
  doctor: {
    is_founding_doctor?: boolean;
    founding_doctor_since?: string | null;
    founding_expiry?: string | null;
  };
  plan?: { platform_fee_percent?: number; name?: string } | null;
}

const FoundingBenefitsCard = ({ doctor, plan }: Props) => {
  if (!doctor?.is_founding_doctor) return null;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <CardHeader className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-2.5 text-primary-foreground shadow-md">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-display">Your Founding Benefits</CardTitle>
              <p className="text-sm text-muted-foreground">
                {doctor.founding_doctor_since
                  ? `Member since ${format(new Date(doctor.founding_doctor_since), "MMM yyyy")}`
                  : "Lifetime founding member"}
              </p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 px-3 py-1 text-xs font-semibold tracking-wide">
            FOUNDING DOCTOR 2026
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="relative grid gap-3 sm:grid-cols-2">
        <Benefit icon={Zap} title="Reduced Platform Fee"
          desc={plan?.platform_fee_percent != null
            ? `${plan.platform_fee_percent}% commission (vs standard 15%)`
            : "Exclusive low commission rate"} />
        <Benefit icon={Sparkles} title="Premium Features Included" desc="All advanced tools at no extra cost" />
        <Benefit icon={Lock} title="Locked-In Pricing" desc={doctor.founding_expiry ? `Until ${format(new Date(doctor.founding_expiry), "MMM yyyy")}` : "Protected for life"} />
        <Benefit icon={Handshake} title="Partnership Status" desc="Direct line to product & priority support" />
        <Benefit icon={Shield} title="Early Adopter" desc="First access to every new feature" />
        <Benefit icon={Crown} title="Founding Recognition" desc="Featured placement in doctor directory" />
      </CardContent>
    </Card>
  );
};

const Benefit = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-3 backdrop-blur">
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export default FoundingBenefitsCard;
