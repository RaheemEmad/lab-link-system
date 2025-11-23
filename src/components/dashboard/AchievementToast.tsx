import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ACHIEVEMENTS } from "./AchievementBadge";
import confetti from "canvas-confetti";
import { useAchievementSound } from "@/hooks/useAchievementSound";

export function AchievementToast() {
  const { user } = useAuth();
  const previousCountRef = useRef<number>(0);
  const notifiedProgressRef = useRef<Set<string>>(new Set());
  const { playUnlockSound, playProgressSound } = useAchievementSound();

  const { data: achievements } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Fetch progress data for near-completion achievements
  const { data: progressData } = useQuery({
    queryKey: ["achievement-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, urgency, created_at")
        .eq("doctor_id", user.id);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter(o => o.status === "Delivered").length || 0;

      const { data: notes } = await supabase
        .from("order_notes")
        .select("id")
        .eq("user_id", user.id);

      const totalNotes = notes?.length || 0;

      return {
        totalOrders,
        deliveredOrders,
        totalNotes,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Check for near-completion achievements
  useEffect(() => {
    if (!progressData || !user?.id) return;

    const earnedIds = new Set(achievements?.map(a => a.achievement_id) || []);
    
    // Define achievement progress thresholds
    const progressChecks = [
      {
        id: "five_orders",
        current: progressData.totalOrders,
        required: 5,
        name: "Getting Started",
        description: "Submit 5 orders"
      },
      {
        id: "ten_orders",
        current: progressData.totalOrders,
        required: 10,
        name: "Professional",
        description: "Complete 10 orders"
      },
      {
        id: "twenty_five_orders",
        current: progressData.totalOrders,
        required: 25,
        name: "Expert",
        description: "Complete 25 orders"
      },
      {
        id: "feedback_flow",
        current: progressData.totalNotes,
        required: 5,
        name: "Feedback Flow",
        description: "Send 5 notes to the lab"
      },
    ];

    progressChecks.forEach(check => {
      // Skip if already earned
      if (earnedIds.has(check.id)) return;

      const remaining = check.required - check.current;
      const notificationKey = `${check.id}_${remaining}`;

      // Show notification when 1-3 items remaining
      if (remaining > 0 && remaining <= 3 && !notifiedProgressRef.current.has(notificationKey)) {
        notifiedProgressRef.current.add(notificationKey);
        playProgressSound();

        toast.info(
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-2xl">🎯</div>
            <div>
              <p className="font-semibold">Almost there!</p>
              <p className="text-sm text-muted-foreground">
                Only {remaining} more to unlock "{check.name}"
              </p>
            </div>
          </div>,
          {
            duration: 5000,
          }
        );
      }
    });
  }, [progressData, achievements, playProgressSound, user?.id]);

  // Achievement unlock celebration
  useEffect(() => {
    if (!achievements) return;

    const currentCount = achievements.length;
    
    if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
      const latestAchievement = achievements[0];
      const achievementData = ACHIEVEMENTS[latestAchievement.achievement_id];

      if (achievementData) {
        // Play triumphant sound
        playUnlockSound();

        // Trigger spectacular confetti
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50000 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          
          // Launch confetti from multiple points
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: [achievementData.color, "#3269FF", "#1DCC6C", "#FFD700", "#FF6B6B"],
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: [achievementData.color, "#3269FF", "#1DCC6C", "#FFD700", "#FF6B6B"],
          });
        }, 250);

        // Show celebration toast
        const Icon = achievementData.icon;
        toast.success(
          <div className="flex items-center gap-3">
            <div 
              className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 animate-scale-in"
              style={{ 
                borderColor: achievementData.color,
                boxShadow: `0 0 20px ${achievementData.color}66`,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: achievementData.color }} />
            </div>
            <div>
              <p className="font-bold text-lg">🎉 Achievement Unlocked!</p>
              <p className="text-sm font-semibold">{achievementData.name}</p>
              <p className="text-xs text-muted-foreground">{achievementData.description}</p>
            </div>
          </div>,
          {
            duration: 8000,
            className: "animate-fade-in border-2 border-primary/50",
          }
        );
      }
    }

    previousCountRef.current = currentCount;
  }, [achievements, playUnlockSound]);

  return null;
}
