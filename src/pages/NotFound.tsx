import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Home, LayoutDashboard, Search, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNav />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <div className="text-8xl font-bold text-primary/20 mb-2 select-none">404</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-8">
            The page <code className="px-1.5 py-0.5 rounded bg-muted text-sm">{location.pathname}</code> doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">Looking for something?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: "New Order", href: "/new-order" },
                { label: "Labs", href: "/labs" },
                { label: "Support", href: "/contact" },
              ].map((link) => (
                <Button key={link.href} variant="ghost" size="sm" asChild>
                  <Link to={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
};

export default NotFound;
