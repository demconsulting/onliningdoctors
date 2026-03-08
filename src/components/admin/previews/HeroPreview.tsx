import { Video, Shield, Clock, Star, Heart, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ElementType> = { Shield, Video, Clock, Star, Heart, Activity };

interface HeroFeature { icon: string; label: string; sub: string; }
interface HeroContent {
  badge: string; title: string; highlight: string; subtitle: string;
  cta_primary: string; cta_secondary: string; features: HeroFeature[];
}

const HeroPreview = ({ content }: { content: HeroContent }) => (
  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white">
    <div className="max-w-md">
      <h1 className="mb-3 font-display text-2xl font-extrabold tracking-tight">
        {content.title}{" "}
        <span className="text-primary">{content.highlight}</span>
      </h1>
      <p className="mb-5 text-sm text-white/70">{content.subtitle}</p>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1 gradient-primary border-0 text-primary-foreground text-xs">
          {content.cta_primary} <ArrowRight className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" className="border-white/40 bg-white/10 text-white text-xs hover:bg-white/20">
          {content.cta_secondary}
        </Button>
      </div>
      {content.features.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-4">
          {content.features.map((item, i) => {
            const Icon = iconMap[item.icon] || Video;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className="text-[10px] text-white/50">{item.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export default HeroPreview;
