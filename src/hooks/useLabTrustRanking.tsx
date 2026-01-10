import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

interface Lab {
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
}

interface LabPricing {
  lab_id: string;
  restoration_type: string;
  fixed_price: number | null;
  min_price: number | null;
  max_price: number | null;
  includes_rush: boolean;
  rush_surcharge_percent: number;
}

interface LabSpecialization {
  lab_id: string;
  restoration_type: string;
  expertise_level: 'basic' | 'intermediate' | 'expert';
  turnaround_days: number;
}

interface LabReview {
  lab_id: string;
  rating: number;
}

interface LabPerformanceMetrics {
  lab_id: string;
  completed_orders: number;
  on_time_deliveries: number;
  total_orders: number;
}

export interface RankedLab extends Lab {
  pricing: LabPricing | null;
  specialization: LabSpecialization | null;
  averageRating: number | null;
  totalReviews: number;
  completedOrders: number;
  onTimeRate: number;
  estimatedDeliveryDays: number;
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
  // Fetch active labs with trust-based fields
  const { data: labs, isLoading: labsLoading } = useQuery({
    queryKey: ["trust-ranked-labs", restorationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name, trust_score, min_price_egp, max_price_egp, is_new_lab, visibility_tier, standard_sla_days, urgent_sla_days, current_load, max_capacity, performance_score, description")
        .eq("is_active", true)
        .order("trust_score", { ascending: false });
      
      if (error) throw error;
      return data as Lab[];
    },
    staleTime: 60000,
  });

  // Fetch lab pricing for restoration type
  const { data: pricing } = useQuery({
    queryKey: ["lab-pricing", restorationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pricing")
        .select("*")
        .eq("restoration_type", restorationType as any);
      
      if (error) throw error;
      return data as LabPricing[];
    },
    staleTime: 60000,
  });

  // Fetch lab specializations
  const { data: specializations } = useQuery({
    queryKey: ["lab-specializations", restorationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_specializations")
        .select("lab_id, restoration_type, expertise_level, turnaround_days")
        .eq("restoration_type", restorationType as Database["public"]["Enums"]["restoration_type"]);
      
      if (error) throw error;
      return data as LabSpecialization[];
    },
    staleTime: 60000,
  });

  // Fetch lab reviews for ratings
  const { data: reviews } = useQuery({
    queryKey: ["lab-reviews-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_reviews")
        .select("lab_id, rating");
      
      if (error) throw error;
      return data as LabReview[];
    },
    staleTime: 120000,
  });

  // Fetch performance metrics
  const { data: metrics } = useQuery({
    queryKey: ["lab-performance-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_performance_metrics")
        .select("lab_id, completed_orders, on_time_deliveries, total_orders");
      
      if (error) throw error;
      return data as LabPerformanceMetrics[];
    },
    staleTime: 120000,
  });

  // Fetch user's preferred labs
  const { data: preferredLabs } = useQuery({
    queryKey: ["preferred-labs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preferred_labs")
        .select("lab_id, priority_order")
        .eq("dentist_id", userId)
        .order("priority_order");
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 120000,
  });

  const isLoading = labsLoading;

  // Process and rank labs
  const rankedLabs: RankedLab[] = (labs || [])
    .filter(lab => {
      // Filter out labs at capacity
      if (lab.current_load >= lab.max_capacity) return false;
      
      // Check if lab has specialization for this restoration type
      const hasSpec = specializations?.some(s => s.lab_id === lab.id);
      
      // Allow labs without specialization but with lower priority
      return true;
    })
    .map(lab => {
      const labPricing = pricing?.find(p => p.lab_id === lab.id) || null;
      const spec = specializations?.find(s => s.lab_id === lab.id) || null;
      const labReviews = reviews?.filter(r => r.lab_id === lab.id) || [];
      const labMetrics = metrics?.find(m => m.lab_id === lab.id);
      
      const averageRating = labReviews.length > 0 
        ? labReviews.reduce((acc, r) => acc + r.rating, 0) / labReviews.length 
        : null;
      
      const completedOrders = labMetrics?.completed_orders || 0;
      const onTimeRate = labMetrics && labMetrics.completed_orders > 0
        ? (labMetrics.on_time_deliveries / labMetrics.completed_orders) * 100
        : 0;
      
      // Calculate estimated delivery days
      const baseDays = urgency === 'Urgent' ? lab.urgent_sla_days : lab.standard_sla_days;
      const estimatedDeliveryDays = spec?.turnaround_days || baseDays;
      
      return {
        ...lab,
        pricing: labPricing,
        specialization: spec,
        averageRating,
        totalReviews: labReviews.length,
        completedOrders,
        onTimeRate,
        estimatedDeliveryDays,
        rank: 0,
      };
    })
    .sort((a, b) => {
      // Preferred labs first
      const aPreferred = preferredLabs?.some(p => p.lab_id === a.id);
      const bPreferred = preferredLabs?.some(p => p.lab_id === b.id);
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      
      // Then by trust score
      const trustDiff = (b.trust_score || 0) - (a.trust_score || 0);
      if (Math.abs(trustDiff) > 0.3) return trustDiff;
      
      // Then by specialization (has spec > no spec)
      if (a.specialization && !b.specialization) return -1;
      if (!a.specialization && b.specialization) return 1;
      
      // Then by visibility tier
      const tierOrder = { elite: 4, trusted: 3, established: 2, emerging: 1 };
      const tierDiff = (tierOrder[b.visibility_tier] || 0) - (tierOrder[a.visibility_tier] || 0);
      if (tierDiff !== 0) return tierDiff;
      
      // Finally by on-time rate
      return b.onTimeRate - a.onTimeRate;
    })
    .map((lab, index) => ({ ...lab, rank: index + 1 }))
    .slice(0, limit);

  // Apply visibility rules for new labs
  const finalRankedLabs = rankedLabs.map(lab => {
    // New labs can only appear in positions 4-5
    if (lab.is_new_lab && lab.rank <= 3) {
      return { ...lab, rank: Math.max(lab.rank, 4) };
    }
    return lab;
  }).sort((a, b) => a.rank - b.rank);

  return {
    rankedLabs: finalRankedLabs,
    isLoading,
    preferredLabIds: preferredLabs?.map(p => p.lab_id) || [],
  };
};

// Helper to format EGP currency
export const formatEGP = (amount: number): string => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
};
