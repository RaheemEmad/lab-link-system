import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Download, Bell, User, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LandingNav = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const { playUrgentNotification } = useNotificationSound();
  const previousUrgentCountRef = useRef<number>(0);

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

  // Play sound when new urgent notifications arrive
  useEffect(() => {
    if (hasUrgent && unreadCount > previousUrgentCountRef.current && previousUrgentCountRef.current > 0) {
      playUrgentNotification();
      console.log('🔔 Urgent notification sound played');
    }
    previousUrgentCountRef.current = unreadCount;
  }, [unreadCount, hasUrgent, playUrgentNotification]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Left navigation links
  const leftNavLinks = [
    { label: "How It Works", href: "#how-it-works", type: "anchor" },
    { label: "About", href: "/about", type: "route" },
    { label: "Contact", href: "/contact", type: "route" },
    ...(user ? [{ label: "Dashboard", href: "/dashboard", type: "route" }] : []),
  ];

  const handleNavClick = (link: { href: string; type?: string }) => {
    if (link.type === "anchor") {
      // Smooth scroll for anchor links
      const element = document.querySelector(link.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(link.href);
    }
    setIsOpen(false);
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
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
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
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  {/* Notifications */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/notifications")}
                        className="relative gap-2"
                      >
                        <Bell className="h-4 w-4" />
                        <span className="hidden xl:inline">Notifications</span>
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
                          ? `${hasUrgent ? "🔴 " : ""}View ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}${hasUrgent ? " (urgent)" : ""}` 
                          : 'View all notifications'}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Profile */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/profile")}
                        className="gap-2"
                      >
                        <User className="h-4 w-4" />
                        <span className="hidden xl:inline">Profile</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View and edit your profile</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Sign Out */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={signOut}
                        className="gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden xl:inline">Sign Out</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign out of your account</p>
                    </TooltipContent>
                  </Tooltip>
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
                        className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {link.label}
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
