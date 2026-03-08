import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, Video, Stethoscope, Star } from "lucide-react";
import { motion, useInView } from "framer-motion";

const iconMap: Record<string, React.ElementType> = { UserCheck, Video, Stethoscope, Star };

interface HeroStat {
  id: string;
  label: string;
  value: string;
  icon: string | null;
  sort_order: number | null;
}

/** Parse "10,000+" → { num: 10000, prefix: "", suffix: "+" } */
function parseStatValue(raw: string) {
  const match = raw.match(/^([^\d]*)(\d[\d,.]*)(.*)$/);
  if (!match) return { num: 0, prefix: raw, suffix: "" };
  return {
    prefix: match[1],
    num: parseFloat(match[2].replace(/,/g, "")),
    suffix: match[3],
  };
}

function formatNum(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

const AnimatedCounter = ({ value }: { value: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const { num, prefix, suffix } = parseStatValue(value);
  const [display, setDisplay] = useState("0");

  const animate = useCallback(() => {
    const duration = 1800;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(formatNum(eased * num));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [num]);

  useEffect(() => {
    if (isInView) animate();
  }, [isInView, animate]);

  return (
    <span ref={ref} className="font-display text-3xl font-extrabold text-foreground md:text-4xl">
      {prefix}{display}{suffix}
    </span>
  );
};

const StatsSection = () => {
  const [stats, setStats] = useState<HeroStat[]>([]);

  useEffect(() => {
    supabase.from("hero_stats").select("*").order("sort_order").then(({ data }) => {
      if (data) setStats(data);
    });
  }, []);

  if (!stats.length) return null;

  return (
    <section className="border-y border-border bg-card py-14">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon ? iconMap[stat.icon] : null;
            return (
              <motion.div
                key={stat.id}
                className="flex flex-col items-center gap-2 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
              >
                {Icon && (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <AnimatedCounter value={stat.value} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
