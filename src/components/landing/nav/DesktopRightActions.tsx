// v2 - consolidated theme/language/settings into account dropdown
import { useNavigate, Link } from "react-router-dom";
import { User as UserType } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Trophy, Star, Building2, Truck, Shield, FilePlus, Settings, Inbox as InboxIcon, Globe, Moon, Sun, Monitor, Check, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Translations } from "@/lib/i18n/types";

interface MenuItem {
  label: string;
  href: string;
  badge?: number;
}

interface DesktopRightActionsProps {
  user: UserType | null;
  userRole: string | null;
  unreadCount: number;
  hasUrgent: boolean;
  doctorMenuItems: MenuItem[];
  labStaffMenuItems: MenuItem[];
  t: Translations;
  signOut: () => void;
}

export const DesktopRightActions = ({
  user,
  userRole,
  unreadCount,
  hasUrgent,
  doctorMenuItems,
  labStaffMenuItems,
  t,
  signOut,
}: DesktopRightActionsProps) => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <div className="hidden lg:flex items-center gap-2">
      {user ? (
        <>
          {/* Create Order Button - Doctor Only */}
          {userRole === "doctor" && (
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

          {/* Logistics - single button, goes to logistics dashboard */}
          {(userRole === "doctor" || userRole === "lab_staff") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 relative group overflow-hidden hover:bg-primary/10 hover:text-primary transition-all duration-300"
                  onClick={() => navigate("/logistics")}
                >
                  <span className="absolute inset-0 w-0 bg-primary/10 transition-all duration-300 group-hover:w-full" />
                  <Truck className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Logistics</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Wallet - Doctor Only */}
          {userRole === "doctor" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/wallet")}
                  className="h-9 w-9 relative group overflow-hidden hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  <span className="absolute inset-0 w-0 bg-primary/10 transition-all duration-300 group-hover:w-full" />
                  <Wallet className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Wallet</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Role-specific dropdown menu */}
          {(doctorMenuItems.length > 0 || labStaffMenuItems.length > 0) && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative group overflow-hidden hover:bg-warning/10 transition-all duration-300">
                      {userRole === "lab_staff" || userRole === "admin" ? (
                        <>
                          <span className="absolute inset-0 w-0 bg-warning/10 transition-all duration-300 group-hover:w-full" />
                          <Star className="h-5 w-5 text-warning relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                        </>
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{userRole === "lab_staff" || userRole === "admin" ? "Lab Tools" : "Lab Management"}</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="min-w-[200px] bg-background">
                {doctorMenuItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="flex items-center justify-between w-full cursor-pointer">
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="default" className="ml-2 min-w-[1.5rem] h-5 flex items-center justify-center px-1.5 font-bold text-xs">
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

          {/* Achievements Icon */}
          {(userRole === "doctor" || userRole === "lab_staff") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(userRole === "doctor" ? "/doctor-achievements" : "/lab-achievements")}
                  className="h-9 w-9 relative group overflow-hidden hover:bg-accent/10 hover:text-accent transition-all duration-300"
                >
                  <span className="absolute inset-0 w-0 bg-accent/10 transition-all duration-300 group-hover:w-full" />
                  <Trophy className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-accent" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View your achievements</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Inbox Icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative group overflow-hidden hover:bg-primary/10 hover:text-primary transition-all duration-300"
                onClick={() => navigate("/inbox")}
              >
                <span className="absolute inset-0 w-0 bg-primary/10 transition-all duration-300 group-hover:w-full" />
                <InboxIcon className="h-4 w-4 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-primary" />
                {unreadCount > 0 && (
                  <motion.span
                    className={`absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center font-bold shadow-lg border-2 border-background ${
                      hasUrgent ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: 1,
                      ...(hasUrgent && {
                        boxShadow: [
                          "0 0 0 0 hsl(var(--destructive) / 0.7)",
                          "0 0 0 8px hsl(var(--destructive) / 0)",
                          "0 0 0 0 hsl(var(--destructive) / 0)",
                        ],
                      }),
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: 500, damping: 25 },
                      boxShadow: hasUrgent ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {},
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hasUrgent ? "🔔 Urgent notifications!" : `Inbox ${unreadCount > 0 ? `(${unreadCount})` : ""}`}</p>
            </TooltipContent>
          </Tooltip>

          {/* Admin Panel Icon */}
          {userRole === "admin" && (
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

          {/* Account Dropdown — includes Profile, Settings, Language, Theme, Sign Out */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden xl:inline">{t.nav.account}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem asChild>
                <Link to="/profile">{t.nav.profile}</Link>
              </DropdownMenuItem>
              {userRole === "doctor" && (
                <DropdownMenuItem asChild>
                  <Link to="/wallet" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Wallet & Plans
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t.nav.settings}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {language === "en" ? "العربية" : "English"}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                    {theme === "light" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                    {theme === "dark" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                    {theme === "system" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                {t.nav.signOut}
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
                size="icon"
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                className="h-9 w-9"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{language === "en" ? "العربية" : "English"}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                {t.nav.signIn}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sign in to your account</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={() => navigate("/auth")}>
                {t.nav.signUp}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new account</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
};
