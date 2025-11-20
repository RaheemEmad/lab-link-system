import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderNote {
  id: string;
  note_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface OrderNotesDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
}

export default function OrderNotesDialog({
  orderId,
  open,
  onOpenChange,
  orderNumber,
}: OrderNotesDialogProps) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      fetchNotes();
    }
  }, [open, orderId]);

  const fetchNotes = async () => {
    if (!orderId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          id,
          note_text,
          created_at,
          user_id,
          profiles (
            full_name,
            email
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!orderId || !newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("order_notes").insert({
        order_id: orderId,
        user_id: user.id,
        note_text: newNote.trim(),
      });

      if (error) throw error;

      toast.success("Note added successfully");
      setNewNote("");
      fetchNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Notes - {orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Note</label>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note here..."
                className="min-h-[80px]"
              />
              <Button
                onClick={handleAddNote}
                disabled={isSubmitting || !newNote.trim()}
                size="icon"
                className="shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Previous Notes</label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notes yet. Add the first note above.
              </div>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-secondary/30 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {note.profiles.full_name || note.profiles.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(note.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {note.note_text}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
