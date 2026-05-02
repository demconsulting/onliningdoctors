import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Video, Clock, Star, Heart, Activity } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.webp";

const iconMap: Record<string, React.ElementType> = { Shield, Video, Clock, Star, Heart, Activity };

interface HeroFeature { icon: string; label: string; sub: string; }
interface HeroContent {
  badge: string; title: string; highlight: string; subtitle: string;
  cta_primary: string; cta_secondary: string; features: HeroFeature[];
}

const fallback: HeroContent = {
  badge: "Trusted Video Consultations",
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
    <section className="relative overflow-hidden min-h-[600px] lg:min-h-[700px]">
      <img
        src={heroBg}
        alt=""
        width={1920}
        height={1080}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-transparent" />
      <div className="container relative z-10 mx-auto flex min-h-[600px] items-center px-6 py-20 lg:min-h-[700px] lg:py-28">
        <div className="max-w-2xl text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mb-6 font-display text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl">
              {hero.title}{" "}
              <span className="text-gradient">{hero.highlight}</span>
            </h1>
            <p className="mb-8 max-w-lg text-base text-white/80 md:text-lg">{hero.subtitle}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 gradient-primary border-0 text-primary-foreground" onClick={() => navigate("/doctors")}>
                {hero.cta_primary} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/60 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/signup")}>
                {hero.cta_secondary}
              </Button>
            </div>
          </motion.div>

          {hero.features.length > 0 && (
            <motion.div
              className="mt-14 flex flex-wrap gap-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {hero.features.map((item) => {
                const Icon = iconMap[item.icon] || Video;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-white">{item.label}</span>
                      <span className="text-xs text-white/60">{item.sub}</span>
                    </div>
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
