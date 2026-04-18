import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ShieldCheck, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  ticketId: string;
  /** When true, current user is acting as admin */
  isAdminView?: boolean;
}

interface Reply {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: "user" | "admin";
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  user_id: string;
  created_at: string;
}

export const SupportTicketThread = ({ ticketId, isAdminView = false }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, description, category, status, priority, user_id, created_at")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data as Ticket | null;
    },
  });

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["support-ticket-replies", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_replies")
        .select("id, ticket_id, author_id, author_role, message, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`support-thread-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_replies", filter: `ticket_id=eq.${ticketId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["support-ticket-replies", ticketId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticketId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
          qc.invalidateQueries({ queryKey: ["support-tickets"] });
          qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, qc]);

  // Auto-scroll on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  const handleSend = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    const text = message.trim();
    setMessage("");
    const { error } = await supabase.from("support_ticket_replies").insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_role: isAdminView ? "admin" : "user",
      message: text,
    });
    setSending(false);
    if (error) {
      setMessage(text);
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    }
  };

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status, resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null })
      .eq("id", ticketId);
    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
    }
  };

  if (ticketLoading) return <Skeleton className="h-64 w-full" />;
  if (!ticket) return <p className="text-sm text-muted-foreground">Ticket not found.</p>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b pb-3 mb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">{ticket.subject}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
              <Badge variant="secondary" className="text-xs">{ticket.status}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(ticket.created_at), "MMM d, yyyy HH:mm")}
              </span>
            </div>
          </div>
          {isAdminView && (
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" variant="outline" onClick={() => updateStatus("in_progress")}>
                In Progress
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus("resolved")}>
                Resolve
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus("closed")}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px] max-h-[500px]">
        {/* Original ticket */}
        <MessageBubble
          role="user"
          author={isAdminView ? "User" : "You"}
          message={ticket.description}
          createdAt={ticket.created_at}
          isOwn={!isAdminView}
        />

        {repliesLoading && <Skeleton className="h-16 w-full" />}

        {replies.map((r) => (
          <MessageBubble
            key={r.id}
            role={r.author_role}
            author={r.author_role === "admin" ? "Support" : isAdminView ? "User" : "You"}
            message={r.message}
            createdAt={r.created_at}
            isOwn={r.author_id === user?.id}
          />
        ))}

        {!repliesLoading && replies.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-4">
            No replies yet. {isAdminView ? "Reply below to help this user." : "We'll respond as soon as possible."}
          </p>
        )}
      </div>

      {/* Composer */}
      {ticket.status !== "closed" ? (
        <div className="border-t pt-3 mt-3 space-y-2">
          <Textarea
            placeholder={isAdminView ? "Reply to user..." : "Type your reply..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isAdminView ? "Replying as Support team" : "Press ⌘/Ctrl+Enter to send"}
            </span>
            <Button onClick={handleSend} disabled={sending || !message.trim()} size="sm">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t pt-3 mt-3">
          <p className="text-sm text-muted-foreground text-center">
            This ticket is closed. {!isAdminView && "Submit a new ticket if you need more help."}
          </p>
        </div>
      )}
    </div>
  );
};

function MessageBubble({
  role,
  author,
  message,
  createdAt,
  isOwn,
}: {
  role: "user" | "admin";
  author: string;
  message: string;
  createdAt: string;
  isOwn: boolean;
}) {
  return (
    <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
        </div>
      )}
      <div className={cn("max-w-[75%] space-y-1", isOwn && "items-end")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{author}</span>
          <span>{format(new Date(createdAt), "MMM d, HH:mm")}</span>
        </div>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
            isOwn
              ? "bg-primary text-primary-foreground"
              : role === "admin"
              ? "bg-primary/10 text-foreground border border-primary/20"
              : "bg-muted text-foreground"
          )}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
