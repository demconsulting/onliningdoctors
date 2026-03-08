import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Stethoscope, ArrowRight, LogIn } from "lucide-react";
import { motion } from "framer-motion";

const DoctorCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 gradient-hero">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Are You a Doctor?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join our platform and reach thousands of patients seeking quality healthcare. Expand your practice with flexible online consultations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 gradient-primary border-0 text-primary-foreground group"
              onClick={() => navigate("/signup/doctor")}
            >
              <Stethoscope className="w-4 h-4" />
              Register as a Doctor
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-card font-semibold shadow-sm"
              onClick={() => navigate("/login")}
            >
              <LogIn className="w-4 h-4" />
              Sign in as Doctor
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DoctorCTASection;
