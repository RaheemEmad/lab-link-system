import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
      setNotes(data || []);
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

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('order_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast.success("Note deleted");
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error("Failed to delete note", {
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
              {notes.map((note) => (
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
                    {user?.id === note.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                </div>
              ))}
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
    </Card>
  );
};
