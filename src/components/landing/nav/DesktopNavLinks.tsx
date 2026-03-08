import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavLink {
  label: string;
  href: string;
  type?: string;
}

interface DesktopNavLinksProps {
  links: NavLink[];
  userRole: string | null;
  newOrdersCount?: number;
  onNavClick: (link: NavLink) => void;
  isLinkActive: (link: NavLink) => boolean;
}

export const DesktopNavLinks = ({
  links,
  userRole,
  newOrdersCount,
  onNavClick,
  isLinkActive,
}: DesktopNavLinksProps) => {
  return (
    <div className="hidden lg:flex items-center gap-6">
      {links.map((link) => (
        <Tooltip key={link.href}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onNavClick(link)}
              className={`relative inline-flex items-center gap-1 text-sm font-medium transition-all duration-300 group ${
                isLinkActive(link)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="relative z-10">{link.label}</span>
              {isLinkActive(link) && (
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-accent"
                  layoutId="activeNav"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {!isLinkActive(link) && (
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
              )}
              {link.label === "Marketplace" && userRole === "lab_staff" && newOrdersCount && newOrdersCount > 0 && (
                <motion.span
                  className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold text-primary-foreground bg-gradient-to-r from-primary to-accent rounded-full shadow-lg border-2 border-background"
                  initial={{ scale: 0 }}
                  animate={{
                    scale: 1,
                    boxShadow: [
                      "0 0 0 0 hsl(var(--primary) / 0.7)",
                      "0 0 0 8px hsl(var(--primary) / 0)",
                      "0 0 0 0 hsl(var(--primary) / 0)",
                    ],
                  }}
                  transition={{
                    scale: { type: "spring", stiffness: 500, damping: 25 },
                    boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeOut" },
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
  );
};
