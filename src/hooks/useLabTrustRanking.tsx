import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RankedLab {
  id: string;
  name: string;
  trust_score: number;
  min_price_egp: number;
  max_price_egp: number;
  is_new_lab: boolean;
  visibility_tier: 'emerging' | 'established' | 'trusted' | 'elite';
  standard_sla_days: number;
  urgent_sla_days: number;
  current_load: number;
  max_capacity: number;
  performance_score: number;
  description: string | null;
  pricing: {
    lab_id: string;
    restoration_type: string;
    fixed_price: number | null;
    min_price: number | null;
    max_price: number | null;
    includes_rush: boolean;
    rush_surcharge_percent: number;
  } | null;
  specialization: {
    lab_id: string;
    restoration_type: string;
    expertise_level: 'basic' | 'intermediate' | 'expert';
    turnaround_days: number;
  } | null;
  averageRating: number | null;
  totalReviews: number;
  completedOrders: number;
  onTimeRate: number;
  estimatedDeliveryDays: number;
  isPreferred: boolean;
  rank: number;
}

interface UseLabTrustRankingOptions {
  restorationType: string;
  urgency: 'Normal' | 'Urgent';
  userId: string;
  limit?: number;
}

export const useLabTrustRanking = ({
  restorationType,
  urgency,
  userId,
  limit = 5
}: UseLabTrustRankingOptions) => {
  const { data, isLoading } = useQuery({
    queryKey: ["trust-ranked-labs", restorationType, urgency, userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ranked_labs" as any, {
        p_restoration_type: restorationType,
        p_urgency: urgency,
        p_user_id: userId,
        p_limit: limit,
      });

      if (error) throw error;

      const labs = (data as any[]) || [];
      return labs.map((lab: any, index: number) => {
        const rank = index + 1;
        // New labs can only appear in positions 4-5
        const adjustedRank = lab.is_new_lab && rank <= 3 ? Math.max(rank, 4) : rank;
        return {
          ...lab,
          rank: adjustedRank,
        } as RankedLab;
      }).sort((a: RankedLab, b: RankedLab) => a.rank - b.rank);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    enabled: !!restorationType,
  });

  const rankedLabs = data || [];
  const preferredLabIds = rankedLabs.filter(l => l.isPreferred).map(l => l.id);

  return {
    rankedLabs,
    isLoading,
    preferredLabIds,
  };
};

// Re-exported from shared lib for backwards compatibility
export { formatEGP } from "@/lib/formatters";
