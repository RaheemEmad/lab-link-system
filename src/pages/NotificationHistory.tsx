import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, CheckCheck, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { formatDistanceToNow } from "date-fns";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Notification {
  id: string;
  order_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  orders: {
    order_number: string;
    patient_name: string;
  };
}

const NotificationHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id, filter],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      let query = supabase
        .from("notifications")
        .select(`
          *,
          orders (
            order_number,
            patient_name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.eq("read", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all notification-related queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  // Mark all as read mutation - FIXED
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      console.log('[NotificationHistory] Marking all notifications as read for user:', user.id);

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error('[NotificationHistory] Error marking all as read:', error);
        throw error;
      }

      console.log('[NotificationHistory] Successfully marked all notifications as read');
    },
    onSuccess: () => {
      // CRITICAL: Invalidate ALL notification-related queries to update nav badge
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: Error) => {
      console.error('[NotificationHistory] Mark all read mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark notifications as read",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'new_marketplace_order') {
      navigate('/orders-marketplace');
    } else if (notification.type === 'lab_request') {
      navigate('/lab-requests');
    } else if (notification.type === 'new_note' || notification.type === 'shipment_update') {
      navigate('/logistics');
    } else {
      navigate(`/dashboard?orderId=${notification.order_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "status_change":
        return "📊";
      case "new_note":
        return "📝";
      case "assignment":
        return "👤";
      case "new_marketplace_order":
        return "🏪";
      case "lab_request":
        return "📋";
      case "request_accepted":
        return "✅";
      case "request_refused":
        return "❌";
      default:
        return "🔔";
    }
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <TooltipProvider delayDuration={200}>
          <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
            <div className="container px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6">Notification History</h1>

              <Card>
                <CardHeader>
                  <CardTitle>Notification History</CardTitle>
                  <CardDescription>Loading notifications...</CardDescription>
                </CardHeader>
                <CardContent>
                  <SkeletonCard />
                </CardContent>
              </Card>
            </div>
          </div>
        </TooltipProvider>
        <LandingFooter />
      </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <TooltipProvider delayDuration={200}>
          <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
            <div className="container px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold">Notification History</h1>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={markAllAsRead}
                      disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                      variant="outline"
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark All Read
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mark all notifications as read</p>
                  </TooltipContent>
                </Tooltip>
              </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification History
                    </CardTitle>
                    <CardDescription className="mt-2">
                      View all notifications about your orders
                      {unreadCount > 0 && (
                        <Badge variant="default" className="ml-2">
                          {unreadCount} unread
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={markAllAsRead}
                          disabled={markAllAsReadMutation.isPending}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          {markAllAsReadMutation.isPending ? "Marking..." : "Mark All Read"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark all {unreadCount} notification{unreadCount > 1 ? 's' : ''} as read</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardHeader>
            <CardContent>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="all">All Notifications</TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="space-y-3">
                  {!notifications || notifications.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Bell className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-base sm:text-lg font-medium mb-2 text-foreground">
                        {filter === "unread"
                          ? "No unread notifications"
                          : "No notifications yet"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        You'll receive notifications when order statuses change or notes are added
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`
                            p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md
                            ${
                              notification.read
                                ? "bg-background border-border"
                                : "bg-primary/5 border-primary/20"
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm md:text-base">
                                    {notification.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {formatDistanceToNow(new Date(notification.created_at), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <Badge variant="default" className="shrink-0">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
            </div>
          </div>
        </TooltipProvider>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default NotificationHistory;
