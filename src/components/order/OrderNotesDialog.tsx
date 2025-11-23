import { useState, useEffect, useRef } from "react";
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
import { Loader2, Send, Pencil, Trash2, Heart, Bell, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { SkeletonNote } from "@/components/ui/skeleton-card";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NOTE_MAX_LENGTH = 2000;

const noteSchema = z.object({
  note_text: z.string()
    .trim()
    .min(1, "Note cannot be empty")
    .max(NOTE_MAX_LENGTH, `Note must be less than ${NOTE_MAX_LENGTH} characters`),
});

interface OrderNote {
  id: string;
  note_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  like_count?: number;
  user_has_liked?: boolean;
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousNoteCountRef = useRef<number>(0);
  const { playNormalNotification } = useNotificationSound();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (open && orderId) {
      fetchNotes();

      // Subscribe to realtime changes
      const notesChannel = supabase
        .channel(`order-notes-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_notes',
            filter: `order_id=eq.${orderId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              // Check if the new note is from another user
              const newNoteUserId = (payload.new as any).user_id;
              
              if (newNoteUserId !== currentUserId) {
                // Play sound for notes from other users
                if (soundEnabled) {
                  playNormalNotification();
                }
                
                // Show toast notification
                toast.info("New note added", {
                  description: "A new note has been added to this order",
                  duration: 4000,
                });
              }
              
              fetchNotes(); // Refetch to get profile data and like counts
            } else if (payload.eventType === 'UPDATE') {
              fetchNotes();
            } else if (payload.eventType === 'DELETE') {
              setNotes(prev => prev.filter(note => note.id !== payload.old.id));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'note_likes'
          },
          (payload) => {
            // Refetch to update like counts when likes change
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              fetchNotes();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notesChannel);
      };
    }
  }, [open, orderId, currentUserId, soundEnabled, playNormalNotification]);

  const fetchNotes = async () => {
    if (!orderId) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          id,
          note_text,
          created_at,
          user_id,
          profiles!order_notes_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch like counts and user's like status for each note
      const notesWithLikes = await Promise.all(
        (data || []).map(async (note) => {
          const { count } = await supabase
            .from("note_likes")
            .select("*", { count: "exact", head: true })
            .eq("note_id", note.id);

          const { data: userLike } = await supabase
            .from("note_likes")
            .select("id")
            .eq("note_id", note.id)
            .eq("user_id", user?.id || "")
            .maybeSingle();

          return {
            ...note,
            like_count: count || 0,
            user_has_liked: !!userLike,
          };
        })
      );

      setNotes(notesWithLikes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!orderId) {
      toast.error("Order ID is missing");
      return;
    }

    // Validate note with schema
    const validation = noteSchema.safeParse({ note_text: newNote });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
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

  const handleEditNote = async (noteId: string) => {
    const validation = noteSchema.safeParse({ note_text: editText });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      const { error } = await supabase
        .from("order_notes")
        .update({ note_text: editText.trim() })
        .eq("id", noteId);

      if (error) throw error;

      toast.success("Note updated successfully");
      setEditingNoteId(null);
      setEditText("");
      fetchNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      const { error } = await supabase
        .from("order_notes")
        .delete()
        .eq("id", deleteNoteId);

      if (error) throw error;

      toast.success("Note deleted successfully");
      setDeleteNoteId(null);
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleToggleLike = async (noteId: string, currentlyLiked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (currentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from("note_likes")
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("note_likes")
          .insert({ note_id: noteId, user_id: user.id });

        if (error) throw error;
      }

      fetchNotes();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Order Notes - {orderNumber}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="gap-2"
            >
              {soundEnabled ? (
                <>
                  <Bell className="h-4 w-4" />
                  <span className="text-xs">Sound On</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  <span className="text-xs">Sound Off</span>
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Note */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Add Note</label>
              <span className="text-xs text-muted-foreground">
                {newNote.length}/{NOTE_MAX_LENGTH}
              </span>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note here..."
                className="min-h-[80px]"
                maxLength={NOTE_MAX_LENGTH}
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
              <div className="space-y-3">
                <SkeletonNote />
                <SkeletonNote />
                <SkeletonNote />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notes yet. Add the first note above.
              </div>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-4">
                  {notes.map((note) => {
                    const isAuthor = currentUserId === note.user_id;
                    const isEditing = editingNoteId === note.id;

                    return (
                      <div
                        key={note.id}
                        className="bg-secondary/30 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {note.profiles?.full_name || note.profiles?.email || 'Unknown User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(note.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {isAuthor && !isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditText(note.note_text);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteNoteId(note.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[80px]"
                              maxLength={NOTE_MAX_LENGTH}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditNote(note.id)}
                                disabled={!editText.trim()}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap">
                              {note.note_text}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleToggleLike(note.id, note.user_has_liked || false)
                                }
                                className={`h-8 gap-1.5 ${
                                  note.user_has_liked
                                    ? "text-red-500 hover:text-red-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Heart
                                  className={`h-4 w-4 ${
                                    note.user_has_liked ? "fill-current" : ""
                                  }`}
                                />
                                <span className="text-xs">
                                  {note.like_count || 0}
                                </span>
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
