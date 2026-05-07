import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Salad, Activity, Bot, Sparkles, AlertCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MedicalDisclaimerBanner from "@/components/layout/MedicalDisclaimerBanner";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Footer = lazy(() => import("@/components/layout/Footer"));

const previews = [
  {
    icon: Salad,
    emoji: "🥗",
    title: "Nutrition Guidance",
    description: "Healthy eating tips and meal guidance.",
  },
  {
    icon: Activity,
    emoji: "🏃",
    title: "Exercise Visuals",
    description: "Simple guided exercises for daily wellness.",
  },
  {
    icon: Bot,
    emoji: "🤖",
    title: "Health AI",
    description: "Smart wellness insights and health assistance.",
  },
];

const WellnessPlus = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Wellness+ | Doctors Onlining"
        description="Wellness+ brings nutrition guidance, guided exercises, and health AI to Doctors Onlining. Coming soon."
        path="/wellness-plus"
      />
      <MedicalDisclaimerBanner />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Coming soon
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Wellness+</h1>
              <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                Healthy living guidance, nutrition tips, exercises, and wellness tools — coming soon.
              </p>
            </div>
          </div>
        </section>

        {/* Preview cards */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {previews.map((p) => (
              <Card key={p.title} className="relative overflow-hidden transition-shadow hover:shadow-lg">
                <Badge variant="secondary" className="absolute right-3 top-3">Coming soon</Badge>
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    <span aria-hidden="true">{p.emoji}</span>
                  </div>
                  <CardTitle className="text-xl">{p.title}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Doctor conversion */}
        <section className="bg-muted/40">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Want personalised health guidance?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Consult a qualified doctor for a personalised wellness and lifestyle plan.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link to="/doctors">Book Consultation</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="container mx-auto px-4 pb-16">
          <div className="mx-auto flex max-w-3xl gap-3 rounded-lg border border-border bg-background p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              This section will provide general wellness guidance only and is not a substitute for professional medical advice.
            </p>
          </div>
        </section>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default WellnessPlus;
