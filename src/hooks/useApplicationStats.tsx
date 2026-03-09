import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useApplicationStats = () => {
  return useQuery({
    queryKey: ['application-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_application_stats' as any);
      
      if (error) throw error;
      
      const stats = data as { totalOrders: number; activeLabs: number; processedCases: number } | null;
      
      return {
        totalOrders: stats?.totalOrders || 0,
        activeLabs: stats?.activeLabs || 0,
        processedCases: stats?.processedCases || 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
