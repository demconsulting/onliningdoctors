import { Stethoscope, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DoctorCTAContent { heading: string; subheading: string; register_text: string; login_text: string; }

const DoctorCTAPreview = ({ content }: { content: DoctorCTAContent }) => (
  <div className="rounded-lg gradient-hero p-6 text-center">
    <h2 className="font-display text-lg font-bold text-foreground mb-2">{content.heading}</h2>
    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">{content.subheading}</p>
    <div className="flex gap-2 justify-center">
      <Button size="sm" className="gap-1 gradient-primary border-0 text-primary-foreground text-xs">
        <Stethoscope className="w-3 h-3" />
        {content.register_text}
        <ArrowRight className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="outline" className="gap-1 bg-card text-xs">
        <LogIn className="w-3 h-3" />
        {content.login_text}
      </Button>
    </div>
  </div>
);

export default DoctorCTAPreview;
