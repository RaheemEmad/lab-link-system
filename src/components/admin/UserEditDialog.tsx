import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

interface UserEditDialogProps {
  userId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

interface UserData {
  full_name: string;
  email: string;
  phone: string;
  clinic_name: string;
  lab_name: string;
  role: string;
  lab_id: string | null;
}

const UserEditDialog = ({ userId, onClose, onUpdate }: UserEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    full_name: "",
    email: "",
    phone: "",
    clinic_name: "",
    lab_name: "",
    role: "none",
    lab_id: null,
  });
  const [labs, setLabs] = useState<Array<{ id: string; name: string }>>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchLabs();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, lab_id")
        .eq("user_id", userId)
        .single();

      setUserData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        clinic_name: profile.clinic_name || "",
        lab_name: profile.lab_name || "",
        role: roleData?.role || "none",
        lab_id: roleData?.lab_id || null,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLabs(data || []);
    } catch (error) {
      console.error("Error fetching labs:", error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: userData.full_name,
          phone: userData.phone,
          clinic_name: userData.clinic_name,
          lab_name: userData.lab_name,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update role if changed
      if (userData.role !== "none") {
        // Delete existing role first
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: userData.role as "admin" | "doctor" | "lab_staff",
            lab_id: userData.role === "lab_staff" ? userData.lab_id : null,
          });

        if (roleError) throw roleError;
      }

      toast.success("User updated successfully");
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
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
        body: { userId, newPassword },
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <Dialog open={!!userId} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and role assignments
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={userData.full_name}
                onChange={(e) =>
                  setUserData({ ...userData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Read Only)</Label>
              <Input id="email" value={userData.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={userData.phone}
                onChange={(e) =>
                  setUserData({ ...userData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={userData.role}
                onValueChange={(value) =>
                  setUserData({ ...userData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Role</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="lab_staff">Lab Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userData.role === "doctor" && (
              <div className="space-y-2">
                <Label htmlFor="clinic_name">Clinic Name</Label>
                <Input
                  id="clinic_name"
                  value={userData.clinic_name}
                  onChange={(e) =>
                    setUserData({ ...userData, clinic_name: e.target.value })
                  }
                />
              </div>
            )}

            {userData.role === "lab_staff" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="lab_name">Lab Name</Label>
                  <Input
                    id="lab_name"
                    value={userData.lab_name}
                    onChange={(e) =>
                      setUserData({ ...userData, lab_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lab_id">Assign to Lab</Label>
                  <Select
                    value={userData.lab_id || ""}
                    onValueChange={(value) =>
                      setUserData({ ...userData, lab_id: value || null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {labs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.id}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Separator className="my-4" />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Password Reset</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    disabled={updatingPassword}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={updatingPassword}
                  />
                </div>
                <Button 
                  onClick={handlePasswordUpdate} 
                  disabled={updatingPassword || !newPassword || !confirmPassword}
                  variant="secondary"
                  className="w-full"
                >
                  {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {updatingPassword ? "Updating Password..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
