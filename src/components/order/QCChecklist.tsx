import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardCheck, Upload, Camera, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface QCItem {
  id: string;
  order_id: string;
  item_name: string;
  item_description: string | null;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

interface QCChecklistProps {
  orderId: string;
  orderStatus: string;
  onStatusUpdateAllowed: (allowed: boolean) => void;
}

export const QCChecklist = ({ orderId, orderStatus, onStatusUpdateAllowed }: QCChecklistProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<QCItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QCItem | null>(null);
  const [itemNotes, setItemNotes] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchQCItems();

    // Set up realtime subscription
    const channel = supabase
      .channel(`qc-items-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qc_checklist_items',
          filter: `order_id=eq.${orderId}`
        },
        () => {
          fetchQCItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    // Check if all items are completed
    const allCompleted = items.length > 0 && items.every(item => item.is_completed);
    onStatusUpdateAllowed(allCompleted);
  }, [items, onStatusUpdateAllowed]);

  const fetchQCItems = async () => {
    try {
      const { data, error } = await supabase
        .from('qc_checklist_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // If no items exist, initialize default checklist
      if (!data || data.length === 0) {
        await initializeChecklist();
      } else {
        setItems(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching QC items:', error);
      toast.error("Failed to load QC checklist", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeChecklist = async () => {
    try {
      const { error } = await supabase.rpc('initialize_qc_checklist', {
        order_id_param: orderId
      });

      if (error) throw error;
      await fetchQCItems();
      toast.success("QC checklist initialized");
    } catch (error: any) {
      console.error('Error initializing checklist:', error);
      toast.error("Failed to initialize checklist", {
        description: error.message
      });
    }
  };

  const toggleItemCompletion = async (item: QCItem) => {
    try {
      const newCompletedState = !item.is_completed;
      const { error } = await supabase
        .from('qc_checklist_items')
        .update({
          is_completed: newCompletedState,
          completed_by: newCompletedState ? user?.id : null,
          completed_at: newCompletedState ? new Date().toISOString() : null
        })
        .eq('id', item.id);

      if (error) throw error;
      
      toast.success(newCompletedState ? "Item marked complete" : "Item unmarked");
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error("Failed to update item", {
        description: error.message
      });
    }
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${itemId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('qc-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('qc-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('qc_checklist_items')
        .update({ photo_url: publicUrl })
        .eq('id', itemId);

      if (updateError) throw updateError;

      toast.success("Photo uploaded successfully");
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error("Failed to upload photo", {
        description: error.message
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddNotes = async (itemId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('qc_checklist_items')
        .update({ notes })
        .eq('id', itemId);

      if (error) throw error;
      
      toast.success("Notes saved");
      setSelectedItem(null);
      setItemNotes("");
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast.error("Failed to save notes", {
        description: error.message
      });
    }
  };

  const completedCount = items.filter(item => item.is_completed).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Quality Control Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading checklist...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={allCompleted ? 'border-green-500/50 bg-green-500/5' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Quality Control Checklist
            </CardTitle>
            <CardDescription>
              Complete all QC steps before marking order as Ready for Delivery
            </CardDescription>
          </div>
          <Badge variant={allCompleted ? "default" : "secondary"}>
            {completedCount}/{totalCount} Complete ({completionPercentage}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!allCompleted && orderStatus === 'Ready for QC' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              All QC items must be completed before this order can be marked as Ready for Delivery.
            </p>
          </div>
        )}

        {allCompleted && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-900 dark:text-green-200">
              All QC items completed! This order is ready to be marked for delivery.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-colors ${
                item.is_completed 
                  ? 'bg-green-500/5 border-green-500/20' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={item.id}
                  checked={item.is_completed}
                  onCheckedChange={() => toggleItemCompletion(item)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <Label
                      htmlFor={item.id}
                      className={`text-sm font-medium cursor-pointer ${
                        item.is_completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.item_name}
                    </Label>
                    {item.item_description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.item_description}
                      </p>
                    )}
                  </div>

                  {item.is_completed && item.completed_at && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Completed {formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs bg-muted p-2 rounded">
                      <strong>Notes:</strong> {item.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setItemNotes(item.notes || "");
                          }}
                        >
                          <Camera className="h-3 w-3 mr-2" />
                          {item.notes ? "Edit Notes" : "Add Notes"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{item.item_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Notes</Label>
                            <Textarea
                              value={itemNotes}
                              onChange={(e) => setItemNotes(e.target.value)}
                              placeholder="Add observations, measurements, or notes..."
                              rows={4}
                              className="mt-2"
                            />
                          </div>
                          <Button
                            onClick={() => handleAddNotes(item.id, itemNotes)}
                            className="w-full"
                          >
                            Save Notes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(item.id, file);
                        }}
                        className="hidden"
                        id={`photo-${item.id}`}
                        disabled={uploadingPhoto}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        disabled={uploadingPhoto}
                      >
                        <label htmlFor={`photo-${item.id}`} className="cursor-pointer">
                          <Upload className="h-3 w-3 mr-2" />
                          {uploadingPhoto ? "Uploading..." : item.photo_url ? "Update Photo" : "Add Photo"}
                        </label>
                      </Button>
                    </div>

                    {item.photo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                          View Photo
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
