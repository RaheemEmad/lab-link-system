import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Routes that don't require onboarding completion
const EXEMPT_ROUTES = [
  "/onboarding",
  "/profile-completion",
  "/auth",
  "/reset-password",
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/how-it-works",
  "/install",
  "/settings",
];

/**
 * Guard that redirects users who haven't completed onboarding.
 * Checks profile.onboarding_completed and redirects to /profile-completion.
 */
export const useOnboardingGuard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (authLoading || isLoading || !user) return;

    const isExempt = EXEMPT_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith("/invoice/"));
    if (isExempt) return;

    if (profile && !profile.onboarding_completed) {
      navigate("/profile-completion", { replace: true });
    }
  }, [authLoading, isLoading, user, profile, location.pathname, navigate]);

  return { isOnboarded: profile?.onboarding_completed ?? false, isLoading: authLoading || isLoading };
};
