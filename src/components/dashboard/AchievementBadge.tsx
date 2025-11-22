import { Award, Package, Truck, Star, Trophy, Zap, Target, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: typeof Award;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_order: {
    id: "first_order",
    name: "First Steps",
    description: "Created your first order",
    icon: Package,
    color: "hsl(152 75% 46%)",
    rarity: "common",
  },
  five_orders: {
    id: "five_orders",
    name: "Getting Started",
    description: "Submitted 5 orders",
    icon: Target,
    color: "hsl(221 100% 60%)",
    rarity: "common",
  },
  ten_orders: {
    id: "ten_orders",
    name: "Regular Customer",
    description: "Reached 10 orders",
    icon: Star,
    color: "hsl(45 87% 62%)",
    rarity: "rare",
  },
  twenty_five_orders: {
    id: "twenty_five_orders",
    name: "Power User",
    description: "Submitted 25 orders",
    icon: Zap,
    color: "hsl(280 100% 60%)",
    rarity: "epic",
  },
  fifty_orders: {
    id: "fifty_orders",
    name: "LabLink Champion",
    description: "Reached 50 orders milestone",
    icon: Trophy,
    color: "hsl(30 100% 50%)",
    rarity: "legendary",
  },
  first_delivery: {
    id: "first_delivery",
    name: "First Delivery",
    description: "Received your first completed order",
    icon: Truck,
    color: "hsl(152 75% 46%)",
    rarity: "common",
  },
  ten_deliveries: {
    id: "ten_deliveries",
    name: "Delivery Expert",
    description: "Completed 10 successful deliveries",
    icon: Award,
    color: "hsl(45 87% 62%)",
    rarity: "rare",
  },
  early_adopter: {
    id: "early_adopter",
    name: "Early Adopter",
    description: "Joined LabLink in the early days",
    icon: Sparkles,
    color: "hsl(280 100% 60%)",
    rarity: "epic",
  },
};

interface AchievementBadgeProps {
  achievementId: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  earnedAt?: string;
}

export function AchievementBadge({ 
  achievementId, 
  size = "md", 
  showName = true,
  earnedAt 
}: AchievementBadgeProps) {
  const achievement = ACHIEVEMENTS[achievementId];
  
  if (!achievement) return null;

  const Icon = achievement.icon;
  
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const rarityGradients = {
    common: "from-success/20 to-success/10",
    rare: "from-info/20 to-info/10",
    epic: "from-purple-500/20 to-purple-500/10",
    legendary: "from-amber-500/20 to-amber-500/10",
  };

  const rarityBorders = {
    common: "border-success/30",
    rare: "border-info/30",
    epic: "border-purple-500/30",
    legendary: "border-amber-500/30",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex flex-col items-center gap-2">
            <div 
              className={`
                ${sizeClasses[size]} 
                rounded-full 
                bg-gradient-to-br ${rarityGradients[achievement.rarity]}
                border-2 ${rarityBorders[achievement.rarity]}
                flex items-center justify-center
                transition-all duration-200
                hover:scale-110
                cursor-pointer
                animate-fade-in
              `}
              style={{ 
                boxShadow: `0 0 20px ${achievement.color}33`,
              }}
            >
              <Icon 
                className={iconSizes[size]} 
                style={{ color: achievement.color }}
              />
            </div>
            {showName && (
              <span className="text-xs font-medium text-center max-w-[80px] truncate">
                {achievement.name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: achievement.color }} />
              <span className="font-semibold">{achievement.name}</span>
              <Badge variant="outline" className="text-xs">
                {achievement.rarity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            {earnedAt && (
              <p className="text-xs text-muted-foreground">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AchievementListProps {
  achievements: { achievement_id: string; earned_at: string }[];
}

export function AchievementList({ achievements }: AchievementListProps) {
  if (achievements.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          No achievements yet. Start creating orders to earn your first badge! 🎯
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.achievement_id}
          achievementId={achievement.achievement_id}
          earnedAt={achievement.earned_at}
          size="lg"
          showName
        />
      ))}
    </div>
  );
}
