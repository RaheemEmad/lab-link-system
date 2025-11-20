import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Download } from "lucide-react";
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

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const navLinks = [
    { label: "How It Works", href: "#how-it-works", type: "anchor" },
    { label: "About", href: "/about", type: "route" },
    { label: "Contact", href: "/contact", type: "route" },
  ];

  const userLinks = user ? [
    { label: "Submit Order", href: "/new-order" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Profile", href: "/profile" },
  ] : [];

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
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div 
            className="text-2xl font-bold text-primary cursor-pointer"
            onClick={() => navigate("/")}
          >
            LabLink
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
            {userLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
          
          {/* Desktop Auth buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {isInstallable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/install")}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden xl:inline">Install App</span>
              </Button>
            )}
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden xl:inline">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  Sign Up
                </Button>
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
                    {navLinks.map((link) => (
                      <button
                        key={link.href}
                        onClick={() => handleNavClick(link)}
                        className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>

                  {/* User Links */}
                  {userLinks.length > 0 && (
                    <>
                      <div className="border-t border-border my-2" />
                      <div className="space-y-2">
                        {userLinks.map((link) => (
                          <button
                            key={link.href}
                            onClick={() => handleNavClick(link)}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            {link.label}
                          </button>
                        ))}
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
                          className="w-full"
                          onClick={() => {
                            signOut();
                            setIsOpen(false);
                          }}
                        >
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
  );
};

export default LandingNav;
