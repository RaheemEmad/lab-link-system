import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Pencil,
  Trash2,
  Heart,
  Bell,
  BellOff,
  MessageSquare,
  User,
  Clock,
  StickyNote,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { z } from "zod";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { createNotification } from "@/lib/notifications";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const NOTE_MAX_LENGTH = 2000;

const noteSchema = z.object({
  note_text: z
    .string()
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

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

function getInitials(name: string | null | undefined, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] || "U").toUpperCase();
}

// Skeleton loader for notes
function NoteSkeletons() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyNotes() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <StickyNote className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-semibold mb-1">No notes yet</h3>
      <p className="text-xs text-muted-foreground max-w-[220px]">
        Start the conversation by adding the first note below.
      </p>
    </div>
  );
}

// Single note bubble component
function NoteBubble({
  note,
  isAuthor,
  currentUserId,
  onEdit,
  onDelete,
  onToggleLike,
  editingNoteId,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
}: {
  note: OrderNote;
  isAuthor: boolean;
  currentUserId: string | null;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string, liked: boolean) => void;
  editingNoteId: string | null;
  editText: string;
  setEditText: (t: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}) {
  const isEditing = editingNoteId === note.id;
  const displayName = note.profiles?.full_name || note.profiles?.email || "Unknown";
  const initials = getInitials(note.profiles?.full_name, note.profiles?.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 sm:gap-3 group ${isAuthor ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
          isAuthor
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 max-w-[85%] ${isAuthor ? "items-end" : ""}`}>
        {/* Header */}
        <div
          className={`flex items-center gap-2 mb-1 ${
            isAuthor ? "flex-row-reverse" : ""
          }`}
        >
          <span className="text-xs font-medium truncate">{displayName}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Bubble */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[70px] text-sm"
              maxLength={NOTE_MAX_LENGTH}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSaveEdit(note.id)}
                disabled={!editText.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isAuthor
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted rounded-tl-sm"
            }`}
          >
            {note.note_text}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div
            className={`flex items-center gap-1 mt-1 ${
              isAuthor ? "flex-row-reverse" : ""
            }`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleLike(note.id, note.user_has_liked || false)}
              className={`h-7 px-2 gap-1 text-xs ${
                note.user_has_liked
                  ? "text-red-500 hover:text-red-600"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              }`}
            >
              <Heart
                className={`h-3 w-3 ${note.user_has_liked ? "fill-current" : ""}`}
              />
              {(note.like_count || 0) > 0 && <span>{note.like_count}</span>}
            </Button>

            {isAuthor && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(note.id, note.note_text)}
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(note.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function OrderNotesDialog({
  orderId,
  open,
  onOpenChange,
  orderNumber,
}: OrderNotesDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const currentUserId = user?.id || null;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { playNormalNotification } = useNotificationSound();
  const { requestPermission, showNotification, isGranted, isSupported } =
    useBrowserNotifications();

  useEffect(() => {
    if (isSupported && !isGranted) {
      requestPermission();
    }
  }, [isSupported, isGranted, requestPermission]);

  // Auto-scroll to bottom when notes update
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        const scrollEl = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight;
        }
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (!open || !orderId || !currentUserId) {
      if (!open) setNotes([]);
      return;
    }

    fetchNotes();

    const notesChannel = supabase
      .channel(`order-notes-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_notes",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newNoteUserId = (payload.new as any).user_id;
          if (newNoteUserId !== currentUserId) {
            if (soundEnabled) playNormalNotification();
            showNotification("📝 New Note Added", {
              body: `A new note was added to order ${orderNumber}`,
              tag: `note-${orderId}`,
              requireInteraction: false,
            });
            toast.info("New note added", {
              description: `A note was added to order ${orderNumber}`,
              duration: 4000,
            });
          }
          fetchNotes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_notes",
          filter: `order_id=eq.${orderId}`,
        },
        () => fetchNotes()
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "order_notes",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setNotes((prev) => prev.filter((note) => note.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notesChannel);
    };
  }, [open, orderId, currentUserId]);

  // Likes channel
  useEffect(() => {
    if (!open || !orderId) return;

    const likesChannel = supabase
      .channel(`note-likes-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_likes" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
            fetchNotes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [open, orderId, currentUserId]);

  const fetchNotes = async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("order_notes")
        .select(
          `id, note_text, created_at, user_id, profiles!order_notes_user_id_fkey (full_name, email)`
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;

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
            .eq("user_id", currentUserId || "")
            .maybeSingle();

          return {
            ...note,
            like_count: count || 0,
            user_has_liked: !!userLike,
          };
        })
      );

      setNotes(notesWithLikes);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!orderId) return;

    const validation = noteSchema.safeParse({ note_text: newNote });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("order_notes").insert({
        order_id: orderId,
        user_id: user.id,
        note_text: newNote.trim(),
      });

      if (error) throw error;

      // Fire a notification for the other party on this order
      try {
        const { data: order } = await supabase
          .from("orders")
          .select("doctor_id, assigned_lab_id")
          .eq("id", orderId)
          .single();

        if (order) {
          const recipientIds: string[] = [];

          // If current user is doctor, notify lab staff
          if (order.doctor_id === user.id && order.assigned_lab_id) {
            const { data: assignments } = await supabase
              .from("order_assignments")
              .select("user_id")
              .eq("order_id", orderId);
            assignments?.forEach((a) => {
              if (a.user_id !== user.id) recipientIds.push(a.user_id);
            });
          }
          // If current user is lab staff, notify doctor
          else if (order.doctor_id && order.doctor_id !== user.id) {
            recipientIds.push(order.doctor_id);
          }

          for (const recipientId of recipientIds) {
            await createNotification({
              user_id: recipientId,
              order_id: orderId,
              type: "new_note",
              title: "New Note Added",
              message: `A note was added to order ${orderNumber}: "${newNote.trim().slice(0, 80)}${newNote.trim().length > 80 ? "…" : ""}"`,
            });
          }
        }
      } catch (notifError) {
        console.error("Failed to send note notification:", notifError);
      }

      toast.success("Note added");
      setNewNote("");
      textareaRef.current?.focus();
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
      toast.success("Note updated");
      setEditingNoteId(null);
      setEditText("");
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
      toast.success("Note deleted");
      setDeleteNoteId(null);
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleToggleLike = async (noteId: string, currentlyLiked: boolean) => {
    try {
      if (!user) throw new Error("Not authenticated");
      if (currentlyLiked) {
        const { error } = await supabase
          .from("note_likes")
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("note_likes")
          .insert({ note_id: noteId, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  // Group notes by date
  const groupedNotes: { label: string; notes: OrderNote[] }[] = [];
  notes.forEach((note) => {
    const label = getDateLabel(note.created_at);
    const lastGroup = groupedNotes[groupedNotes.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.notes.push(note);
    } else {
      groupedNotes.push({ label, notes: [note] });
    }
  });

  const charPercent = (newNote.length / NOTE_MAX_LENGTH) * 100;

  const notesContent = (
    <div className="flex flex-col h-full">
      {/* Header bar with count and sound toggle */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-normal gap-1">
            <MessageSquare className="h-3 w-3" />
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          {soundEnabled ? (
            <Bell className="h-3.5 w-3.5" />
          ) : (
            <BellOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{soundEnabled ? "On" : "Off"}</span>
        </Button>
      </div>

      <Separator />

      {/* Notes list */}
      <div className="flex-1 min-h-0" ref={scrollRef}>
        {isLoading ? (
          <NoteSkeletons />
        ) : notes.length === 0 ? (
          <EmptyNotes />
        ) : (
          <ScrollArea className="h-[350px] sm:h-[400px]">
            <div className="p-3 sm:p-4 space-y-5">
              <AnimatePresence initial={false}>
                {groupedNotes.map((group) => (
                  <div key={group.label} className="space-y-3">
                    {/* Date divider */}
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {group.notes.map((note) => (
                      <NoteBubble
                        key={note.id}
                        note={note}
                        isAuthor={currentUserId === note.user_id}
                        currentUserId={currentUserId}
                        onEdit={(id, text) => {
                          setEditingNoteId(id);
                          setEditText(text);
                        }}
                        onDelete={setDeleteNoteId}
                        onToggleLike={handleToggleLike}
                        editingNoteId={editingNoteId}
                        editText={editText}
                        setEditText={setEditText}
                        onSaveEdit={handleEditNote}
                        onCancelEdit={() => {
                          setEditingNoteId(null);
                          setEditText("");
                        }}
                      />
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>

      <Separator />

      {/* Compose area */}
      <div className="pt-3 space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note…"
            className="min-h-[72px] sm:min-h-[80px] pr-12 resize-none text-sm"
            maxLength={NOTE_MAX_LENGTH}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <Button
            onClick={handleAddNote}
            disabled={isSubmitting || !newNote.trim()}
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
            </kbd>{" "}
            +{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
              Enter
            </kbd>{" "}
            to send
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  charPercent > 90
                    ? "bg-destructive"
                    : charPercent > 70
                    ? "bg-warning"
                    : "bg-primary/40"
                }`}
                style={{ width: `${charPercent}%` }}
              />
            </div>
            <span
              className={`text-[10px] ${
                charPercent > 90 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {newNote.length}/{NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const deleteDialog = (
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
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-4">
            <SheetHeader className="pb-2">
              <SheetTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-primary" />
                Notes — {orderNumber}
              </SheetTitle>
            </SheetHeader>
            {notesContent}
          </SheetContent>
        </Sheet>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-primary" />
              Notes — {orderNumber}
            </DialogTitle>
          </DialogHeader>
          {notesContent}
        </DialogContent>
      </Dialog>
      {deleteDialog}
    </>
  );
}
