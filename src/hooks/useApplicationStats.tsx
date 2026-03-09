import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useApplicationStats = () => {
  return useQuery({
    queryKey: ['application-stats'],
    queryFn: async () => {
      const [ordersResult, labsResult, deliveredResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('labs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Delivered')
      ]);
      
      return {
        totalOrders: ordersResult.count || 0,
        activeLabs: labsResult.count || 0,
        processedCases: deliveredResult.count || 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
