import { Users, Calendar, Star, Stethoscope, Mail, HelpCircle, Home, Layout, BarChart3 } from "lucide-react";
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
  { title: "Hero Section", key: "hero", icon: Layout },
  { title: "Stats", key: "stats", icon: BarChart3 },
  { title: "Specialties", key: "specialties", icon: Stethoscope },
  { title: "FAQs", key: "faqs", icon: HelpCircle },
  { title: "Users", key: "users", icon: Users },
  { title: "Appointments", key: "appointments", icon: Calendar },
  { title: "Reviews", key: "reviews", icon: Star },
  { title: "Contact Messages", key: "contacts", icon: Mail },
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
