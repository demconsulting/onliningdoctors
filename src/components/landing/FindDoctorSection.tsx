import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";

const FindDoctorSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find Your Doctor
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse our verified doctors, filter by specialty, location, and rating to find the perfect match.
          </p>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/doctors")}
          >
            <Search className="w-4 h-4" />
            View All Doctors
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FindDoctorSection;
