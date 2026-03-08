import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Plus,
  Store,
  Bell,
  User,
  FileText,
  Settings,
  MessageSquare,
  Package,
  Truck,
  Building2,
  Search,
  Home,
} from "lucide-react";

interface PageItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const PAGES: PageItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Order", href: "/new-order", icon: Plus, roles: ["doctor"] },
  { label: "Orders Marketplace", href: "/orders-marketplace", icon: Store, roles: ["lab_staff"] },
  { label: "Order Tracking", href: "/order-tracking", icon: Package },
  { label: "Lab Workflow", href: "/lab-workflow", icon: Building2, roles: ["lab_staff"] },
  { label: "Logistics", href: "/logistics", icon: Truck },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Chat History", href: "/chat-history", icon: MessageSquare },
  { label: "Feedback Room", href: "/feedback-room", icon: MessageSquare },
  { label: "Drafts", href: "/drafts", icon: FileText },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Labs Directory", href: "/labs", icon: Building2 },
  { label: "Preferred Labs", href: "/preferred-labs", icon: Building2, roles: ["doctor"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate]
  );

  const filteredPages = PAGES.filter((page) => {
    if (!page.roles) return true;
    if (!role) return false;
    return page.roles.includes(role);
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, orders, labs..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {filteredPages.map((page) => (
            <CommandItem
              key={page.href}
              value={page.label}
              onSelect={() => handleSelect(page.href)}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {user && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              <CommandItem
                value="search-orders"
                onSelect={() => handleSelect("/order-tracking")}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Search Orders</span>
              </CommandItem>
              <CommandItem
                value="browse-labs"
                onSelect={() => handleSelect("/labs")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span>Browse Labs</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
