import { Video, Calendar, Shield, Star, Heart, Activity, Clock, Stethoscope } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Video, Calendar, Shield, Star, Heart, Activity, Clock, Stethoscope };

interface Feature { icon: string; title: string; description: string; }
interface WhyChooseContent { heading: string; subheading: string; features: Feature[]; }

const WhyChoosePreview = ({ content }: { content: WhyChooseContent }) => (
  <div className="rounded-lg bg-secondary/5 p-6">
    <div className="text-center mb-4">
      <h2 className="font-display text-lg font-bold text-foreground mb-1">{content.heading}</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{content.subheading}</p>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {content.features.map((f, i) => {
        const Icon = iconMap[f.icon] || Video;
        return (
          <div key={i} className="bg-card p-3 rounded-lg border border-border">
            <div className="w-7 h-7 bg-primary/10 rounded flex items-center justify-center mb-2">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="font-display text-xs font-bold text-foreground mb-1">{f.title}</h3>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{f.description}</p>
          </div>
        );
      })}
    </div>
  </div>
);

export default WhyChoosePreview;
