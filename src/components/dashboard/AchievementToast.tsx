import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ACHIEVEMENTS } from "./AchievementBadge";
import confetti from "canvas-confetti";

export function AchievementToast() {
  const { user } = useAuth();
  const previousCountRef = useRef<number>(0);

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
    refetchInterval: 5000, // Check every 5 seconds
  });

  useEffect(() => {
    if (!achievements) return;

    const currentCount = achievements.length;
    
    // Check if a new achievement was earned
    if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
      const latestAchievement = achievements[0];
      const achievementData = ACHIEVEMENTS[latestAchievement.achievement_id];

      if (achievementData) {
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [achievementData.color, "#3269FF", "#1DCC6C"],
        });

        // Show toast notification
        const Icon = achievementData.icon;
        toast.success(
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2"
              style={{ 
                borderColor: achievementData.color,
                boxShadow: `0 0 15px ${achievementData.color}33`,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: achievementData.color }} />
            </div>
            <div>
              <p className="font-semibold">🎉 Achievement Unlocked!</p>
              <p className="text-sm text-muted-foreground">{achievementData.name}</p>
            </div>
          </div>,
          {
            duration: 5000,
          }
        );
      }
    }

    previousCountRef.current = currentCount;
  }, [achievements]);

  return null;
}
