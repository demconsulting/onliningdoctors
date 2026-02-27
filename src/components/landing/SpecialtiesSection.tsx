import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import {
  Stethoscope, Heart, Scan, Baby, Bone, Brain, BrainCircuit,
  Eye, Ear, HeartPulse, Activity, Pill
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Stethoscope, Heart, Scan, Baby, Bone, Brain, BrainCircuit,
  Eye, Ear, HeartPulse, Activity, Pill,
};

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

const SpecialtiesSection = () => {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  useEffect(() => {
    supabase.from("specialties").select("*").then(({ data }) => {
      if (data) setSpecialties(data);
    });
  }, []);

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground">Browse by Specialty</h2>
          <p className="text-muted-foreground">Find the right specialist for your needs</p>
        </div>
        <Carousel
          opts={{ align: "center", loop: true }}
          plugins={[Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: true })]}
          className="mx-auto w-full max-w-5xl"
        >
          <CarouselContent className="-ml-3">
            {specialties.map((s, i) => {
              const Icon = s.icon ? iconMap[s.icon] : Stethoscope;
              return (
                <CarouselItem key={s.id} className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/doctors?specialty=${s.id}`}>
                      <Card className="group cursor-pointer border-border transition-all hover:border-primary hover:shadow-md">
                        <CardContent className="flex flex-col items-center gap-3 p-5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary/10">
                            {Icon && <Icon className="h-6 w-6 text-primary" />}
                          </div>
                          <span className="text-center text-sm font-medium text-foreground">{s.name}</span>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
};

export default SpecialtiesSection;
