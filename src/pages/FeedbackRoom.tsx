import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import FeedbackRoomLayout from "@/components/feedback-room/FeedbackRoomLayout";

const FeedbackRoom = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isLoading: roleLoading } = useUserRole();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Fetch order details to verify access
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("Order ID is required");

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          labs (
            id,
            name,
            contact_email
          )
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Verify user has access to this order
  useEffect(() => {
    if (roleLoading || orderLoading || !order || !user) return;

    const checkAccess = async () => {
      // Doctors can access their own orders
      if (isDoctor && order.doctor_id === user.id) {
        setHasAccess(true);
        return;
      }

      // Lab staff can access orders they're assigned to
      if (isLabStaff && order.assigned_lab_id) {
        const { data: assignment } = await supabase
          .from("order_assignments")
          .select("id")
          .eq("order_id", orderId!)
          .eq("user_id", user.id)
          .maybeSingle();

        if (assignment) {
          setHasAccess(true);
          return;
        }
      }

      setHasAccess(false);
      toast.error("You don't have access to this order");
      navigate("/dashboard");
    };

    checkAccess();
  }, [order, user, isDoctor, isLabStaff, roleLoading, orderLoading, orderId, navigate]);

  if (roleLoading || orderLoading || hasAccess === null) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading Feedback Room...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!hasAccess || !order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold mb-4">Access Denied</p>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <FeedbackRoomLayout order={order} />
    </ProtectedRoute>
  );
};

export default FeedbackRoom;
