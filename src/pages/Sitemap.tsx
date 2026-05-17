import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { Loader2 } from "lucide-react";

interface DoctorEntry {
  profile_id: string;
  full_name: string | null;
  specialty?: { name: string | null } | null;
}

const sections: { heading: string; links: { to: string; label: string; desc?: string }[] }[] = [
  {
    heading: "Main",
    links: [
      { to: "/", label: "Home", desc: "Platform overview and how it works" },
      { to: "/doctors", label: "Find Doctors", desc: "Browse licensed doctors and book consultations" },
      { to: "/wellness-plus", label: "Wellness+", desc: "Membership benefits and pricing" },
      { to: "/about", label: "About", desc: "Our mission and team" },
      { to: "/contact", label: "Contact", desc: "Get in touch with support" },
    ],
  },
  {
    heading: "For doctors",
    links: [
      { to: "/doctor-benefits", label: "For Doctors", desc: "Why join Doctors Onlining" },
      { to: "/signup/doctor", label: "Doctor sign up", desc: "Apply to join the platform" },
    ],
  },
  {
    heading: "Account",
    links: [
      { to: "/login", label: "Log in" },
      { to: "/signup", label: "Sign up" },
      { to: "/forgot-password", label: "Forgot password" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

const Sitemap = () => {
  const [doctors, setDoctors] = useState<DoctorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("public_doctors" as any)
        .select("profile_id, full_name, specialty:specialty_id(name)")
        .order("full_name", { ascending: true });
      if (data) setDoctors(data as any);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Sitemap | Doctors Onlining"
        description="Complete sitemap of Doctors Onlining: main pages, doctor profiles, account, and legal pages."
        path="/sitemap.html"
      />
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Sitemap</h1>
          <p className="mt-2 text-muted-foreground">
            A complete index of public pages on Doctors Onlining.
          </p>
        </header>

        <div className="grid gap-10 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-4 text-xl font-semibold text-foreground">{section.heading}</h2>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="font-medium text-primary hover:underline">
                      {link.label}
                    </Link>
                    {link.desc && (
                      <p className="text-sm text-muted-foreground">{link.desc}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Doctor profiles</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verified doctors are listed yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <li key={d.profile_id}>
                  <Link
                    to={`/doctors/${d.profile_id}`}
                    className="text-primary hover:underline"
                  >
                    {d.full_name || "Doctor"}
                  </Link>
                  {d.specialty?.name && (
                    <span className="ml-1 text-sm text-muted-foreground">
                      — {d.specialty.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-12 text-sm text-muted-foreground">
          Looking for the machine-readable version? See{" "}
          <a href="/sitemap.xml" className="text-primary hover:underline">/sitemap.xml</a>.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Sitemap;
