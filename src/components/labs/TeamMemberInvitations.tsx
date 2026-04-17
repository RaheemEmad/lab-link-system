import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  labId: string;
}

export function TeamMemberInvitations({ labId }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lab_staff" | "admin">("lab_staff");
  const [submitting, setSubmitting] = useState(false);

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["team-invitations", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("lab_id", labId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: { email: email.trim(), role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team-invitations", labId] });
    } catch (err: any) {
      toast.error("Failed to send invitation", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from("team_invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to revoke invitation");
      return;
    }
    toast.success("Invitation revoked");
    qc.invalidateQueries({ queryKey: ["team-invitations", labId] });
  };

  const statusVariant = (s: string) =>
    s === "accepted" ? "default" : s === "pending" ? "secondary" : "outline";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Invite staff members to join your lab. They'll receive an email to sign up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@lab.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2 sm:w-48">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger id="invite-role" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab_staff">Lab Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex sm:items-end">
              <Button
                onClick={handleInvite}
                disabled={submitting}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <Mail className="h-4 w-4 mr-2" />
                {submitting ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending & Past Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !invitations?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No invitations yet. Invite your first team member above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invited_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.invited_role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(inv.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
