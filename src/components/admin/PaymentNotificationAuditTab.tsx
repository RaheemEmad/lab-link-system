import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, CheckCircle2, XCircle, AlertCircle, MinusCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PaymentNotificationAuditTab() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["payment-notification-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_notification_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    staleTime: 15_000,
  });

  const filtered = (rows ?? []).filter((r: any) => {
    if (actionFilter !== "all" && r.action !== actionFilter) return false;
    if (channelFilter !== "all" && r.channel !== channelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(r.recipient_email?.toLowerCase().includes(q) ||
          r.recipient_user_id?.toLowerCase().includes(q) ||
          r.payment_confirmation_id?.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
      case "failed": return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "skipped": return <Badge variant="secondary"><MinusCircle className="h-3 w-3 mr-1" />Skipped</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment notification audit</CardTitle>
        <CardDescription>
          Every payment approval / rejection notification (in-app and email) sent to users. Auto-purged after 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search by email or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="in_app">In-app</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No audit entries match.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r: any) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={r.action === "approved" ? "default" : "destructive"}>
                    {r.action === "approved" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {r.action}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {r.channel === "email" ? <Mail className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                    {r.channel === "in_app" ? "In-app" : "Email"}
                  </Badge>
                  {statusBadge(r.status)}
                  <span className="text-sm font-medium">{r.recipient_email ?? r.recipient_user_id?.slice(0, 8)}</span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-col sm:items-end">
                  <span>{format(new Date(r.created_at), "PPpp")}</span>
                  {r.error_message && <span className="text-destructive">{r.error_message}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
