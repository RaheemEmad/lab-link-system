import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, KeyRound, Bell, Award, RefreshCw } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SkeletonForm } from "@/components/ui/skeleton-card";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { z } from "zod";
import { AchievementList } from "@/components/dashboard/AchievementBadge";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { useDraftCleanup } from "@/hooks/useDraftCleanup";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Name must be less than 100 characters").optional(),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const roleLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showCompleteOnboarding, setShowCompleteOnboarding] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [notificationStatusChange, setNotificationStatusChange] = useState(true);
  const [notificationNewNotes, setNotificationNewNotes] = useState(true);

  // Cleanup old drafts on mount (7 days)
  useDraftCleanup({ maxAgeDays: 7 });

  // Fetch profile data FIRST (before autosave setup)
  const { isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setEmailNotifications(data.email_notifications ?? true);
      setSmsNotifications(data.sms_notifications ?? false);
      setNotificationStatusChange(data.notification_status_change ?? true);
      setNotificationNewNotes(data.notification_new_notes ?? true);
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Autosave profile changes
  const { saveData, clearSavedData, autosaveState } = useFormAutosave({
    storageKey: `profile-${user?.id}`,
    debounceMs: 2000,
    onRecover: (data) => {
      if (data.fullName !== undefined) setFullName(data.fullName);
      if (data.phone !== undefined) setPhone(data.phone);
      if (data.emailNotifications !== undefined) setEmailNotifications(data.emailNotifications);
      if (data.smsNotifications !== undefined) setSmsNotifications(data.smsNotifications);
      if (data.notificationStatusChange !== undefined) setNotificationStatusChange(data.notificationStatusChange);
      if (data.notificationNewNotes !== undefined) setNotificationNewNotes(data.notificationNewNotes);
      
      toast({
        title: "📝 Draft Recovered",
        description: "Your unsaved profile changes have been restored.",
      });
    },
    enabled: !!user?.id,
  });

  // Watch for profile changes and trigger autosave
  useEffect(() => {
    if (!isLoading && user?.id) {
      saveData({
        fullName,
        phone,
        emailNotifications,
        smsNotifications,
        notificationStatusChange,
        notificationNewNotes,
        timestamp: new Date().toISOString(),
      });
    }
  }, [fullName, phone, emailNotifications, smsNotifications, notificationStatusChange, notificationNewNotes, saveData, isLoading, user?.id]);

  // Fetch user role with timeout detection
  const { data: userRoleData, isLoading: roleLoading, isError: roleError } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, lab_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Extract role string from data for safe rendering
  const userRole = userRoleData?.role;

  // Detect if role is stuck loading (after 5 seconds)
  useEffect(() => {
    if (roleLoading && !userRole) {
      roleLoadingTimeoutRef.current = setTimeout(() => {
        setShowCompleteOnboarding(true);
      }, 5000);
    } else {
      if (roleLoadingTimeoutRef.current) {
        clearTimeout(roleLoadingTimeoutRef.current);
      }
      setShowCompleteOnboarding(false);
    }

    return () => {
      if (roleLoadingTimeoutRef.current) {
        clearTimeout(roleLoadingTimeoutRef.current);
      }
    };
  }, [roleLoading, userRole]);

  // Also show button if role fetch errored
  useEffect(() => {
    if (roleError) {
      setShowCompleteOnboarding(true);
    }
  }, [roleError]);

  // Fetch user achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Helper function to format role names
  const formatRole = (role: string) => {
    const roleMap: Record<string, { label: string; description: string; variant: "default" | "secondary" | "destructive" }> = {
      admin: { 
        label: "Administrator", 
        description: "Full system access and management",
        variant: "destructive"
      },
      lab_staff: { 
        label: "Lab Staff", 
        description: "Manage and process lab orders",
        variant: "secondary"
      },
      doctor: { 
        label: "Doctor", 
        description: "Submit and track dental orders",
        variant: "default"
      },
    };
    return roleMap[role] || { label: role, description: "User role", variant: "default" };
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      const validation = profileSchema.safeParse({ full_name: fullName, phone });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications,
          notification_status_change: notificationStatusChange,
          notification_new_notes: notificationNewNotes,
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      
      // Clear autosaved draft after successful save
      clearSavedData();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const validation = passwordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      // SECURITY: Verify current password before allowing change
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Only then update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate();
  };

  const handlePasswordChange = () => {
    changePasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profile Settings</h1>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Loading your profile...</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SkeletonForm />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Role</CardTitle>
                    <CardDescription>Loading role information...</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SkeletonForm />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SkeletonForm />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Loading preferences...</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SkeletonForm />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profile Settings</h1>

            <div className="space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your personal information and contact details
                      </CardDescription>
                    </div>
                    <AutosaveIndicator 
                      isSaving={autosaveState.isSaving}
                      lastSaved={autosaveState.lastSaved}
                      hasRecoveredData={autosaveState.hasRecoveredData}
                      className="hidden sm:flex"
                    />
                  </div>
                  {/* Mobile autosave indicator */}
                  <AutosaveIndicator 
                    isSaving={autosaveState.isSaving}
                    lastSaved={autosaveState.lastSaved}
                    hasRecoveredData={autosaveState.hasRecoveredData}
                    className="flex sm:hidden mt-2"
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                {/* Role Display */}
                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={userRole ? formatRole(userRole).variant : "default"} className="text-xs">
                          {userRole ? formatRole(userRole).label : "Loading..."}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {userRole ? formatRole(userRole).description : "Fetching your role information..."}
                      </p>
                    </div>
                  </div>
                  
                  {showCompleteOnboarding && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                        Role information couldn't be loaded. Complete your account setup to continue.
                      </p>
                      <Button
                        onClick={() => navigate("/onboarding")}
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-500/30 hover:bg-amber-500/10"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Complete Onboarding
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Contact support if your role needs to be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    maxLength={20}
                  />
                </div>

                  <Button
                    onClick={handleProfileUpdate}
                    disabled={updateProfileMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    onClick={handlePasswordChange}
                    disabled={changePasswordMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how you receive notifications about order updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-4">Notification Channels</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-notifications">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="push-notifications">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive real-time browser notifications
                          </p>
                        </div>
                        <Button
                          variant={isSubscribed ? "outline" : "default"}
                          size="sm"
                          onClick={isSubscribed ? unsubscribe : subscribe}
                          disabled={pushLoading}
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          {pushLoading ? "Loading..." : isSubscribed ? "Disable" : "Enable"}
                        </Button>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sms-notifications">SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications via SMS (coming soon)
                          </p>
                        </div>
                        <Switch
                          id="sms-notifications"
                          checked={smsNotifications}
                          onCheckedChange={setSmsNotifications}
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-4">Notification Types</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="status-change">Order Status Changes</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when order status is updated
                          </p>
                        </div>
                        <Switch
                          id="status-change"
                          checked={notificationStatusChange}
                          onCheckedChange={setNotificationStatusChange}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="new-notes">New Notes Added</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when someone adds a note to an order
                          </p>
                        </div>
                        <Switch
                          id="new-notes"
                          checked={notificationNewNotes}
                          onCheckedChange={setNotificationNewNotes}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleProfileUpdate}
                    disabled={updateProfileMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardContent>
              </Card>

              {/* Achievements Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle>Your Achievements</CardTitle>
                  </div>
                  <CardDescription>
                    Track your milestones and accomplishments on LabLink
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AchievementList achievements={achievements} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
