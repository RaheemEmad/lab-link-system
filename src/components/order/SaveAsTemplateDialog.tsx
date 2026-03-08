import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, BookTemplate } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    restoration_type: string;
    teeth_number: string;
    teeth_shade: string;
    shade_system: string;
    urgency: string;
    biological_notes: string;
    handling_instructions: string;
    assigned_lab_id: string | null;
  };
}

export const SaveAsTemplateDialog = ({ open, onOpenChange, orderData }: SaveAsTemplateDialogProps) => {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("order_templates").insert({
        user_id: user.id,
        name: name.trim(),
        restoration_type: orderData.restoration_type,
        teeth_number: orderData.teeth_number,
        teeth_shade: orderData.teeth_shade,
        shade_system: orderData.shade_system,
        urgency: orderData.urgency,
        biological_notes: orderData.biological_notes || null,
        handling_instructions: orderData.handling_instructions || null,
        assigned_lab_id: orderData.assigned_lab_id,
      });

      if (error) throw error;

      toast.success("Template saved!", { description: `"${name.trim()}" is ready to use.` });
      queryClient.invalidateQueries({ queryKey: ["order-templates"] });
      setName("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save template error:", error);
      toast.error("Failed to save template", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this order configuration to quickly create similar orders in the future.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder='e.g. "Standard Zirconia Crown"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>Will save:</strong> {orderData.restoration_type} · {orderData.teeth_number || "No teeth"} · {orderData.teeth_shade} ({orderData.shade_system})</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
