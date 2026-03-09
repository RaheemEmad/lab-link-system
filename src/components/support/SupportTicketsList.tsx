import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, status, priority, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

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
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const config = statusConfig[ticket.status] || statusConfig.open;
        const StatusIcon = config.icon;
        return (
          <Card key={ticket.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
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
  );
};
