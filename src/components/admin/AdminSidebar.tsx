import { LayoutDashboard, Users, Package, Activity, MessageSquare, BarChart, LogOut, User, Shield, Bell, DollarSign } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Users", url: "/admin?tab=users", icon: Users },
  { title: "Orders", url: "/admin?tab=orders", icon: Package },
  { title: "Activity", url: "/admin?tab=activity", icon: Activity },
  { title: "Communication", url: "/admin?tab=communication", icon: MessageSquare },
  { title: "Analytics", url: "/admin?tab=analytics", icon: BarChart },
  { title: "Pricing Rules", url: "/admin/pricing-rules", icon: DollarSign },
  { title: "Security", url: "/admin?tab=security", icon: Shield },
  { title: "Alerts", url: "/admin?tab=alerts", icon: Bell },
];

const userMenuItems = [
  { title: "Profile Settings", url: "/profile", icon: User },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const collapsed = state === "collapsed";
  const currentPath = location.pathname + location.search;
  const isActive = (path: string) => currentPath === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="pt-2 md:pt-4">
        {/* Admin Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Admin Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                      to={item.url} 
                      end={item.end}
                      className="hover:bg-accent transition-colors flex items-center w-full"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className={collapsed ? "h-5 w-5" : "mr-2 h-4 w-4"} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4" />

        {/* User Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className="hover:bg-accent transition-colors flex items-center w-full"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className={collapsed ? "h-5 w-5" : "mr-2 h-4 w-4"} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center w-full">
                  <LogOut className={collapsed ? "h-5 w-5" : "mr-2 h-4 w-4"} />
                  {!collapsed && <span className="truncate">Log Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
