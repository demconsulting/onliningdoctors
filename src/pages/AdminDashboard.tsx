import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Loader2 } from "lucide-react";

// Map of section key -> dynamic import factory. Used to both lazy-mount and
// to prefetch the chunk on sidebar hover so clicks feel instant.
const loaders: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "users": () => import("@/components/admin/AdminUsers"),
  "appointments": () => import("@/components/admin/AdminAppointments"),
  "reviews": () => import("@/components/admin/AdminReviews"),
  "consultation-outcomes": () => import("@/components/admin/AdminConsultationOutcomes"),
  "specialties": () => import("@/components/admin/AdminSpecialties"),
  "contacts": () => import("@/components/admin/AdminContacts"),
  "faqs": () => import("@/components/admin/AdminFaqs"),
  "hero": () => import("@/components/admin/AdminHero"),
  "stats": () => import("@/components/admin/AdminStats"),
  "audit-logs": () => import("@/components/admin/AdminAuditLogs"),
  "doctor-verification": () => import("@/components/admin/AdminDoctorVerification"),
  "site-settings": () => import("@/components/admin/AdminSiteSettings"),
  "why-choose": () => import("@/components/admin/AdminWhyChoose"),
  "find-doctor": () => import("@/components/admin/AdminFindDoctor"),
  "doctor-cta": () => import("@/components/admin/AdminDoctorCTA"),
  "footer": () => import("@/components/admin/AdminFooter"),
  "branding": () => import("@/components/admin/AdminBranding"),
  "section-order": () => import("@/components/admin/AdminSectionOrder"),
  "payment-config": () => import("@/components/admin/AdminPaymentConfig"),
  "payments": () => import("@/components/admin/AdminPayments"),
  "payouts": () => import("@/components/admin/AdminPayouts"),
  "ai-assistant": () => import("@/components/admin/AdminAIAssistant"),
  "countries": () => import("@/components/admin/AdminCountries"),
  "legal-documents": () => import("@/components/admin/AdminLegalDocuments"),
  "consultation-categories": () => import("@/components/admin/AdminConsultationCategories"),
  "financial-settings": () => import("@/components/admin/AdminFinancialSettings"),
};

export const prefetchAdminSection = (key: string) => { loaders[key]?.(); };

const AdminUsers = lazy(loaders["users"]);
const AdminAppointments = lazy(loaders["appointments"]);
const AdminReviews = lazy(loaders["reviews"]);
const AdminConsultationOutcomes = lazy(loaders["consultation-outcomes"]);
const AdminSpecialties = lazy(loaders["specialties"]);
const AdminContacts = lazy(loaders["contacts"]);
const AdminFaqs = lazy(loaders["faqs"]);
const AdminHero = lazy(loaders["hero"]);
const AdminStats = lazy(loaders["stats"]);
const AdminAuditLogs = lazy(loaders["audit-logs"]);
const AdminDoctorVerification = lazy(loaders["doctor-verification"]);
const AdminSiteSettings = lazy(loaders["site-settings"]);
const AdminWhyChoose = lazy(loaders["why-choose"]);
const AdminFindDoctor = lazy(loaders["find-doctor"]);
const AdminDoctorCTA = lazy(loaders["doctor-cta"]);
const AdminFooter = lazy(loaders["footer"]);
const AdminBranding = lazy(loaders["branding"]);
const AdminSectionOrder = lazy(loaders["section-order"]);
const AdminPaymentConfig = lazy(loaders["payment-config"]);
const AdminPayments = lazy(loaders["payments"]);
const AdminPayouts = lazy(loaders["payouts"]);
const AdminAIAssistant = lazy(loaders["ai-assistant"]);
const AdminCountries = lazy(loaders["countries"]);
const AdminLegalDocuments = lazy(loaders["legal-documents"]);
const AdminConsultationCategories = lazy(loaders["consultation-categories"]);
const AdminFinancialSettings = lazy(loaders["financial-settings"]);

const SectionFallback = () => (
  <div className="flex justify-center py-10" role="status" aria-label="Loading admin section">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        navigate("/"); // Not admin
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "section-order": return <AdminSectionOrder />;
      case "branding": return <AdminBranding />;
      case "hero": return <AdminHero />;
      case "stats": return <AdminStats />;
      case "why-choose": return <AdminWhyChoose />;
      case "find-doctor": return <AdminFindDoctor />;
      case "doctor-cta": return <AdminDoctorCTA />;
      case "footer": return <AdminFooter />;
      case "users": return <AdminUsers />;
      case "appointments": return <AdminAppointments />;
      case "reviews": return <AdminReviews />;
      case "consultation-outcomes": return <AdminConsultationOutcomes />;
      case "specialties": return <AdminSpecialties />;
      case "contacts": return <AdminContacts />;
      case "faqs": return <AdminFaqs />;
      case "consultation-categories": return <AdminConsultationCategories />;
      case "payment-config": return <AdminPaymentConfig />;
      case "financial-settings": return <AdminFinancialSettings />;
      case "payments": return <AdminPayments />;
      case "payouts": return <AdminPayouts />;
      case "countries": return <AdminCountries />;
      case "legal-documents": return <AdminLegalDocuments />;
      case "ai-assistant": return <AdminAIAssistant />;
      case "audit-logs": return <AdminAuditLogs />;
      case "doctor-verification": return <AdminDoctorVerification />;
      case "site-settings": return <AdminSiteSettings />;
      default: return <AdminHero />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/80 backdrop-blur-lg">
            <SidebarTrigger className="mr-3" />
            <h1 className="font-display text-lg font-bold text-foreground capitalize">{activeSection}</h1>
          </header>
          <main className="flex-1 p-6">
            <Suspense fallback={<SectionFallback />}>{renderSection()}</Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
