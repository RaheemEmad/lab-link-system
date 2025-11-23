import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

export default function LabRequestsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all pending requests for this doctor's orders
  const { data: requests, isLoading } = useQuery({
    queryKey: ["lab-requests-doctor", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("lab_work_requests")
        .select(`
          *,
          orders (
            order_number,
            patient_name,
            restoration_type,
            urgency
          ),
          labs (
            name,
            pricing_tier,
            performance_score
          )
        `)
        .eq("orders.doctor_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update request status
  const updateRequest = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error } = await supabase
        .from("lab_work_requests")
        .update({ status })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user?.id] });
      toast({
        title: "Request updated",
        description: "The lab has been notified of your decision.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Lab Work Requests</h1>
              <p className="text-muted-foreground">
                Review and manage requests from labs to work on your orders
              </p>
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : !requests || requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No lab requests at the moment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request: any) => (
                  <Card key={request.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {request.labs?.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Order: {request.orders?.order_number} - {request.orders?.patient_name}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            request.status === 'pending' ? 'secondary' : 
                            request.status === 'accepted' ? 'default' : 
                            'destructive'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Restoration Type</p>
                          <p className="font-medium">{request.orders?.restoration_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Urgency</p>
                          <Badge variant={request.orders?.urgency === "Urgent" ? "destructive" : "secondary"}>
                            {request.orders?.urgency}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Lab Rating</p>
                          <p className="font-medium">
                            ⭐ {request.labs?.performance_score?.toFixed(1) || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="default"
                            onClick={() => updateRequest.mutate({ 
                              requestId: request.id, 
                              status: 'accepted' 
                            })}
                            disabled={updateRequest.isPending}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => updateRequest.mutate({ 
                              requestId: request.id, 
                              status: 'refused' 
                            })}
                            disabled={updateRequest.isPending}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Refuse
                          </Button>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Requested: {new Date(request.created_at).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
