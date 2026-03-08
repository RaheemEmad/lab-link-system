import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";
import { toast } from "sonner";

export interface InventoryItem {
  id: string;
  lab_id: string;
  material_name: string;
  category: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  cost_per_unit: number | null;
  supplier_name: string | null;
  last_restocked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const INVENTORY_CATEGORIES = [
  "Zirconia",
  "Porcelain",
  "Acrylic",
  "Metal Alloy",
  "Impression Materials",
  "Other",
] as const;

export function useLabInventory() {
  const { labId } = useUserRole();
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["lab-inventory", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_inventory")
        .select("*")
        .eq("lab_id", labId!)
        .order("category", { ascending: true })
        .order("material_name", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!labId,
    staleTime: 30_000,
  });

  const addItem = useMutation({
    mutationFn: async (params: Omit<InventoryItem, "id" | "lab_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("lab_inventory")
        .insert({ ...params, lab_id: labId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-inventory", labId] });
      toast.success("Item added to inventory");
    },
    onError: (error: any) => {
      toast.error("Failed to add item", { description: error.message });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("lab_inventory")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-inventory", labId] });
      toast.success("Item updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update item", { description: error.message });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lab_inventory")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-inventory", labId] });
      toast.success("Item removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove item", { description: error.message });
    },
  });

  const lowStockItems = (inventoryQuery.data ?? []).filter(
    (item) => item.current_stock <= item.minimum_stock && item.minimum_stock > 0
  );

  return {
    items: inventoryQuery.data ?? [],
    lowStockItems,
    isLoading: inventoryQuery.isLoading,
    error: inventoryQuery.error,
    addItem,
    updateItem,
    deleteItem,
  };
}
