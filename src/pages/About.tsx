import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Heart, Users, Award, Shield } from "lucide-react";
import Seo from "@/components/seo/Seo";

const About = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="About Doctors Onlining | Trusted Video Consultations"
        description="Learn about Doctors Onlining, a secure video consultation platform connecting patients with qualified doctors for non-emergency medical care."
        path="/about"
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-hero py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
              About Doctors Onlining<span className="text-primary">.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              A video consultation platform connecting patients with qualified doctors for non-emergency care — anytime, anywhere.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl space-y-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-3">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Doctors Onlining is a video consultation platform that connects patients with qualified doctors for non-emergency medical care. We make it simple to book appointments, share medical documents, and conduct secure video consultations — all from the comfort of your home.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  { icon: Heart, title: "Patient-First", desc: "Every feature is designed with patient comfort and convenience in mind." },
                  { icon: Users, title: "Qualified Doctors", desc: "We partner with verified, qualified physicians across multiple specialties." },
                  { icon: Award, title: "Quality Care", desc: "Our review system ensures accountability and continuous improvement." },
                  { icon: Shield, title: "Privacy & Security", desc: "Your medical data is encrypted and protected with enterprise-grade security." },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-3">Our Team</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We are a passionate team of healthcare professionals, engineers, and designers united by a common goal: making non-emergency healthcare accessible to everyone through secure, convenient video consultations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
