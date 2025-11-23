import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Download, Bell, User, LogOut, Trophy, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LandingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const { playUrgentNotification } = useNotificationSound();
  const { 
    requestPermission, 
    showUrgentNotification, 
    showNormalNotification,
    isGranted,
    isSupported 
  } = useBrowserNotifications();
  const previousUrgentCountRef = useRef<number>(0);
  const previousTotalCountRef = useRef<number>(0);

  // Fetch unread notification count and check for urgent notifications
  const { data: notificationData } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, hasUrgent: false };

      const { data, error } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      
      // Check if any notification is of urgent type (status_change or urgent types)
      const hasUrgent = data?.some(n => 
        n.type === "status_change" || n.type === "urgent"
      ) || false;

      return { count: data?.length || 0, hasUrgent };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const unreadCount = notificationData?.count || 0;
  const hasUrgent = notificationData?.hasUrgent || false;

  // Request notification permission on mount if user is logged in
  useEffect(() => {
    if (user && isSupported && !isGranted) {
      // Delay the request slightly to avoid disrupting the user experience
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isGranted, requestPermission]);

  // Play sound and show browser notification when new urgent notifications arrive
  useEffect(() => {
    const isNewUrgent = hasUrgent && unreadCount > previousUrgentCountRef.current && previousUrgentCountRef.current > 0;
    const isNewNotification = unreadCount > previousTotalCountRef.current && previousTotalCountRef.current > 0;

    if (isNewUrgent) {
      playUrgentNotification();
      showUrgentNotification(unreadCount);
      console.log('🔔 Urgent notification: sound + desktop notification');
    } else if (isNewNotification) {
      showNormalNotification(unreadCount);
      console.log('📬 Normal notification: desktop notification');
    }

    previousUrgentCountRef.current = unreadCount;
    previousTotalCountRef.current = unreadCount;
  }, [unreadCount, hasUrgent, playUrgentNotification, showUrgentNotification, showNormalNotification]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Fetch user role and lab ID
  const [userRole, setUserRole] = useState<string | null>(null);
  const [labId, setLabId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role, lab_id')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
        setLabId(data.lab_id);
      }
    };
    
    fetchUserRole();
  }, [user]);

  // Fetch count of new unassigned orders for today (for marketplace badge)
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

      // Filter out orders where this lab has been refused
      const { data: refusedRequests } = await supabase
        .from("lab_work_requests")
        .select("order_id")
        .eq("lab_id", labId)
        .eq("status", "refused");

      const refusedOrderIds = new Set(refusedRequests?.map(r => r.order_id) || []);
      const filteredOrders = ordersData?.filter(order => !refusedOrderIds.has(order.id)) || [];
      
      return filteredOrders.length;
    },
    enabled: !!labId && userRole === 'lab_staff',
    refetchInterval: 60000,
  });

  // Fetch pending lab applications count for doctors
  const { data: pendingRequestsCount = 0 } = useQuery({
    queryKey: ["pending-lab-requests", user?.id],
    queryFn: async () => {
      if (!user?.id || userRole !== 'doctor') return 0;
      
      const { data, error } = await supabase
        .from("lab_work_requests")
        .select("id, orders!inner(doctor_id)")
        .eq("orders.doctor_id", user.id)
        .eq("status", "pending");
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id && userRole === 'doctor',
    refetchInterval: 30000,
  });

  // Left navigation links - role-based and cleaner
  const leftNavLinks = [
    { label: "Home", href: "/", type: "route" },
    { label: "How It Works", href: "/how-it-works", type: "route" },
    ...(userRole === 'doctor' ? [{ label: "Labs", href: "/labs", type: "route" }] : []),
    ...(userRole === 'lab_staff' ? [{ label: "Marketplace", href: "/orders-marketplace", type: "route" }] : []),
    ...(user ? [{ label: "Dashboard", href: "/dashboard", type: "route" }] : []),
  ];

  // Role-specific dropdown menu items
  const doctorMenuItems = user && userRole === 'doctor' ? [
    { label: "Track Orders", href: "/order-tracking" },
    { label: "Preferred Labs", href: "/preferred-labs" },
    { 
      label: "Lab Applications", 
      href: "/lab-requests",
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
    },
  ] : [];

  const labStaffMenuItems = (userRole === 'lab_staff' || userRole === 'admin') ? [
    { label: "Lab Workflow", href: "/lab-workflow" },
    { label: "Lab Admin", href: "/lab-admin" },
  ] : [];

  const handleNavClick = (link: { href: string; type?: string }) => {
    if (link.type === "anchor") {
      // Smooth scroll for anchor links
      const element = document.querySelector(link.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Navigate to route
      navigate(link.href);
      // Smooth scroll to top when navigating
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsOpen(false);
  };

  // Check if a link is active
  const isLinkActive = (link: { href: string; type?: string }) => {
    if (link.type === "anchor") return false;
    return location.pathname === link.href;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="text-2xl font-bold text-primary cursor-pointer"
                  onClick={() => navigate("/")}
                >
                  LabLink
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to home page</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Desktop Left Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {leftNavLinks.map((link) => (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleNavClick(link)}
                      className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                        isLinkActive(link)
                          ? "text-primary font-semibold border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.label}
                      {link.label === "Marketplace" && userRole === 'lab_staff' && newOrdersCount && newOrdersCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-foreground bg-primary rounded-full">
                          {newOrdersCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {link.type === "anchor" 
                        ? `Scroll to ${link.label.toLowerCase()}` 
                        : `Navigate to ${link.label}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            
            {/* Desktop Right Section (Auth & User Actions) */}
            <div className="hidden lg:flex items-center gap-2">
              {user ? (
                <>
                  {/* Achievements Icon - Doctor */}
                  {userRole === 'doctor' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate("/doctor-achievements")}
                          className="relative"
                        >
                          <Trophy className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View your achievements</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Achievements Icon - Lab Staff */}
                  {userRole === 'lab_staff' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate("/lab-achievements")}
                          className="relative"
                        >
                          <Trophy className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View your lab achievements</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Notifications Icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/notifications")}
                        className="relative"
                      >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <Badge
                            variant={hasUrgent ? "destructive" : "default"}
                            className={`absolute -top-1 -right-1 h-5 min-w-5 rounded-full flex items-center justify-center text-xs px-1.5 ${
                              hasUrgent ? "animate-pulse" : ""
                            }`}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {unreadCount > 0
                          ? `${hasUrgent ? "🔴 " : ""}${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}${hasUrgent ? " (urgent)" : ""}` 
                          : 'View all notifications'}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Role-specific dropdown menu with innovative icon */}
                  {(doctorMenuItems.length > 0 || labStaffMenuItems.length > 0) && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              {userRole === 'lab_staff' || userRole === 'admin' ? (
                                <Sparkles className="h-5 w-5" />
                              ) : (
                                <Menu className="h-5 w-5" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{userRole === 'lab_staff' || userRole === 'admin' ? 'Lab Tools' : 'My Tools'}</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        {doctorMenuItems.map((item) => (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link to={item.href} className="flex items-center justify-between w-full">
                              <span>{item.label}</span>
                              {item.badge && (
                                <Badge variant="default" className="ml-2">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        {labStaffMenuItems.map((item) => (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link to={item.href}>{item.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden xl:inline">Account</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/profile">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/auth")}
                      >
                        Sign In
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign in to your account</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => navigate("/auth")}
                      >
                        Sign Up
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create a new account</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

          {/* Mobile Menu */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold text-primary">
                    LabLink
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  {/* Main Navigation */}
                  <div className="space-y-2">
                    {leftNavLinks.map((link) => (
                      <button
                        key={link.href}
                        onClick={() => handleNavClick(link)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isLinkActive(link)
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <span>{link.label}</span>
                        {link.label === "Marketplace" && userRole === 'lab_staff' && newOrdersCount && newOrdersCount > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-foreground bg-primary rounded-full">
                            {newOrdersCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* User Actions (when logged in) */}
                  {user && (
                    <>
                      <div className="border-t border-border my-2" />
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            navigate("/notifications");
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                          </span>
                          {unreadCount > 0 && (
                            <Badge 
                              variant={hasUrgent ? "destructive" : "default"}
                              className={`h-5 min-w-5 rounded-full flex items-center justify-center text-xs px-1.5 ${
                                hasUrgent ? "animate-pulse" : ""
                              }`}
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            navigate("/profile");
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </button>
                      </div>
                    </>
                  )}

                  {/* Install App */}
                  {isInstallable && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          navigate("/install");
                          setIsOpen(false);
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Install App
                      </Button>
                    </>
                  )}

                  {/* Auth Section */}
                  <div className="border-t border-border mt-4 pt-4">
                    {user ? (
                      <>
                        <div className="px-4 py-2 mb-2">
                          <p className="text-xs text-muted-foreground">Signed in as</p>
                          <p className="text-sm font-medium truncate">{user.email}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => {
                            signOut();
                            setIsOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigate("/auth");
                            setIsOpen(false);
                          }}
                        >
                          Sign In
                        </Button>
                        <Button
                          className="w-full"
                          onClick={() => {
                            navigate("/auth");
                            setIsOpen(false);
                          }}
                        >
                          Sign Up
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
    </TooltipProvider>
  );
};

export default LandingNav;
