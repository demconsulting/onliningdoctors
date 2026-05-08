import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Apple, Dumbbell, HeartPulse, Leaf, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const features = [
  { icon: Apple, title: "Healthy eating plans", desc: "Personalised nutrition guidance for common conditions." },
  { icon: Dumbbell, title: "Exercise visuals", desc: "Simple movement routines patients can follow at home." },
  { icon: HeartPulse, title: "Wellness recommendations", desc: "Daily lifestyle nudges that complement your care plan." },
  { icon: Leaf, title: "Lifestyle support", desc: "Sleep, stress, and habit coaching for better outcomes." },
  { icon: ShieldCheck, title: "Preventative health", desc: "Screenings and check-up reminders that drive bookings." },
];

const DoctorWellnessPlus = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight">Wellness+</h2>
              <p className="mt-3 text-base text-muted-foreground">
                AI-powered wellness guidance — healthy eating, exercise visuals, lifestyle support and preventative health — built to complement your consultations and bring patients back.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Educational wellness guidance only. Always encourages patients to book a doctor consultation for medical advice.
              </p>
            </div>
            <Button
              size="lg"
              className="gradient-primary border-0 text-primary-foreground"
              onClick={() => toast({ title: "You're on the list", description: "We'll notify you when Wellness+ launches." })}
            >
              Join Early Access
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DoctorWellnessPlus;
