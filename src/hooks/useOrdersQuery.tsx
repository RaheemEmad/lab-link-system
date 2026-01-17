import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

type OrderStatus = "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered" | "Cancelled";

interface Order {
  id: string;
  order_number: string;
  doctor_name: string;
  patient_name: string;
  restoration_type: string;
  teeth_shade: string;
  teeth_number: string;
  urgency: string;
  status: OrderStatus;
  timestamp: string;
  html_export: string | null;
  screenshot_url: string | null;
  assigned_lab_id: string | null;
  delivery_pending_confirmation: boolean | null;
  labs: {
    id: string;
    name: string;
    contact_email: string;
    contact_phone: string | null;
    description: string | null;
  } | null;
}

interface OrdersPage {
  orders: Order[];
  totalCount: number;
  nextPage: number | undefined;
}

const ORDERS_PER_PAGE = 25;

export const useOrdersQuery = (statusFilter: string = "all", searchTerm: string = "") => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isLoading: roleLoading, labId, role } = useUserRole();
  const queryClient = useQueryClient();

  // Build query key
  const queryKey = ["orders", { role, userId: user?.id, statusFilter, searchTerm }];

  // Infinite query for progressive loading
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user || roleLoading) {
        return { orders: [], totalCount: 0, nextPage: undefined };
      }

      const offset = pageParam * ORDERS_PER_PAGE;
      
      let query = supabase
        .from("orders")
        .select(`
          *,
          labs (
            id,
            name,
            contact_email,
            contact_phone,
            description
          )
        `, { count: "exact" })
        .order("timestamp", { ascending: false })
        .range(offset, offset + ORDERS_PER_PAGE - 1);

      // Role-based filtering
      if (isDoctor) {
        query = query.eq("doctor_id", user.id);
      } else if (isLabStaff) {
        query = query.not("assigned_lab_id", "is", null);
      }

      // Status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as OrderStatus);
      }

      // Search filter (client-side for now, could be moved to server)
      const { data, count, error } = await query;

      if (error) throw error;

      let orders = (data || []) as Order[];
      
      // Apply search filter
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        orders = orders.filter(order => 
          order.order_number.toLowerCase().includes(lowerSearch) ||
          order.patient_name.toLowerCase().includes(lowerSearch) ||
          order.doctor_name.toLowerCase().includes(lowerSearch)
        );
      }

      const totalCount = count || 0;
      const nextPage = offset + ORDERS_PER_PAGE < totalCount ? pageParam + 1 : undefined;

      return { orders, totalCount, nextPage } as OrdersPage;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user && !roleLoading,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten pages for display
  const orders = data?.pages.flatMap(page => page.orders) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Optimistic status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, notes }: { orderId: string; newStatus: OrderStatus; notes?: string }) => {
      const oldOrder = orders.find(o => o.id === orderId);
      
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) throw error;

      // Log status change in history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: oldOrder?.status || "Pending",
        new_status: newStatus,
        changed_by: user?.id,
        notes: notes || null
      });

      return { orderId, newStatus };
    },
    onMutate: async ({ orderId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update the order in cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: OrdersPage) => ({
            ...page,
            orders: page.orders.map((order: Order) =>
              order.id === orderId ? { ...order, status: newStatus } : order
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error("Failed to update status", {
        description: (err as Error).message,
      });
    },
    onSuccess: ({ newStatus }) => {
      toast.success("Status updated", {
        description: `Order status changed to ${newStatus}`,
      });
    },
    onSettled: () => {
      // Background revalidation
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
      return orderId;
    },
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically remove the order
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: OrdersPage) => ({
            ...page,
            orders: page.orders.filter((order: Order) => order.id !== orderId),
            totalCount: page.totalCount - 1,
          })),
        };
      });

      return { previousData };
    },
    onError: (err, orderId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error("Failed to delete order");
    },
    onSuccess: () => {
      toast.success("Order deleted successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Granular realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders-optimistic')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Update only the changed order in cache
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old?.pages) return old;
            
            return {
              ...old,
              pages: old.pages.map((page: OrdersPage) => ({
                ...page,
                orders: page.orders.map((order: Order) =>
                  order.id === payload.new.id 
                    ? { ...order, ...payload.new } 
                    : order
                ),
              })),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // For new orders, do a background refetch
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Remove deleted order from cache
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old?.pages) return old;
            
            return {
              ...old,
              pages: old.pages.map((page: OrdersPage) => ({
                ...page,
                orders: page.orders.filter((order: Order) => order.id !== payload.old.id),
              })),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryKey, queryClient]);

  // Set up realtime subscription
  useEffect(() => {
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription]);

  return {
    orders,
    totalCount,
    isLoading: isLoading || roleLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    deleteOrder: deleteOrderMutation.mutate,
    isDeletingOrder: deleteOrderMutation.isPending,
  };
};
