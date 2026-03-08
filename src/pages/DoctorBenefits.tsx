import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Stethoscope, ArrowRight, Clock, Wallet, ShieldCheck,
  Globe, BarChart3, CalendarCheck, Video, Users, Headphones,
} from "lucide-react";

const benefits = [
  {
    icon: CalendarCheck,
    title: "Flexible Scheduling",
    description: "Set your own hours and availability. Work from anywhere — your home, office, or while travelling. Full control over your calendar.",
  },
  {
    icon: Wallet,
    title: "Instant Payments",
    description: "Get paid directly after every consultation. No delays, no middlemen. Transparent fee structure with competitive platform rates.",
  },
  {
    icon: Globe,
    title: "Reach More Patients",
    description: "Expand beyond geographic limits. Connect with patients across South Africa and internationally — grow your practice without overheads.",
  },
  {
    icon: Video,
    title: "HD Video Consultations",
    description: "Crystal-clear video calls with built-in consultation notes, prescription tools, and document sharing — all in one seamless interface.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & Trusted",
    description: "Our verification process builds patient trust. Your credentials, license, and qualifications are validated and prominently displayed.",
  },
  {
    icon: BarChart3,
    title: "Practice Analytics",
    description: "Track consultations, earnings, patient satisfaction, and reviews with a comprehensive dashboard built for modern practitioners.",
  },
  {
    icon: Clock,
    title: "Reduce No-Shows",
    description: "Automated reminders and easy rescheduling mean fewer missed appointments. Patients pay upfront, protecting your time.",
  },
  {
    icon: Users,
    title: "Build Your Reputation",
    description: "Collect verified patient reviews that boost your profile visibility. Higher-rated doctors get more bookings organically.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "Our team is here to help with onboarding, technical issues, and growing your practice. Priority support for all registered doctors.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45 },
  }),
};

const DoctorBenefits = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-24 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            className="mx-auto max-w-3xl space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Stethoscope className="h-4 w-4" />
              For Healthcare Professionals
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Grow Your Practice, <br className="hidden sm:block" />
              <span className="text-primary">On Your Terms</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Join a platform built for doctors. Set your schedule, see patients online, get paid instantly — and focus on what matters most: patient care.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="gap-2 gradient-primary border-0 text-primary-foreground group"
                onClick={() => navigate("/signup/doctor")}
              >
                Register Now
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-card shadow-sm"
                onClick={() => navigate("/login")}
              >
                Already registered? Sign in
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-14 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">
              Why Doctors Choose Us
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to run a modern, efficient telehealth practice.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="h-full border-border/60 bg-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {b.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {b.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div
            className="mx-auto max-w-2xl text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl font-bold text-foreground">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground">
              Registration takes less than 5 minutes. Once verified, you can start seeing patients immediately.
            </p>
            <Button
              size="lg"
              className="gap-2 gradient-primary border-0 text-primary-foreground group"
              onClick={() => navigate("/signup/doctor")}
            >
              <Stethoscope className="h-4 w-4" />
              Register as a Doctor
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DoctorBenefits;
