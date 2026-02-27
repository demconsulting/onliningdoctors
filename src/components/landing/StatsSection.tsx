import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, Video, Stethoscope, Star } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = { UserCheck, Video, Stethoscope, Star };

interface HeroStat {
  id: string;
  label: string;
  value: string;
  icon: string | null;
  sort_order: number | null;
}

const StatsSection = () => {
  const [stats, setStats] = useState<HeroStat[]>([]);

  useEffect(() => {
    supabase.from("hero_stats").select("*").order("sort_order").then(({ data }) => {
      if (data) setStats(data);
    });
  }, []);

  if (!stats.length) return null;

  return (
    <section className="border-y border-border bg-card py-12">
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
                transition={{ delay: i * 0.1 }}
              >
                {Icon && <Icon className="h-6 w-6 text-primary" />}
                <span className="font-display text-3xl font-extrabold text-foreground">{stat.value}</span>
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
