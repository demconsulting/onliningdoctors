import { Video, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DoctorsHeroProps {
  onTalkNow: () => void;
  onBookScheduled: () => void;
}

const DoctorsHero = ({ onTalkNow, onBookScheduled }: DoctorsHeroProps) => (
  <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-accent/30 to-primary/5 py-16 md:py-20">
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
    <div className="container relative mx-auto px-4 text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
        <Video className="h-4 w-4" />
        Video Consultations Available 24/7
      </div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
        Consult a Doctor via Video —{" "}
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Available Now
        </span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground md:text-xl">
        Connect with licensed doctors for fast, secure, non-emergency medical care anywhere in South Africa.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" className="gradient-primary border-0 text-primary-foreground gap-2 px-8 text-base shadow-lg shadow-primary/20" onClick={onTalkNow}>
          <Video className="h-5 w-5" />
          Talk to a Doctor Now
        </Button>
        <Button size="lg" variant="outline" className="gap-2 px-8 text-base" onClick={onBookScheduled}>
          <Calendar className="h-5 w-5" />
          Book a Scheduled Consultation
        </Button>
      </div>
    </div>
  </section>
);

export default DoctorsHero;
