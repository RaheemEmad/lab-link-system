import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Plus, Store, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const MobileBottomNav = () => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isLoading } = useUserRole();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["mobile-nav-unread", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!user || isLoading) return null;

  const hiddenPaths = ["/", "/auth", "/reset-password", "/onboarding", "/how-it-works", "/about", "/privacy", "/terms", "/contact", "/install", "/admin/login"];
  if (hiddenPaths.includes(location.pathname)) return null;

  const navItems: NavItem[] = [
    { label: t.mobileNav.dashboard, icon: LayoutDashboard, href: "/dashboard" },
    ...(isDoctor
      ? [{ label: t.mobileNav.newOrder, icon: Plus, href: "/new-order" }]
      : isLabStaff
        ? [{ label: t.mobileNav.marketplace, icon: Store, href: "/orders-marketplace" }]
        : []),
    { label: t.mobileNav.alerts, icon: Bell, href: "/notifications" },
    { label: t.mobileNav.profile, icon: User, href: "/profile" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => {
                navigate(item.href);
                window.scrollTo({ top: 0 });
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-full h-full",
                "transition-all duration-200 active:scale-90 tap-highlight-none",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")} />
                {item.label === t.mobileNav.alerts && unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 ltr:-right-2 rtl:-left-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 border-2 border-background"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium leading-tight", active && "font-semibold")}>
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
