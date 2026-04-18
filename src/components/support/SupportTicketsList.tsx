import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupportTicketThread } from "./SupportTicketThread";
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  open: { label: "Open", variant: "default", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: AlertCircle },
  resolved: { label: "Resolved", variant: "outline", icon: CheckCircle2 },
  closed: { label: "Closed", variant: "outline", icon: CheckCircle2 },
};

export const SupportTicketsList = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, status, priority, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  // Realtime: refresh when tickets/replies change
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-support-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["support-tickets", user.id] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_replies" }, () => {
        qc.invalidateQueries({ queryKey: ["support-tickets", user.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (!tickets?.length) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No support tickets yet</p>
        <p className="text-xs text-muted-foreground mt-1">Submit a ticket above and we'll help you out</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const config = statusConfig[ticket.status] || statusConfig.open;
          const StatusIcon = config.icon;
          return (
            <Card
              key={ticket.id}
              role="button"
              onClick={() => setActiveTicketId(ticket.id)}
              className="cursor-pointer transition hover:border-primary/50"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {format(new Date(ticket.updated_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                  <Badge variant={config.variant} className="shrink-0 gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!activeTicketId} onOpenChange={(o) => !o && setActiveTicketId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket Conversation</DialogTitle>
          </DialogHeader>
          {activeTicketId && (
            <SupportTicketThread ticketId={activeTicketId} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
