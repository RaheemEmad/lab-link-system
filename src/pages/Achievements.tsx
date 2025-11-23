import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Zap, Target, Clock, Star, TrendingUp, CheckCircle } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Progress } from "@/components/ui/progress";

// Achievement definitions with icons and descriptions
const ACHIEVEMENTS = {
  // Order milestones
  first_order: {
    name: "First Steps",
    description: "Submitted your first order",
    icon: Award,
    color: "text-blue-500",
    category: "Milestones"
  },
  five_orders: {
    name: "Getting Started",
    description: "Completed 5 orders",
    icon: Trophy,
    color: "text-green-500",
    category: "Milestones"
  },
  ten_orders: {
    name: "Professional",
    description: "Completed 10 orders",
    icon: Trophy,
    color: "text-yellow-500",
    category: "Milestones"
  },
  twenty_five_orders: {
    name: "Expert",
    description: "Completed 25 orders",
    icon: Trophy,
    color: "text-orange-500",
    category: "Milestones"
  },
  fifty_orders: {
    name: "Master",
    description: "Completed 50 orders",
    icon: Trophy,
    color: "text-purple-500",
    category: "Milestones"
  },
  
  // Delivery achievements
  first_delivery: {
    name: "First Success",
    description: "Received your first delivery",
    icon: CheckCircle,
    color: "text-green-500",
    category: "Delivery"
  },
  ten_deliveries: {
    name: "Reliable Partner",
    description: "Received 10 deliveries",
    icon: CheckCircle,
    color: "text-blue-500",
    category: "Delivery"
  },
  perfect_timing: {
    name: "Perfect Timing",
    description: "10 consecutive on-time deliveries",
    icon: Clock,
    color: "text-emerald-500",
    category: "Delivery"
  },
  
  // Speed achievements
  fast_approver: {
    name: "Quick Decider",
    description: "Approved a design within 24 hours",
    icon: Zap,
    color: "text-yellow-500",
    category: "Speed"
  },
  
  // Streak achievements
  four_week_streak: {
    name: "Consistent User",
    description: "Placed orders for 4 consecutive weeks",
    icon: TrendingUp,
    color: "text-blue-500",
    category: "Consistency"
  },
  eight_week_streak: {
    name: "Dedicated Professional",
    description: "Placed orders for 8 consecutive weeks",
    icon: TrendingUp,
    color: "text-purple-500",
    category: "Consistency"
  },
  
  // Urgent order achievements
  urgent_master: {
    name: "Urgent Master",
    description: "Completed 5 urgent orders",
    icon: Target,
    color: "text-red-500",
    category: "Urgent"
  },
  urgent_expert: {
    name: "Urgent Expert",
    description: "Completed 20 urgent orders",
    icon: Target,
    color: "text-red-600",
    category: "Urgent"
  }
};

export default function Achievements() {
  const { user } = useAuth();

  // Fetch user achievements
  const { data: earnedAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user?.id!);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch order statistics for progress tracking
  const { data: stats } = useQuery({
    queryKey: ["order-stats", user?.id],
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

      return {
        totalOrders,
        deliveredOrders,
        urgentOrders,
        onTimeDeliveries
      };
    },
    enabled: !!user?.id,
  });

  const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
  const earnedCount = earnedIds.size;
  const totalCount = Object.keys(ACHIEVEMENTS).length;

  const groupedAchievements = Object.entries(ACHIEVEMENTS).reduce((acc, [id, achievement]) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ id, ...achievement });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Star className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Achievements</h1>
              </div>
              <p className="text-muted-foreground">
                Track your progress and unlock achievements as you use LabLink
              </p>
            </div>

            {/* Progress Overview */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Overall Progress
                </CardTitle>
                <CardDescription>
                  {earnedCount} of {totalCount} achievements unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={(earnedCount / totalCount) * 100} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{Math.round((earnedCount / totalCount) * 100)}% Complete</span>
                    <span>{totalCount - earnedCount} remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievement Categories */}
            {Object.entries(groupedAchievements).map(([category, achievements]) => (
              <div key={category} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((achievement) => {
                    const isEarned = earnedIds.has(achievement.id);
                    const earnedDate = earnedAchievements?.find(a => a.achievement_id === achievement.id)?.earned_at;
                    const Icon = achievement.icon;

                    return (
                      <Card 
                        key={achievement.id} 
                        className={`relative overflow-hidden transition-all ${
                          isEarned 
                            ? "border-primary/50 shadow-lg" 
                            : "opacity-60 grayscale"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-lg bg-muted ${isEarned ? achievement.color : ''}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            {isEarned && (
                              <Badge variant="default" className="ml-2">
                                Unlocked
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                          {isEarned && earnedDate && (
                            <p className="text-xs text-muted-foreground pt-2">
                              Earned: {new Date(earnedDate).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Stats Card */}
            {stats && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Your Statistics</CardTitle>
                  <CardDescription>Track your progress towards new achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{stats.totalOrders}</p>
                      <Progress value={(stats.totalOrders / 50) * 100} className="h-1" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="text-2xl font-bold">{stats.deliveredOrders}</p>
                      <Progress value={(stats.deliveredOrders / 50) * 100} className="h-1" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Urgent Completed</p>
                      <p className="text-2xl font-bold">{stats.urgentOrders}</p>
                      <Progress value={(stats.urgentOrders / 20) * 100} className="h-1" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">On-Time Deliveries</p>
                      <p className="text-2xl font-bold">{stats.onTimeDeliveries}</p>
                      <Progress value={(stats.onTimeDeliveries / 10) * 100} className="h-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
