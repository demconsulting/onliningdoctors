import {
  History, Users, Calendar, Star, Stethoscope, Mail, HelpCircle, Home, Layout, BarChart3, ScrollText, ShieldCheck, Settings, Sparkles, Search, PanelBottom, Layers, CreditCard, Receipt, Wallet, ClipboardCheck, Bot, Globe, FileText, Tag, Image as ImageIcon, DollarSign, Crown, HardDrive, TrendingUp, Network, Gift, Briefcase, Server, Lock, AtSign, MapPin, Share2, Newspaper, MousePointerClick, FolderOpen, ListChecks, LayoutDashboard, LifeBuoy, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { prefetchAdminSection } from "@/pages/AdminDashboard";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; key: string; icon: typeof Users };

const doctorsOnliningItems: Item[] = [
  { title: "Section Order", key: "section-order", icon: Layers },
  { title: "Branding & Logo", key: "branding", icon: ImageIcon },
  { title: "Brand Assets", key: "brand-assets", icon: ImageIcon },
  { title: "Hero Section", key: "hero", icon: Layout },
  { title: "Stats", key: "stats", icon: BarChart3 },
  { title: "Why Choose", key: "why-choose", icon: Sparkles },
  { title: "Find Doctor", key: "find-doctor", icon: Search },
  { title: "Doctor CTA", key: "doctor-cta", icon: Stethoscope },
  { title: "Footer", key: "footer", icon: PanelBottom },
  { title: "Specialties", key: "specialties", icon: Stethoscope },
  { title: "FAQs", key: "faqs", icon: HelpCircle },
  { title: "Doctor Verification", key: "doctor-verification", icon: ShieldCheck },
  { title: "Patient ID Verification", key: "patient-id-verification", icon: ShieldCheck },
  { title: "Profile Reviews", key: "profile-reviews", icon: ClipboardCheck },
  { title: "Doctor Onboarding", key: "doctor-onboarding", icon: Mail },
  { title: "Reminder Center", key: "reminder-center", icon: Mail },
  { title: "Founding Doctor Programme", key: "founding-doctors", icon: Crown },
  { title: "Recruitment CRM", key: "recruitment-crm", icon: Network },
  { title: "Referral & Rewards", key: "referrals", icon: Gift },
  { title: "Appointments", key: "appointments", icon: Calendar },
  { title: "Practices", key: "practices", icon: Building2 },
  { title: "Practice Patients", key: "practice-patients", icon: Users },
  { title: "Reviews", key: "reviews", icon: Star },
  { title: "Consultation Outcomes", key: "consultation-outcomes", icon: ClipboardCheck },
  { title: "Consultation Categories", key: "consultation-categories", icon: Tag },
  { title: "Payment Config", key: "payment-config", icon: CreditCard },
  { title: "Financial Settings", key: "financial-settings", icon: DollarSign },
  { title: "Payments", key: "payments", icon: Receipt },
  { title: "Payouts", key: "payouts", icon: Wallet },
  { title: "Fee History", key: "fee-history", icon: History },
  { title: "Financial Management", key: "financial-management", icon: TrendingUp },
];

const nalavationItems: Item[] = [
  { title: "Overview", key: "nalavation-overview", icon: LayoutDashboard },
  { title: "Digital Practices", key: "nala-projects", icon: Briefcase },
  { title: "Websites", key: "nala-websites", icon: Globe },
  { title: "Hosting", key: "nala-hosting", icon: Server },
  { title: "Domains", key: "nala-domains", icon: Globe },
  { title: "SSL Certificates", key: "nala-ssl", icon: Lock },
  { title: "Email Hosting", key: "nala-emails", icon: AtSign },
  { title: "Google Business", key: "nala-gbp", icon: MapPin },
  { title: "Social Profiles", key: "nala-social", icon: Share2 },
  { title: "SEO", key: "nala-seo", icon: Search },
  { title: "Articles", key: "nala-articles", icon: Newspaper },
  { title: "Landing Pages", key: "nala-landing", icon: MousePointerClick },
  { title: "Media Library", key: "nala-media", icon: FolderOpen },
  { title: "Project Tasks", key: "nala-tasks", icon: ListChecks },
  { title: "Service Catalogue", key: "nala-services", icon: Package },
  { title: "Service Requests", key: "nala-service-requests", icon: ClipboardCheck },
  { title: "Support", key: "nala-support", icon: LifeBuoy },
];

const nalavationFinanceItems: Item[] = [
  { title: "Payment Gateways", key: "nala-payment-config", icon: CreditCard },
  { title: "Invoices", key: "nala-billing", icon: Receipt },
  { title: "Service Payments", key: "nala-payments", icon: Wallet },
  { title: "Website Projects", key: "nala-projects", icon: Briefcase },
  { title: "Hosting Services", key: "nala-hosting", icon: Server },
  { title: "Domain Services", key: "nala-domains", icon: Globe },
  { title: "Active Subscriptions", key: "nala-subscriptions", icon: Package },
  { title: "Revenue Reports", key: "nala-revenue", icon: TrendingUp },
];


const platformItems: Item[] = [
  { title: "Users", key: "users", icon: Users },
  { title: "Contact Messages", key: "contacts", icon: Mail },
  { title: "Countries", key: "countries", icon: Globe },
  { title: "Legal Documents", key: "legal-documents", icon: FileText },
  { title: "AI Assistant", key: "ai-assistant", icon: Bot },
  { title: "Audit Logs", key: "audit-logs", icon: ScrollText },
  { title: "Site Settings", key: "site-settings", icon: Settings },
  { title: "Storage Usage", key: "storage-usage", icon: HardDrive },
  { title: "Email Test & Logs", key: "email-test", icon: Mail },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const renderGroup = (label: string, items: Item[]) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                onClick={() => onSectionChange(item.key)}
                onMouseEnter={() => prefetchAdminSection(item.key)}
                onFocus={() => prefetchAdminSection(item.key)}
                onTouchStart={() => prefetchAdminSection(item.key)}
                className={activeSection === item.key ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {!collapsed && <span>{item.title}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
                  <Home className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Back to Site</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {renderGroup("DoctorsOnlining", doctorsOnliningItems)}
        {renderGroup("Nalavation", nalavationItems)}
        {renderGroup("Nalavation Financial", nalavationFinanceItems)}
        {renderGroup("Platform", platformItems)}
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
