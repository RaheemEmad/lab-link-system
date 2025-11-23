import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, MapPin, Star, TrendingUp, ExternalLink, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { AcceptanceAnimation } from "@/components/order/AcceptanceAnimation";
import { OrderChatWindow } from "@/components/chat/OrderChatWindow";

export default function LabRequestsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [acceptedRequest, setAcceptedRequest] = useState<{ id: string; orderId: string; orderNumber: string } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const currentUserRole = 'doctor' as const;

  // Fetch all requests for this doctor's orders with full lab details
  const { data: requests, isLoading, refetch } = useQuery({
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
            urgency,
            doctor_id
          ),
          labs (
            id,
            name,
            description,
            logo_url,
            address,
            contact_email,
            contact_phone,
            website_url,
            pricing_tier,
            performance_score,
            standard_sla_days,
            urgent_sla_days,
            current_load,
            max_capacity
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Filter only requests for this doctor's orders
      return data?.filter((req: any) => req.orders?.doctor_id === user.id) || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Update request status - MUST be before any conditional returns
  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, orderId, orderNumber }: { requestId: string; status: string; orderId?: string; orderNumber?: string }) => {
      const { error } = await supabase
        .from("lab_work_requests")
        .update({ status })
        .eq("id", requestId);
      
      if (error) throw error;
      return { requestId, orderId, orderNumber };
    },
    onSuccess: (data, variables) => {
      if (variables.status === 'accepted' && data.orderNumber && data.orderId) {
        // Show animation for acceptance
        setAcceptedRequest({ id: variables.requestId, orderId: data.orderId, orderNumber: data.orderNumber });
      } else {
        // Regular flow for declined requests
        queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        
        toast({
          title: "Request Declined",
          description: "The order has been removed from the lab's marketplace.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Loading state check AFTER all hooks
  if (isLoading) {
    return (
      <ProtectedRoute>
        <LoadingScreen message="Loading lab applications..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {acceptedRequest && (
        <AcceptanceAnimation
          orderNumber={acceptedRequest.orderNumber}
          orderId={acceptedRequest.orderId}
          onChatOpen={() => setShowChat(true)}
          onComplete={() => {
            setAcceptedRequest(null);
            queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
          }}
        />
      )}

      {showChat && acceptedRequest && (
        <OrderChatWindow
          orderId={acceptedRequest.orderId}
          orderNumber={acceptedRequest.orderNumber}
          currentUserRole={currentUserRole}
          onClose={() => setShowChat(false)}
        />
      )}
      
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Lab Applications</h1>
              <p className="text-muted-foreground">
                Review lab profiles and approve or decline applications for your auto-assign orders
              </p>
            </div>

            {!requests || requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No lab applications at the moment
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    When labs apply to your auto-assign orders, they'll appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {requests.map((request: any) => {
                  const lab = request.labs;
                  const order = request.orders;
                  const capacityPercentage = lab?.max_capacity 
                    ? (lab.current_load / lab.max_capacity) * 100 
                    : 0;
                  
                  return (
                    <Card key={request.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {lab?.logo_url && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img 
                                  src={lab.logo_url} 
                                  alt={lab.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-xl">{lab?.name || 'Unknown Lab'}</CardTitle>
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
                              <CardDescription className="line-clamp-2">
                                {lab?.description || 'No description available'}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Order Info */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-3">Order Details</h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Order Number</p>
                              <p className="font-medium">{order?.order_number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Patient</p>
                              <p className="font-medium">{order?.patient_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Type</p>
                              <p className="font-medium">{order?.restoration_type}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Lab Profile Summary */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Rating</p>
                              <p className="font-semibold">
                                {lab?.performance_score?.toFixed(1) || 'N/A'}/5
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Turnaround</p>
                              <p className="font-semibold">
                                {order?.urgency === 'Urgent' 
                                  ? `${lab?.urgent_sla_days || 'N/A'} days`
                                  : `${lab?.standard_sla_days || 'N/A'} days`
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Capacity</p>
                              <p className="font-semibold">
                                {capacityPercentage < 80 ? 'Available' : 'High Load'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="font-semibold truncate">
                                {lab?.address?.split(',')[0] || 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedLab(lab);
                              setProfileDialogOpen(true);
                            }}
                            className="flex-1"
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            View Full Profile
                          </Button>
                          
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                onClick={() => updateRequestStatus.mutate({ 
                                  requestId: request.id, 
                                  status: 'accepted',
                                  orderId: order?.id,
                                  orderNumber: order?.order_number
                                })}
                                disabled={updateRequestStatus.isPending}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept & Assign
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => updateRequestStatus.mutate({ 
                                  requestId: request.id, 
                                  status: 'refused' 
                                })}
                                disabled={updateRequestStatus.isPending}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Applied: {new Date(request.created_at).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {/* Lab Profile Dialog */}
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {selectedLab?.logo_url && (
                      <img 
                        src={selectedLab.logo_url} 
                        alt={selectedLab.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    {selectedLab?.name}
                  </DialogTitle>
                  <DialogDescription>
                    Complete lab profile and capabilities
                  </DialogDescription>
                </DialogHeader>
                
                {selectedLab && (
                  <div className="space-y-6">
                    {/* About */}
                    {selectedLab.description && (
                      <div>
                        <h4 className="font-semibold mb-2">About</h4>
                        <p className="text-sm text-muted-foreground">{selectedLab.description}</p>
                      </div>
                    )}
                    
                    {/* Key Metrics */}
                    <div>
                      <h4 className="font-semibold mb-3">Performance</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Star className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Performance Score</p>
                            <p className="font-semibold">{selectedLab.performance_score?.toFixed(1)}/5.0</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Clock className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Standard Turnaround</p>
                            <p className="font-semibold">{selectedLab.standard_sla_days} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Urgent Turnaround</p>
                            <p className="font-semibold">{selectedLab.urgent_sla_days} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Badge variant="outline" className="text-sm">
                            {selectedLab.pricing_tier}
                          </Badge>
                          <div>
                            <p className="text-xs text-muted-foreground">Pricing Tier</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div>
                      <h4 className="font-semibold mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        {selectedLab.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-sm">{selectedLab.address}</p>
                          </div>
                        )}
                        {selectedLab.contact_email && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Email:</span>
                            <a href={`mailto:${selectedLab.contact_email}`} className="text-sm text-primary hover:underline">
                              {selectedLab.contact_email}
                            </a>
                          </div>
                        )}
                        {selectedLab.contact_phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <a href={`tel:${selectedLab.contact_phone}`} className="text-sm text-primary hover:underline">
                              {selectedLab.contact_phone}
                            </a>
                          </div>
                        )}
                        {selectedLab.website_url && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={selectedLab.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Capacity Status */}
                    <div>
                      <h4 className="font-semibold mb-3">Current Capacity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current Load: {selectedLab.current_load} / {selectedLab.max_capacity}</span>
                          <span>{((selectedLab.current_load / selectedLab.max_capacity) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              (selectedLab.current_load / selectedLab.max_capacity) > 0.8 
                                ? 'bg-destructive' 
                                : (selectedLab.current_load / selectedLab.max_capacity) > 0.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-success'
                            }`}
                            style={{ width: `${Math.min((selectedLab.current_load / selectedLab.max_capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
