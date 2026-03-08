import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FindDoctorContent { heading: string; subheading: string; button_text: string; }

const FindDoctorPreview = ({ content }: { content: FindDoctorContent }) => (
  <div className="rounded-lg bg-background p-6 text-center">
    <h2 className="font-display text-lg font-bold text-foreground mb-2">{content.heading}</h2>
    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">{content.subheading}</p>
    <Button size="sm" variant="outline" className="gap-1 text-xs">
      <Search className="w-3 h-3" />
      {content.button_text}
      <ArrowRight className="w-3 h-3" />
    </Button>
  </div>
);

export default FindDoctorPreview;
