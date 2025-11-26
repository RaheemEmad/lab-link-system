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
    isPending: queryPending,
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
  // 2. Query is pending/loading (more reliable than queryLoading), OR
  // 3. User exists but query hasn't succeeded yet
  const isLoading = authLoading || queryPending || (!!user?.id && status === 'pending');
  
  // Role is only confirmed when we've successfully fetched the data
  const roleConfirmed = !isLoading && status === 'success' && !!user?.id;

  // DEBUG: Log state transitions
  useEffect(() => {
    console.debug('[useUserRole] State:', {
      authLoading,
      queryLoading,
      queryPending,
      isFetching,
      status,
      userId: user?.id,
      role: data?.role,
      labId: data?.lab_id,
      compositeIsLoading: isLoading,
      roleConfirmed,
      timestamp: new Date().toISOString()
    });
  }, [authLoading, queryLoading, queryPending, isFetching, status, user?.id, data?.role, data?.lab_id, isLoading, roleConfirmed]);

  return {
    role: roleConfirmed ? (data?.role ?? null) : null,
    labId: roleConfirmed ? (data?.lab_id ?? null) : null,
    isLoading,
    roleConfirmed, // New: explicit flag for when role is definitively known
    error,
    refetch,
    // Helper functions for role checks - DEFENSIVE: return false when role not confirmed
    isAdmin: roleConfirmed && data?.role === "admin",
    isLabStaff: roleConfirmed && data?.role === "lab_staff",
    isDoctor: roleConfirmed && data?.role === "doctor",
    hasRole: (requiredRole: UserRole) => roleConfirmed && data?.role === requiredRole,
    hasAnyRole: (roles: UserRole[]) => roleConfirmed && roles.includes(data?.role ?? null),
  };
};
