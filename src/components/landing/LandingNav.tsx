import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Download, Bell, User, LogOut, Trophy, Star, Building2, Truck, Shield, Plus, FilePlus, Package } from "lucide-react";
import { motion } from "framer-motion";
import lablinkLogo from "@/assets/lablink-logo.png";
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

  // Fetch unread notification count and check for urgent notifications - OPTIMIZED
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
      
      const hasUrgent = data?.some(n => 
        n.type === "status_change" || n.type === "urgent"
      ) || false;

      return { count: data?.length || 0, hasUrgent };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 60000, // 1 minute instead of 30 seconds
  });

  const unreadCount = notificationData?.count || 0;
  const hasUrgent = notificationData?.hasUrgent || false;

  // Request notification permission on mount if user is logged in
  useEffect(() => {
    if (user && isSupported && !isGranted) {
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
    } else if (isNewNotification) {
      showNormalNotification(unreadCount);
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

  // Fetch count of new unassigned orders - OPTIMIZED
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

      const refusedOrderIds = new Set(refusedRequests?.map(r => r.order_id) || []);
      const filteredOrders = ordersData?.filter(order => !refusedOrderIds.has(order.id)) || [];
      
      return filteredOrders.length;
    },
    enabled: !!labId && userRole === 'lab_staff',
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 120000, // 2 minutes instead of 1 minute
  });

  // Fetch pending lab applications count - OPTIMIZED
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
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 60000, // 1 minute instead of 30 seconds
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
      const element = document.querySelector(link.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
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
            {/* Logo with animation */}
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => navigate("/")}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.6, 
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.1 
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.img 
                    src={lablinkLogo} 
                    alt="LabLink Logo" 
                    className="h-8 sm:h-10 w-auto object-contain"
                    initial={{ opacity: 0, rotate: -10 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ 
                      duration: 0.8, 
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.2
                    }}
                  />
                  <motion.span 
                    className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] transition-all duration-500 group-hover:bg-[length:100%_auto] hidden xs:inline"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.6, 
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.3
                    }}
                  >
                    LabLink
                  </motion.span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Home</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Desktop Left Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {leftNavLinks.map((link) => (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleNavClick(link)}
                      className={`relative inline-flex items-center gap-1 text-sm font-medium transition-all duration-300 group ${
                        isLinkActive(link)
                          ? "text-ocean-blue font-semibold"
                          : "text-muted-foreground hover:text-ocean-blue"
                      }`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {isLinkActive(link) && (
                        <motion.span 
                          className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-ocean-blue to-dark-teal"
                          layoutId="activeNav"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {!isLinkActive(link) && (
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-ocean-blue to-dark-teal transition-all duration-300 group-hover:w-full" />
                      )}
                      {link.label === "Marketplace" && userRole === 'lab_staff' && newOrdersCount && newOrdersCount > 0 && (
                        <motion.span 
                          className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-ocean-blue to-dark-teal rounded-full shadow-lg border-2 border-background"
                          initial={{ scale: 0 }}
                          animate={{ 
                            scale: 1,
                            boxShadow: [
                              "0 0 0 0 hsl(var(--primary) / 0.7)",
                              "0 0 0 8px hsl(var(--primary) / 0)",
                              "0 0 0 0 hsl(var(--primary) / 0)"
                            ]
                          }}
                          transition={{ 
                            scale: { type: "spring", stiffness: 500, damping: 25 },
                            boxShadow: {
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeOut"
                            }
                          }}
                        >
                          {newOrdersCount > 99 ? "99+" : newOrdersCount}
                        </motion.span>
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
                  {/* Create Order Button - Doctor Only */}
                  {userRole === 'doctor' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate("/new-order")}
                          className="h-9 w-9 relative group overflow-hidden hover:bg-primary/10 hover:text-primary transition-all duration-300"
                        >
                          <FilePlus className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Create Order</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Logistics Dropdown - Doctor */}
                  {userRole === 'doctor' && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 relative group overflow-hidden hover:bg-ocean-blue/10 hover:text-ocean-blue transition-all duration-300">
                              <span className="absolute inset-0 w-0 bg-ocean-blue/10 transition-all duration-300 group-hover:w-full" />
                              <Truck className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-ocean-blue" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Orders & Logistics</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/track-orders">Track Orders</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/logistics">Logistics Dashboard</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Logistics Dropdown - Lab Staff */}
                  {userRole === 'lab_staff' && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 relative group overflow-hidden hover:bg-ocean-blue/10 hover:text-ocean-blue transition-all duration-300">
                              <span className="absolute inset-0 w-0 bg-ocean-blue/10 transition-all duration-300 group-hover:w-full" />
                              <Truck className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-ocean-blue" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Orders & Logistics</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/order-tracking">Track Orders</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/logistics">Logistics Dashboard</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Role-specific dropdown menu with innovative icon */}
                  {(doctorMenuItems.length > 0 || labStaffMenuItems.length > 0) && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative group overflow-hidden hover:bg-amber-500/10 transition-all duration-300">
                              {userRole === 'lab_staff' || userRole === 'admin' ? (
                                <>
                                  <span className="absolute inset-0 w-0 bg-amber-500/10 transition-all duration-300 group-hover:w-full" />
                                  <Star className="h-5 w-5 text-amber-500 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                                </>
                              ) : (
                                <Building2 className="h-5 w-5" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{userRole === 'lab_staff' || userRole === 'admin' ? 'Lab Tools' : 'Lab Management'}</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="min-w-[200px] bg-background">
                        {doctorMenuItems.map((item) => (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link to={item.href} className="flex items-center justify-between w-full cursor-pointer">
                              <span>{item.label}</span>
                              {item.badge && (
                                <Badge 
                                  variant="default" 
                                  className="ml-2 min-w-[1.5rem] h-5 flex items-center justify-center px-1.5 bg-ocean-blue text-white font-bold text-xs"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        {labStaffMenuItems.map((item) => (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link to={item.href} className="cursor-pointer">{item.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Achievements Icon - Doctor */}
                  {userRole === 'doctor' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate("/doctor-achievements")}
                          className="h-9 w-9 relative group overflow-hidden hover:bg-forest-green/10 hover:text-forest-green transition-all duration-300"
                        >
                          <span className="absolute inset-0 w-0 bg-forest-green/10 transition-all duration-300 group-hover:w-full" />
                          <Trophy className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-forest-green" />
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
                          className="h-9 w-9 relative group overflow-hidden hover:bg-forest-green/10 hover:text-forest-green transition-all duration-300"
                        >
                          <span className="absolute inset-0 w-0 bg-forest-green/10 transition-all duration-300 group-hover:w-full" />
                          <Trophy className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-forest-green" />
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
                        className="h-9 w-9 relative group overflow-hidden hover:bg-ocean-blue/10 hover:text-ocean-blue transition-all duration-300"
                        onClick={() => navigate("/notifications")}
                      >
                        <span className="absolute inset-0 w-0 bg-ocean-blue/10 transition-all duration-300 group-hover:w-full" />
                        <Bell className={`h-4 w-4 relative z-10 transition-all duration-300 ${hasUrgent ? 'animate-pulse text-destructive' : 'group-hover:scale-110 group-hover:text-ocean-blue'}`} />
                        {unreadCount > 0 && (
                          <motion.span 
                            className={`absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center font-bold shadow-lg border-2 border-background ${
                              hasUrgent 
                                ? 'bg-destructive text-destructive-foreground' 
                                : 'bg-ocean-blue text-white'
                            }`}
                            initial={{ scale: 0 }}
                            animate={{ 
                              scale: 1,
                              ...(hasUrgent && {
                                boxShadow: [
                                  "0 0 0 0 hsl(var(--destructive) / 0.7)",
                                  "0 0 0 8px hsl(var(--destructive) / 0)",
                                  "0 0 0 0 hsl(var(--destructive) / 0)"
                                ]
                              })
                            }}
                            transition={{ 
                              scale: { type: "spring", stiffness: 500, damping: 25 },
                              boxShadow: hasUrgent ? {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeOut"
                              } : {}
                            }}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </motion.span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{hasUrgent ? '🔔 Urgent notifications!' : `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Admin Panel Icon - Only for Admins */}
                  {userRole === 'admin' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate("/admin")}
                          className="h-9 w-9 relative group overflow-hidden hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                        >
                          <span className="absolute inset-0 w-0 bg-destructive/10 transition-all duration-300 group-hover:w-full" />
                          <Shield className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Admin Panel</p>
                      </TooltipContent>
                    </Tooltip>
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
                            : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                        }`}
                      >
                        <span>{link.label}</span>
                        {link.label === "Marketplace" && userRole === 'lab_staff' && newOrdersCount && newOrdersCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold text-white bg-ocean-blue rounded-full border-2 border-background">
                            {newOrdersCount > 99 ? "99+" : newOrdersCount}
                          </span>
                        )}
                      </button>
                    ))}
                    
                    {/* Create Order - Doctor Only (in navigation menu) */}
                    {userRole === 'doctor' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigate("/new-order");
                          setIsOpen(false);
                        }}
                        className="w-full gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300"
                      >
                        <Plus className="h-4 w-4" />
                        Create Order
                      </Button>
                    )}

                    {/* Lab Tools Section - Lab Staff & Admin Only */}
                    {(userRole === 'lab_staff' || userRole === 'admin') && (
                      <>
                        <div className="border-t border-border my-2" />
                        <div className="space-y-2">
                          <div className="px-4 py-2">
                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                              <Star className="h-3 w-3 text-amber-500" />
                              Lab Tools
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              navigate("/lab-workflow");
                              setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors flex items-center gap-2"
                          >
                            <Building2 className="h-4 w-4" />
                            Lab Workflow
                          </button>
                          <button
                            onClick={() => {
                              navigate("/lab-admin");
                              setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors flex items-center gap-2"
                          >
                            <Shield className="h-4 w-4" />
                            Lab Admin
                          </button>
                          {userRole === 'lab_staff' && (
                            <>
                              <button
                                onClick={() => {
                                  navigate("/track-orders");
                                  setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors flex items-center gap-2"
                              >
                                <Truck className="h-4 w-4" />
                                Track Orders
                              </button>
                              <button
                                onClick={() => {
                                  navigate("/logistics");
                                  setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors flex items-center gap-2"
                              >
                                <Package className="h-4 w-4" />
                                Logistics Dashboard
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
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
                          className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                          </span>
                          {unreadCount > 0 && (
                            <Badge 
                              variant={hasUrgent ? "destructive" : "default"}
                              className={`h-5 min-w-[1.25rem] rounded-full flex items-center justify-center text-[10px] font-bold px-1.5 border-2 border-background ${
                                hasUrgent ? "shadow-lg" : ""
                              }`}
                              style={hasUrgent ? {
                                animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                              } : {}}
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
                          className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors flex items-center gap-2"
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

export default memo(LandingNav);
