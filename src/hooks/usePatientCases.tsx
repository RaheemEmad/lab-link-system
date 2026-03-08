import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PatientCase {
  id: string;
  doctor_id: string;
  patient_name: string;
  restoration_type: string;
  teeth_number: string;
  teeth_shade: string;
  shade_system: string | null;
  biological_notes: string | null;
  preferred_lab_id: string | null;
  photos_link: string | null;
  last_order_id: string | null;
  order_count: number;
  created_at: string;
  updated_at: string;
  preferred_lab?: { id: string; name: string } | null;
}

export function usePatientCases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const casesQuery = useQuery({
    queryKey: ["patient-cases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_cases")
        .select("*, preferred_lab:labs(id, name)")
        .eq("doctor_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as PatientCase[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const createCase = useMutation({
    mutationFn: async (params: {
      patient_name: string;
      restoration_type: string;
      teeth_number: string;
      teeth_shade: string;
      shade_system?: string;
      biological_notes?: string;
      preferred_lab_id?: string | null;
      photos_link?: string;
      last_order_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("patient_cases")
        .insert({ ...params, doctor_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-cases", user?.id] });
      toast.success("Patient case saved");
    },
    onError: (error: any) => {
      toast.error("Failed to save case", { description: error.message });
    },
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PatientCase> & { id: string }) => {
      const { data, error } = await supabase
        .from("patient_cases")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-cases", user?.id] });
    },
    onError: (error: any) => {
      toast.error("Failed to update case", { description: error.message });
    },
  });

  const deleteCase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_cases")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-cases", user?.id] });
      toast.success("Patient case deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete case", { description: error.message });
    },
  });

  return {
    cases: casesQuery.data ?? [],
    isLoading: casesQuery.isLoading,
    error: casesQuery.error,
    createCase,
    updateCase,
    deleteCase,
  };
}
