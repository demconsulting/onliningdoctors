import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Stethoscope, ArrowRight, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface DoctorCTAContent { heading: string; subheading: string; register_text: string; login_text: string; }

const fallback: DoctorCTAContent = {
  heading: "Are You a Doctor?",
  subheading: "Join Doctors Onlining and reach thousands of patients seeking non-emergency medical care. Expand your practice with flexible video consultations.",
  register_text: "Register as a Doctor",
  login_text: "Sign in as Doctor",
};

const DoctorCTASection = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<DoctorCTAContent>(fallback);

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "doctor_cta").maybeSingle().then(({ data }) => {
      if (data?.value) setContent(data.value as unknown as DoctorCTAContent);
    });
  }, []);

  return (
    <section id="for-doctors" className="py-20 gradient-hero">
      <div className="container mx-auto px-4">
        <motion.div className="max-w-3xl mx-auto text-center space-y-6" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">{content.heading}</h2>
          <p className="text-lg text-muted-foreground">{content.subheading}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 gradient-primary border-0 text-primary-foreground group" onClick={() => navigate("/signup/doctor")}>
              <Stethoscope className="w-4 h-4" />
              {content.register_text}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-card font-semibold shadow-sm" onClick={() => navigate("/login")}>
              <LogIn className="w-4 h-4" />
              {content.login_text}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DoctorCTASection;
