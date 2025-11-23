import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Zap, Target, Clock, CheckCircle, MessageSquare, TrendingUp, Star, Medal, Lock } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Doctor-specific achievements
const DOCTOR_ACHIEVEMENTS = {
  // Milestones
  first_order: {
    name: "First Steps",
    description: "Submitted your first order",
    icon: Award,
    color: "from-blue-500 to-blue-600",
    textColor: "text-blue-500",
    category: "Milestones",
    requiredCount: 1
  },
  five_orders: {
    name: "Getting Started",
    description: "Completed 5 orders",
    icon: Trophy,
    color: "from-green-500 to-green-600",
    textColor: "text-green-500",
    category: "Milestones",
    requiredCount: 5
  },
  ten_orders: {
    name: "Professional",
    description: "Completed 10 orders",
    icon: Trophy,
    color: "from-yellow-500 to-yellow-600",
    textColor: "text-yellow-500",
    category: "Milestones",
    requiredCount: 10
  },
  twenty_five_orders: {
    name: "Expert",
    description: "Completed 25 orders",
    icon: Trophy,
    color: "from-orange-500 to-orange-600",
    textColor: "text-orange-500",
    category: "Milestones",
    requiredCount: 25
  },
  fifty_orders: {
    name: "Master",
    description: "Completed 50 orders",
    icon: Trophy,
    color: "from-purple-500 to-purple-600",
    textColor: "text-purple-500",
    category: "Milestones",
    requiredCount: 50
  },
  
  // Patient Care
  the_consult: {
    name: "The Consult",
    description: "Reviewed 15 patient results",
    icon: CheckCircle,
    color: "from-emerald-500 to-emerald-600",
    textColor: "text-emerald-500",
    category: "Patient Care",
    requiredCount: 15
  },
  first_delivery: {
    name: "First Success",
    description: "Received your first delivery",
    icon: CheckCircle,
    color: "from-green-500 to-green-600",
    textColor: "text-green-500",
    category: "Patient Care",
    requiredCount: 1
  },
  ten_deliveries: {
    name: "Reliable Partner",
    description: "Received 10 deliveries",
    icon: CheckCircle,
    color: "from-blue-500 to-blue-600",
    textColor: "text-blue-500",
    category: "Patient Care",
    requiredCount: 10
  },
  perfect_timing: {
    name: "Perfect Timing",
    description: "10 consecutive on-time deliveries",
    icon: Clock,
    color: "from-teal-500 to-teal-600",
    textColor: "text-teal-500",
    category: "Patient Care",
    requiredCount: 10
  },
  
  // Communication
  feedback_flow: {
    name: "Feedback Flow",
    description: "Sent 5 notes to the lab",
    icon: MessageSquare,
    color: "from-indigo-500 to-indigo-600",
    textColor: "text-indigo-500",
    category: "Communication",
    requiredCount: 5
  },
  
  // Speed & Efficiency
  fast_approver: {
    name: "Quick Decider",
    description: "Approved a design within 24 hours",
    icon: Zap,
    color: "from-yellow-500 to-amber-600",
    textColor: "text-yellow-500",
    category: "Speed & Efficiency",
    requiredCount: 1
  },
  rapid_reviewer: {
    name: "Rapid Reviewer",
    description: "Reviewed STAT result within 30 minutes",
    icon: Zap,
    color: "from-amber-500 to-orange-600",
    textColor: "text-amber-500",
    category: "Speed & Efficiency",
    requiredCount: 1
  },
  
  // Consistency
  four_week_streak: {
    name: "Consistent User",
    description: "Placed orders for 4 consecutive weeks",
    icon: TrendingUp,
    color: "from-blue-500 to-cyan-600",
    textColor: "text-blue-500",
    category: "Consistency",
    requiredCount: 4
  },
  eight_week_streak: {
    name: "Dedicated Professional",
    description: "Placed orders for 8 consecutive weeks",
    icon: Star,
    color: "from-purple-500 to-pink-600",
    textColor: "text-purple-500",
    category: "Consistency",
    requiredCount: 8
  },
  
  // Urgent Orders
  urgent_master: {
    name: "Urgent Master",
    description: "Completed 5 urgent orders",
    icon: Target,
    color: "from-red-500 to-rose-600",
    textColor: "text-red-500",
    category: "Urgent Orders",
    requiredCount: 5
  },
  urgent_expert: {
    name: "Urgent Expert",
    description: "Completed 20 urgent orders",
    icon: Target,
    color: "from-red-600 to-rose-700",
    textColor: "text-red-600",
    category: "Urgent Orders",
    requiredCount: 20
  }
};

export default function DoctorAchievements() {
  const { user } = useAuth();

  const { data: earnedAchievements, isLoading } = useQuery({
    queryKey: ["doctor-achievements", user?.id],
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
    queryKey: ["doctor-stats", user?.id],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, urgency, created_at, actual_delivery_date, expected_delivery_date")
        .eq("doctor_id", user?.id!);
      
      if (error) throw error;

      const totalOrders = orders.length;
      const deliveredOrders = orders.filter(o => o.status === "Delivered").length;
      const urgentOrders = orders.filter(o => o.urgency === "Urgent" && o.status === "Delivered").length;
      const onTimeDeliveries = orders.filter(
        o => o.status === "Delivered" && 
        o.actual_delivery_date && 
        o.expected_delivery_date &&
        new Date(o.actual_delivery_date) <= new Date(o.expected_delivery_date)
      ).length;

      return { totalOrders, deliveredOrders, urgentOrders, onTimeDeliveries };
    },
    enabled: !!user?.id,
  });

  const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
  const earnedCount = earnedIds.size;
  const totalCount = Object.keys(DOCTOR_ACHIEVEMENTS).length;

  const groupedAchievements = Object.entries(DOCTOR_ACHIEVEMENTS).reduce((acc, [id, achievement]) => {
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
                    Doctor Achievements
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Track your progress and unlock rewards
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
                    <span className="text-muted-foreground">Keep going!</span>
                    <span className="font-medium text-primary">{totalCount - earnedCount} more to unlock</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Preview */}
            {stats && (
              <Card className="mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <CardHeader>
                  <CardTitle>Your Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.deliveredOrders}</p>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.urgentOrders}</p>
                      <p className="text-sm text-muted-foreground">Urgent Completed</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.onTimeDeliveries}</p>
                      <p className="text-sm text-muted-foreground">On-Time</p>
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
