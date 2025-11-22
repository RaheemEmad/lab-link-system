import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "doctor" | "lab_staff")[];
  redirectTo?: string;
}

const RoleGuard = ({ children, allowedRoles, redirectTo = "/dashboard" }: RoleGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (authLoading) return;

      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        // Check user's role
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          toast.error("Failed to verify permissions");
          navigate(redirectTo);
          return;
        }

        // Check if user has any of the allowed roles
        const userHasAllowedRole = userRoles?.some(
          (ur) => allowedRoles.includes(ur.role as any)
        );

        if (!userHasAllowedRole) {
          toast.error("You don't have permission to access this page");
          navigate(redirectTo);
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Error in RoleGuard:', error);
        navigate(redirectTo);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user, authLoading, allowedRoles, navigate, redirectTo]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;
