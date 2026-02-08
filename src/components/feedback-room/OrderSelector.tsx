import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading-screen";

const OrderSelector = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isLoading: roleLoading, roleConfirmed } = useUserRole();

  // Fetch orders that qualify for Feedback Room
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["feedback-room-orders", user?.id, isDoctor, isLabStaff],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("orders")
        .select(`
          *,
          labs (
            id,
            name,
            contact_email
          )
        `)
        .not("assigned_lab_id", "is", null)
        .order("created_at", { ascending: false });

      if (isDoctor) {
        // Doctors see their own orders with assigned labs
        query = query.eq("doctor_id", user.id);
      } else if (isLabStaff) {
        // Lab staff see orders they're assigned to
        const { data: assignments } = await supabase
          .from("order_assignments")
          .select("order_id")
          .eq("user_id", user.id);

        if (!assignments || assignments.length === 0) {
          return [];
        }

        const orderIds = assignments.map((a) => a.order_id);
        query = query.in("id", orderIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    // CRITICAL FIX: Wait for roleConfirmed before enabling query
    enabled: !!user && roleConfirmed && (isDoctor || isLabStaff),
  });

  // Show loading while role is still being determined
  if (roleLoading || !roleConfirmed) {
    return <LoadingScreen message="Checking access..." />;
  }

  if (ordersLoading) {
    return <LoadingScreen message="Loading available orders..." />;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Orders Available</CardTitle>
            <CardDescription>
              {isDoctor
                ? "You don't have any orders with assigned labs yet. Orders will appear here once they're assigned to a lab."
                : "You don't have any assigned orders yet. Orders will appear here once you're assigned to them."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feedback Room</h1>
            <p className="text-muted-foreground mt-2">
              Select an order to enter its feedback room and collaborate
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <CardDescription>
                      {isDoctor ? `Lab: ${order.labs?.name || "Unknown"}` : `Doctor: ${order.doctor_name}`}
                    </CardDescription>
                  </div>
                  <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>
                    {order.urgency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Patient</p>
                    <p className="font-medium">{order.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{order.restoration_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/feedback-room/${order.id}`)}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enter Feedback Room
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderSelector;
