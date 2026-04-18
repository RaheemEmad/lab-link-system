import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import { MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  closed: "outline",
};

const AdminSupportTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, status, priority, created_at, updated_at, user_id")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      let profilesMap: Record<string, { full_name: string | null; email?: string | null }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profilesMap = Object.fromEntries(
          (profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }])
        );
      }
      return ((rows ?? []) as any[]).map<AdminTicket>((r) => ({
        ...r,
        user_email: profilesMap[r.user_id]?.email ?? null,
        user_name: profilesMap[r.user_id]?.full_name ?? null,
      }));
    },
    staleTime: 15_000,
  });

  // Realtime — refresh list on any ticket/reply change
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_replies" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.subject.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.user_email ?? "").toLowerCase().includes(q) ||
          (t.user_name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, search]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Support Tickets</h2>
        <p className="text-sm text-muted-foreground">Reply to user issues and manage their resolution.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, user, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No tickets match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card
              key={t.id}
              role="button"
              onClick={() => setActiveTicketId(t.id)}
              className={cn(
                "cursor-pointer transition hover:border-primary/50",
                t.status === "open" && "border-l-4 border-l-primary"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t.user_name || t.user_email || "Unknown user"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                      {t.priority && t.priority !== "normal" && (
                        <Badge variant="secondary" className="text-xs">{t.priority}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Updated {format(new Date(t.updated_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                  <Badge variant={statusVariant[t.status] ?? "default"} className="shrink-0">
                    {t.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!activeTicketId} onOpenChange={(o) => !o && setActiveTicketId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket Conversation</DialogTitle>
          </DialogHeader>
          {activeTicketId && (
            <SupportTicketThread ticketId={activeTicketId} isAdminView />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportTab;
