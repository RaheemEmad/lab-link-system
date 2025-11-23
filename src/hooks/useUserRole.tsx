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
  const { user } = useAuth();

  const {
    data,
    isLoading,
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
