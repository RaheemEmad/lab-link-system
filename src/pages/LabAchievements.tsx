import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Database, Shield, Zap, FileText, Medal, Lock } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Lab staff-specific achievements
const LAB_ACHIEVEMENTS = {
  // Data Entry
  data_dynamo: {
    name: "Data Dynamo",
    description: "Processed 10 test results in one day",
    icon: Database,
    color: "from-blue-500 to-blue-600",
    textColor: "text-blue-500",
    category: "Data Entry",
    requiredCount: 10
  },
  
  // Quality Control
  precision_pointer: {
    name: "Precision Pointer",
    description: "Completed 5 quality checks without issues",
    icon: Shield,
    color: "from-green-500 to-green-600",
    textColor: "text-green-500",
    category: "Quality Control",
    requiredCount: 5
  },
  
  // Speed & Efficiency
  rush_hour_hero: {
    name: "Rush Hour Hero",
    description: "Started processing a STAT order within 1 hour",
    icon: Zap,
    color: "from-red-500 to-red-600",
    textColor: "text-red-500",
    category: "Speed & Efficiency",
    requiredCount: 1
  },
  
  // Digital Pioneer
  paperless_pro: {
    name: "Paperless Pro",
    description: "Uploaded and archived 25 digital records",
    icon: FileText,
    color: "from-emerald-500 to-emerald-600",
    textColor: "text-emerald-500",
    category: "Digital Pioneer",
    requiredCount: 25
  }
};

export default function LabAchievements() {
  const { user } = useAuth();

  const { data: earnedAchievements, isLoading } = useQuery({
    queryKey: ["lab-achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user?.id!);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["lab-stats", user?.id],
    queryFn: async () => {
      // Get orders assigned to this lab staff
      const { data: assignments, error: assignError } = await supabase
        .from("order_assignments")
        .select("order_id")
        .eq("user_id", user?.id!);
      
      if (assignError) throw assignError;

      const orderIds = assignments?.map(a => a.order_id) || [];

      if (orderIds.length === 0) {
        return { processedToday: 0, totalQC: 0, totalUploads: 0, urgentProcessed: 0 };
      }

      // Get order status changes
      const { data: statusChanges, error: statusError } = await supabase
        .from("order_status_history")
        .select("*")
        .in("order_id", orderIds)
        .eq("changed_by", user?.id!);

      if (statusError) throw statusError;

      const today = new Date().toISOString().split('T')[0];
      const processedToday = statusChanges?.filter(s => 
        s.changed_at.startsWith(today)
      ).length || 0;

      // Get QC items
      const { data: qcItems, error: qcError } = await supabase
        .from("qc_checklist_items")
        .select("*")
        .eq("completed_by", user?.id!)
        .eq("is_completed", true);

      if (qcError) throw qcError;

      const totalQC = qcItems?.length || 0;

      // Get uploads
      const { data: uploads, error: uploadError } = await supabase
        .from("order_attachments")
        .select("*")
        .eq("uploaded_by", user?.id!);

      if (uploadError) throw uploadError;

      const totalUploads = uploads?.length || 0;

      // Count urgent orders
      const { data: urgentOrders, error: urgentError } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .eq("urgency", "Urgent")
        .eq("status", "In Progress");

      if (urgentError) throw urgentError;

      const urgentProcessed = urgentOrders?.length || 0;

      return { processedToday, totalQC, totalUploads, urgentProcessed };
    },
    enabled: !!user?.id,
  });

  const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
  const earnedCount = earnedIds.size;
  const totalCount = Object.keys(LAB_ACHIEVEMENTS).length;

  const groupedAchievements = Object.entries(LAB_ACHIEVEMENTS).reduce((acc, [id, achievement]) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ id, ...achievement });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-gradient-to-b from-background to-secondary/20 py-12">
          <div className="container px-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80">
                  <Trophy className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Lab Achievements
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Track your performance and unlock rewards
                  </p>
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <Card className="mb-8 border-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-primary" />
                  Overall Progress
                </CardTitle>
                <CardDescription>
                  {earnedCount} of {totalCount} achievements unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Progress value={(earnedCount / totalCount) * 100} className="h-4" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-foreground">
                        {Math.round((earnedCount / totalCount) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Keep up the great work!</span>
                    <span className="font-medium text-primary">{totalCount - earnedCount} more to unlock</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Preview */}
            {stats && (
              <Card className="mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <CardHeader>
                  <CardTitle>Your Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.processedToday}</p>
                      <p className="text-sm text-muted-foreground">Processed Today</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalQC}</p>
                      <p className="text-sm text-muted-foreground">QC Completed</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalUploads}</p>
                      <p className="text-sm text-muted-foreground">Files Uploaded</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.urgentProcessed}</p>
                      <p className="text-sm text-muted-foreground">STAT Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievement Categories */}
            {Object.entries(groupedAchievements).map(([category, achievements], categoryIndex) => (
              <div key={category} className="mb-8 animate-fade-in" style={{ animationDelay: `${0.3 + categoryIndex * 0.1}s` }}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-primary to-transparent rounded" />
                  {category}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                  {achievements.map((achievement, index) => {
                    const isEarned = earnedIds.has(achievement.id);
                    const earnedDate = earnedAchievements?.find(a => a.achievement_id === achievement.id)?.earned_at;
                    const Icon = achievement.icon;

                    return (
                      <Card 
                        key={achievement.id}
                        className={cn(
                          "relative overflow-hidden transition-all duration-500 hover:shadow-xl group",
                          isEarned 
                            ? "border-primary/50 shadow-lg animate-scale-in" 
                            : "opacity-60 grayscale hover:grayscale-0"
                        )}
                        style={isEarned ? { animationDelay: `${index * 0.05}s` } : {}}
                      >
                        {/* Gradient background for unlocked */}
                        {isEarned && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${achievement.color} opacity-5`} />
                        )}
                        
                        {/* Lock overlay for locked achievements */}
                        {!isEarned && (
                          <div className="absolute top-2 right-2 p-2 rounded-full bg-muted">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}

                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className={cn(
                              "p-4 rounded-xl transition-all duration-300 group-hover:scale-110",
                              isEarned 
                                ? `bg-gradient-to-br ${achievement.color} shadow-lg` 
                                : "bg-muted"
                            )}>
                              <Icon className={cn(
                                "h-8 w-8 transition-colors",
                                isEarned ? "text-white" : "text-muted-foreground"
                              )} />
                            </div>
                            {isEarned && (
                              <Badge variant="default" className="animate-fade-in">
                                ✓ Unlocked
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <h3 className="font-bold text-lg">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                          {isEarned && earnedDate && (
                            <p className="text-xs text-primary font-medium pt-2 animate-fade-in">
                              🎉 Earned {new Date(earnedDate).toLocaleDateString()}
                            </p>
                          )}
                          {!isEarned && (
                            <div className="pt-2">
                              <Progress value={0} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Progress: 0/{achievement.requiredCount}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
