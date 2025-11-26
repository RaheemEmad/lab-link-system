import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "lab_staff" | "doctor" | null;

interface UserRoleData {
  role: UserRole;
  lab_id: string | null;
}

/**
 * Hook to get the current user's role and lab association
 * @returns Object containing role, lab_id, loading state, and error
 */
export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const {
    data,
    isLoading: queryLoading,
    isFetching,
    status,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<UserRoleData | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role, lab_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserRoleData | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // CRITICAL FIX: Composite loading state
  // We're loading if:
  // 1. Auth is still loading, OR
  // 2. Query is loading/fetching, OR
  // 3. User exists but we don't have role data yet (prevents flash of wrong UI)
  const isLoading = authLoading || queryLoading || isFetching || (!!user?.id && !data);

  // DEBUG: Log state transitions
  useEffect(() => {
    console.debug('[useUserRole] State:', {
      authLoading,
      queryLoading,
      isFetching,
      status,
      userId: user?.id,
      role: data?.role,
      labId: data?.lab_id,
      compositeIsLoading: isLoading,
      timestamp: new Date().toISOString()
    });
  }, [authLoading, queryLoading, isFetching, status, user?.id, data?.role, data?.lab_id, isLoading]);

  return {
    role: data?.role ?? null,
    labId: data?.lab_id ?? null,
    isLoading,
    error,
    refetch,
    // Helper functions for role checks
    isAdmin: data?.role === "admin",
    isLabStaff: data?.role === "lab_staff",
    isDoctor: data?.role === "doctor",
    hasRole: (requiredRole: UserRole) => data?.role === requiredRole,
    hasAnyRole: (roles: UserRole[]) => roles.includes(data?.role ?? null),
  };
};
