import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, Copy, Mail, Clock, CheckCircle2, XCircle, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabInvitationManagerProps {
  labId: string;
}

export function LabInvitationManager({ labId }: LabInvitationManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["lab-invitations", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_invitations")
        .select("*")
        .eq("lab_id", labId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  const createInvitation = useMutation({
    mutationFn: async (invitedEmail?: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("lab_invitations")
        .insert({
          lab_id: labId,
          invited_by: user.id,
          invited_email: invitedEmail || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lab-invitations", labId] });
      setEmail("");
      const link = `${window.location.origin}/auth?invite=${data.invite_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Invitation created & link copied!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/auth?invite=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "accepted": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "expired": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "accepted": return "default";
      case "expired": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Doctor Invitations
        </CardTitle>
        <CardDescription>
          Invite doctors to place orders with your lab
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create invitation */}
        <div className="flex gap-2">
          <Input
            placeholder="Doctor email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="flex-1"
          />
          <Button
            onClick={() => createInvitation.mutate(email || undefined)}
            disabled={createInvitation.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {email ? "Invite" : "Generate Link"}
          </Button>
        </div>

        {/* Invitation list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No invitations yet. Generate a link or invite a doctor by email.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(inv.status)}
                    <Badge variant={statusVariant(inv.status)} className="text-[10px] capitalize">
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    {inv.invited_email ? (
                      <p className="text-sm truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                        {inv.invited_email}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Link2 className="h-3 w-3 shrink-0" />
                        Open link
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {inv.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(inv.invite_code)}
                    className="shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
