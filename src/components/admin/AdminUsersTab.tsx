import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, UserCheck, UserX, Search, KeyRound } from "lucide-react";
import UserEditDialog from "./UserEditDialog";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  clinic_name: string | null;
  lab_name: string | null;
  phone: string | null;
  created_at: string;
  onboarding_completed: boolean;
  role?: string;
  lab_id?: string | null;
}

const AdminUsersTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role, lab_id")
            .eq("user_id", profile.id)
            .single();

          return {
            ...profile,
            role: roleData?.role || "none",
            lab_id: roleData?.lab_id || null,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(message);
    } finally {
      setDeleteUserId(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetPasswordUserId) return;

    if (!newPassword || !confirmPassword) {
      toast.error("Please enter both password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-password', {
        body: { userId: resetPasswordUserId, newPassword },
      });

      if (error) throw error;

      toast.success("Password reset successfully");
      
      setResetPasswordUserId(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "doctor":
        return "bg-blue-500";
      case "lab_staff":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lab_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.size === 0 || !bulkAction) return;

    try {
      if (bulkAction === "delete") {
        const confirmed = window.confirm(
          `Are you sure you want to delete ${selectedUsers.size} user(s)?`
        );
        if (!confirmed) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        for (const userId of Array.from(selectedUsers)) {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete user');
          }
        }
        toast.success(`Deleted ${selectedUsers.size} user(s)`);
      }

      setSelectedUsers(new Set());
      setBulkAction("");
      fetchUsers();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Bulk action failed";
      toast.error(message);
    }
  };

  const exportUsers = async () => {
    const { exportToCSV, prepareUsersForExport } = await import("@/lib/exportUtils");
    const exportData = prepareUsersForExport(filteredUsers);
    exportToCSV(exportData, `users-export-${new Date().toISOString().split("T")[0]}`);
    toast.success("Users exported successfully");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View, edit, and manage all user accounts ({users.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, clinic, or lab..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="lab_staff">Lab Staff</option>
              <option value="none">No Role</option>
            </select>
            <Button onClick={exportUsers} variant="outline">
              Export CSV
            </Button>
          </div>

          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">{selectedUsers.size} selected</span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-input rounded-md bg-background text-sm"
              >
                <option value="">Bulk Actions...</option>
                <option value="delete">Delete Selected</option>
              </select>
              <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction}>
                Apply
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.full_name || "—"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role || "none")}>
                        {user.role || "none"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.clinic_name || user.lab_name || "—"}
                    </TableCell>
                    <TableCell>{user.phone || "—"}</TableCell>
                    <TableCell>
                      {user.onboarding_completed ? (
                        <Badge variant="outline" className="gap-1">
                          <UserCheck className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <UserX className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditUserId(user.id)}
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetPasswordUserId(user.id)}
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user account and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserEditDialog
        userId={editUserId}
        onClose={() => setEditUserId(null)}
        onUpdate={fetchUsers}
      />

      <Dialog open={!!resetPasswordUserId} onOpenChange={() => {
        setResetPasswordUserId(null);
        setNewPassword('');
        setConfirmPassword('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user. The password must be at least 8 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">New Password</Label>
              <Input
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={updatingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm Password</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={updatingPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setResetPasswordUserId(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
              disabled={updatingPassword}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordReset}
              disabled={updatingPassword || !newPassword || !confirmPassword}
            >
              {updatingPassword ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUsersTab;
