import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2, Pencil, Heart } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
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

interface OrderNote {
  id: string;
  order_id: string;
  user_id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
  like_count?: number;
  user_has_liked?: boolean;
}

interface OrderNotesProps {
  orderId: string;
}

export const OrderNotes = ({ orderId }: OrderNotesProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();

    // Set up realtime subscription
    const channel = supabase
      .channel(`order-notes-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_notes',
          filter: `order_id=eq.${orderId}`
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('order_notes')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

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
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast.error("Failed to load notes", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('order_notes')
        .insert([{
          order_id: orderId,
          user_id: user.id,
          note_text: newNote.trim()
        }]);

      if (error) throw error;

      setNewNote("");
      toast.success("Note added successfully");
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error("Failed to add note", {
        description: error.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editText.trim()) {
      toast.error("Note cannot be empty");
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
    } catch (error: any) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note", {
        description: error.message
      });
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      const { error } = await supabase
        .from('order_notes')
        .delete()
        .eq('id', deleteNoteId);

      if (error) throw error;
      toast.success("Note deleted successfully");
      setDeleteNoteId(null);
      fetchNotes();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error("Failed to delete note", {
        description: error.message
      });
    }
  };

  const handleToggleLike = async (noteId: string, currentlyLiked: boolean) => {
    try {
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
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like", {
        description: error.message
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Internal Notes
        </CardTitle>
        <CardDescription>
          Add notes visible to lab staff and the ordering dentist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes List */}
        {notes.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {notes.map((note) => {
                const isAuthor = user?.id === note.user_id;
                const isEditing = editingNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {note.profiles?.full_name || note.profiles?.email || 'User'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(note.created_at)}
                        </span>
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
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteNoteId(note.id)}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[60px] text-sm"
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
                        <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleLike(note.id, note.user_has_liked || false)
                            }
                            className={`h-7 gap-1.5 ${
                              note.user_has_liked
                                ? "text-red-500 hover:text-red-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${
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
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        )}

        {/* Add Note Form */}
        <div className="space-y-2 pt-2 border-t">
          <Textarea
            placeholder="Add a note visible to all authorized users on this order..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl + Enter to send
            </p>
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Add Note"}
            </Button>
          </div>
        </div>
      </CardContent>

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
    </Card>
  );
};
