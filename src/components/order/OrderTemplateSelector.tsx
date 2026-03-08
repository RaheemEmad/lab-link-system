import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookTemplate, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TemplateData {
  id: string;
  name: string;
  restoration_type: string | null;
  teeth_shade: string | null;
  shade_system: string | null;
  teeth_number: string | null;
  biological_notes: string | null;
  urgency: string | null;
  handling_instructions: string | null;
  assigned_lab_id: string | null;
  is_favorite: boolean;
  use_count: number;
}

interface OrderTemplateSelectorProps {
  onSelect: (template: TemplateData) => void;
  className?: string;
}

export const OrderTemplateSelector = ({ onSelect, className }: OrderTemplateSelectorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["order-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_templates")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_favorite", { ascending: false })
        .order("use_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as TemplateData[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("order_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const handleSelect = async (template: TemplateData) => {
    // Increment use count
    await supabase
      .from("order_templates")
      .update({ use_count: template.use_count + 1, updated_at: new Date().toISOString() })
      .eq("id", template.id);

    onSelect(template);
    setOpen(false);
    toast.success(`Template "${template.name}" applied`);
  };

  if (!templates || templates.length === 0) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={className}>
          <BookTemplate className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
          Templates
          <Badge variant="secondary" className="ltr:ml-1.5 rtl:mr-1.5 text-[10px] px-1.5">
            {templates.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Order Templates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            templates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                className="flex items-center justify-between cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  handleSelect(template);
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {template.is_favorite && <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {template.restoration_type} • {template.teeth_number || "No teeth"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(template.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
