import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

// Routes where onboarding check is skipped
const ONBOARDING_EXEMPT = [
  "/onboarding",
  "/profile-completion",
  "/settings",
  "/install",
  "/support",
  "/admin",
];

const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user!.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id && !skipOnboardingCheck,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Onboarding enforcement — admins are exempt entirely
  useEffect(() => {
    if (loading || profileLoading || roleLoading || !user || skipOnboardingCheck) return;
    if (isAdmin) return; // Admins never need to fill clinic info
    const isExempt = ONBOARDING_EXEMPT.some((r) => location.pathname.startsWith(r));
    if (isExempt) return;

    if (profile && profile.onboarding_completed === false) {
      navigate("/profile-completion", { replace: true });
    }
  }, [loading, profileLoading, roleLoading, isAdmin, user, profile, skipOnboardingCheck, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
