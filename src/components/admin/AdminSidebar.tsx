import { Users, Calendar, Star, Stethoscope, Mail, HelpCircle, Home, Layout, BarChart3, ScrollText, ShieldCheck, Settings, Sparkles, Search, PanelBottom, Layers, CreditCard, Receipt, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const items = [
  { title: "Section Order", key: "section-order", icon: Layers },
  { title: "Hero Section", key: "hero", icon: Layout },
  { title: "Stats", key: "stats", icon: BarChart3 },
  { title: "Why Choose", key: "why-choose", icon: Sparkles },
  { title: "Find Doctor", key: "find-doctor", icon: Search },
  { title: "Doctor CTA", key: "doctor-cta", icon: Stethoscope },
  { title: "Footer", key: "footer", icon: PanelBottom },
  { title: "Specialties", key: "specialties", icon: Stethoscope },
  { title: "FAQs", key: "faqs", icon: HelpCircle },
  { title: "Doctor Verification", key: "doctor-verification", icon: ShieldCheck },
  { title: "Users", key: "users", icon: Users },
  { title: "Appointments", key: "appointments", icon: Calendar },
  { title: "Reviews", key: "reviews", icon: Star },
  { title: "Contact Messages", key: "contacts", icon: Mail },
  { title: "Payment Config", key: "payment-config", icon: CreditCard },
  { title: "Payments", key: "payments", icon: Receipt },
  { title: "Audit Logs", key: "audit-logs", icon: ScrollText },
  { title: "Site Settings", key: "site-settings", icon: Settings },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
                  <Home className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Back to Site</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.key)}
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
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
