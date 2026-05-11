import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Stethoscope, ArrowRight, Clock, Wallet, ShieldCheck,
  Globe, BarChart3, CalendarCheck, Video, Users, Headphones, Crown, Lock, Sparkles,
} from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useFoundingSlots } from "@/hooks/useFoundingSlots";

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
  const { slots } = useFoundingSlots();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="For Doctors | Grow Your Practice with Doctors Onlining"
        description="Join Doctors Onlining to offer secure video consultations, manage your schedule, and grow your medical practice online across South Africa."
        path="/doctor-benefits"
      />
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

      {/* Founding 10 Doctors Program */}
      {slots && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-accent/15 p-8 md:p-12"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    <Crown className="h-3.5 w-3.5" /> Founding Doctor 2026
                  </span>
                  <h2 className="font-display text-3xl font-bold md:text-4xl">
                    Be one of our first <span className="text-primary">10 founding doctors</span>
                  </h2>
                  <p className="text-muted-foreground">
                    Exclusive locked-in early-adopter pricing, premium features, and a direct partnership with our team — for life.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Reduced commission</div>
                    <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Locked-in pricing</div>
                    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Premium features</div>
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <div className="rounded-xl border-2 border-primary/40 bg-card/80 p-6 backdrop-blur">
                    <p className="text-5xl font-bold text-primary">{slots.remaining}</p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">of {slots.max_slots} positions left</p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full gradient-primary border-0 text-primary-foreground"
                    onClick={() => navigate("/signup/doctor")}
                    disabled={!slots.applications_open && slots.remaining <= 0}
                  >
                    {slots.remaining <= 0 ? "Join the waitlist" : !slots.applications_open ? "Applications closed" : "Apply now"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

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
