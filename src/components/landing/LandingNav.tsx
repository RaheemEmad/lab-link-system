import { useState, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavLogo } from "./nav/NavLogo";
import { DesktopNavLinks } from "./nav/DesktopNavLinks";
import { DesktopRightActions } from "./nav/DesktopRightActions";
import { MobileNavSheet } from "./nav/MobileNavSheet";

const LandingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, hasUrgent } = useUnreadCount();
  const { role: userRole, labId } = useUserRole();

  // Fetch count of new unassigned orders for lab staff
  const { data: newOrdersCount } = useQuery({
    queryKey: ["new-marketplace-orders-count", labId],
    queryFn: async () => {
      if (!labId) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("auto_assign_pending", true)
        .is("assigned_lab_id", null)
        .gte("created_at", today.toISOString());
      if (error) return 0;

      const { data: refusedRequests } = await supabase
        .from("lab_work_requests")
        .select("order_id")
        .eq("lab_id", labId)
        .eq("status", "refused");

      const refusedOrderIds = new Set(refusedRequests?.map((r) => r.order_id) || []);
      return ordersData?.filter((order) => !refusedOrderIds.has(order.id)).length || 0;
    },
    enabled: !!labId && userRole === "lab_staff",
    staleTime: 1000 * 60 * 2,
    refetchInterval: 120000,
  });

  // Fetch pending lab applications count for doctors
  const { data: pendingRequestsCount = 0 } = useQuery({
    queryKey: ["pending-lab-requests", user?.id],
    queryFn: async () => {
      if (!user?.id || userRole !== "doctor") return 0;
      const { data, error } = await supabase
        .from("lab_work_requests")
        .select("id, orders!inner(doctor_id)")
        .eq("orders.doctor_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id && userRole === "doctor",
    staleTime: 1000 * 60,
    refetchInterval: 60000,
  });

  // Navigation links
  const leftNavLinks = [
    { label: t.nav.home, href: "/", type: "route" },
    { label: t.nav.howItWorks, href: "/how-it-works", type: "route" },
    ...(userRole === "doctor" ? [{ label: t.nav.labs, href: "/labs", type: "route" }] : []),
    ...(userRole === "lab_staff" ? [{ label: t.nav.marketplace, href: "/orders-marketplace", type: "route" }] : []),
    ...(user ? [{ label: t.nav.dashboard, href: "/dashboard", type: "route" }] : []),
  ];

  const doctorMenuItems =
    user && userRole === "doctor"
      ? [
          { label: t.nav.preferredLabs, href: "/preferred-labs" },
          { label: t.nav.labApplications, href: "/lab-requests", badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
          { label: "Order Templates", href: "/templates" },
        ]
      : [];

  const labStaffMenuItems =
    userRole === "lab_staff" || userRole === "admin"
      ? [
          { label: t.nav.labWorkflow, href: "/lab-workflow" },
          { label: t.nav.labAdmin, href: "/lab-admin" },
        ]
      : [];

  const handleNavClick = (link: { href: string; type?: string }) => {
    if (link.type === "anchor") {
      const element = document.querySelector(link.href);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(link.href);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsOpen(false);
  };

  const isLinkActive = (link: { href: string; type?: string }) => {
    if (link.type === "anchor") return false;
    return location.pathname === link.href;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="container px-3 sm:px-4 lg:px-6 mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <NavLogo />
            <DesktopNavLinks
              links={leftNavLinks}
              userRole={userRole}
              newOrdersCount={newOrdersCount}
              onNavClick={handleNavClick}
              isLinkActive={isLinkActive}
            />
            <DesktopRightActions
              user={user}
              userRole={userRole}
              unreadCount={unreadCount}
              hasUrgent={hasUrgent}
              doctorMenuItems={doctorMenuItems}
              labStaffMenuItems={labStaffMenuItems}
              t={t}
              signOut={signOut}
            />
            <MobileNavSheet
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              user={user}
              userRole={userRole}
              leftNavLinks={leftNavLinks}
              unreadCount={unreadCount}
              hasUrgent={hasUrgent}
              newOrdersCount={newOrdersCount}
              isInstallable={isInstallable}
              t={t}
              signOut={signOut}
              onNavClick={handleNavClick}
              isLinkActive={isLinkActive}
            />
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
};

export default memo(LandingNav);
