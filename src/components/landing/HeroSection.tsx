import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Video, Clock, Star, Heart, Activity } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = { Shield, Video, Clock, Star, Heart, Activity };

interface HeroFeature { icon: string; label: string; sub: string; }
interface HeroContent {
  badge: string; title: string; highlight: string; subtitle: string;
  cta_primary: string; cta_secondary: string; features: HeroFeature[];
}

const fallback: HeroContent = {
  badge: "Trusted Online Healthcare",
  title: "Your Doctor,",
  highlight: "One Click Away",
  subtitle: "Connect with certified specialists via secure video consultations. Book appointments, share documents, and get care — all from home.",
  cta_primary: "Find a Doctor",
  cta_secondary: "Get Started Free",
  features: [
    { icon: "Video", label: "HD Video Calls", sub: "Crystal clear" },
    { icon: "Shield", label: "End-to-End Encrypted", sub: "Your data is safe" },
    { icon: "Clock", label: "24/7 Available", sub: "Anytime, anywhere" },
  ],
};

const HeroSection = () => {
  const navigate = useNavigate();
  const [hero, setHero] = useState<HeroContent>(fallback);

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "hero").single().then(({ data }) => {
      if (data?.value) setHero(data.value as unknown as HeroContent);
    });
  }, []);

  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="container mx-auto px-4 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-4 inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
              {hero.badge}
            </span>
            <h1 className="mb-6 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
              {hero.title}{" "}
              <span className="text-gradient">{hero.highlight}</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">{hero.subtitle}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 gradient-primary border-0 text-primary-foreground" onClick={() => navigate("/doctors")}>
                {hero.cta_primary} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/signup")}>
                {hero.cta_secondary}
              </Button>
            </div>
          </motion.div>

          {hero.features.length > 0 && (
            <motion.div
              className="mt-14 grid grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {hero.features.map((item) => {
                const Icon = iconMap[item.icon] || Video;
                return (
                  <div key={item.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.sub}</span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
