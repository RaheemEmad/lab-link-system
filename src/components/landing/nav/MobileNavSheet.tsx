import { useNavigate } from "react-router-dom";
import { User as UserType } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Download, Bell, User, LogOut, Plus, Star, Building2, Truck, Shield, Package } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Translations } from "@/lib/i18n/types";

interface NavLink {
  label: string;
  href: string;
  type?: string;
}

interface MobileNavSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: UserType | null;
  userRole: string | null;
  leftNavLinks: NavLink[];
  unreadCount: number;
  hasUrgent: boolean;
  newOrdersCount?: number;
  isInstallable: boolean;
  t: TranslationType;
  signOut: () => void;
  onNavClick: (link: NavLink) => void;
  isLinkActive: (link: NavLink) => boolean;
}

export const MobileNavSheet = ({
  isOpen,
  setIsOpen,
  user,
  userRole,
  leftNavLinks,
  unreadCount,
  hasUrgent,
  newOrdersCount,
  isInstallable,
  t,
  signOut,
  onNavClick,
  isLinkActive,
}: MobileNavSheetProps) => {
  const navigate = useNavigate();

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="text-2xl font-bold text-primary">LabLink</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="flex flex-col gap-4 mt-8 pb-safe stagger-fade-in">
              {/* Main Navigation */}
              <div className="space-y-2">
                {leftNavLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => onNavClick(link)}
                    className={`w-full flex items-center justify-between px-4 min-h-[44px] py-3 rounded-lg text-sm font-medium transition-colors active:bg-primary/10 ${
                      isLinkActive(link)
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.label === "Marketplace" && userRole === "lab_staff" && newOrdersCount && newOrdersCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold text-primary-foreground bg-primary rounded-full border-2 border-background">
                        {newOrdersCount > 99 ? "99+" : newOrdersCount}
                      </span>
                    )}
                  </button>
                ))}

                {/* Create Order - Doctor Only */}
                {userRole === "doctor" && (
                  <Button
                    variant="outline"
                    onClick={() => { navigate("/new-order"); setIsOpen(false); }}
                    className="w-full gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    Create Order
                  </Button>
                )}

                {/* Lab Tools Section */}
                {(userRole === "lab_staff" || userRole === "admin") && (
                  <>
                    <div className="border-t border-border my-2" />
                    <div className="space-y-2">
                      <div className="px-4 py-2">
                        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                          <Star className="h-3 w-3 text-warning" />
                          Lab Tools
                        </p>
                      </div>
                      <MobileNavButton icon={Building2} label="Lab Workflow" onClick={() => { navigate("/lab-workflow"); setIsOpen(false); }} />
                      <MobileNavButton icon={Shield} label="Lab Admin" onClick={() => { navigate("/lab-admin"); setIsOpen(false); }} />
                      {userRole === "lab_staff" && (
                        <>
                          <MobileNavButton icon={Truck} label="Track Orders" onClick={() => { navigate("/logistics?tab=tracking"); setIsOpen(false); }} />
                          <MobileNavButton icon={Package} label="Logistics Dashboard" onClick={() => { navigate("/logistics"); setIsOpen(false); }} />
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* User Actions */}
              {user && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="space-y-2">
                    <button
                      onClick={() => { navigate("/notifications"); setIsOpen(false); }}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 active:bg-primary/10 transition-colors flex items-center justify-between min-h-[44px]"
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <Badge
                          variant={hasUrgent ? "destructive" : "default"}
                          className={`h-5 min-w-[1.25rem] rounded-full flex items-center justify-center text-[10px] font-bold px-1.5 border-2 border-background ${hasUrgent ? "shadow-lg" : ""}`}
                          style={hasUrgent ? { animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" } : {}}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </button>
                    <MobileNavButton icon={User} label="Profile" onClick={() => { navigate("/profile"); setIsOpen(false); }} />
                  </div>
                </>
              )}

              {/* Install App */}
              {isInstallable && (
                <>
                  <div className="border-t border-border my-2" />
                  <Button variant="outline" className="w-full gap-2" onClick={() => { navigate("/install"); setIsOpen(false); }}>
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
                      <p className="text-xs text-muted-foreground">{t.nav.signedInAs}</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2 min-h-[44px]" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut className="h-4 w-4" />
                      {t.nav.signOut}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                      {t.nav.signIn}
                    </Button>
                    <Button className="w-full" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                      {t.nav.signUp}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Reusable mobile nav button
const MobileNavButton = ({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 active:bg-primary/10 transition-colors flex items-center gap-2 min-h-[44px]"
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
